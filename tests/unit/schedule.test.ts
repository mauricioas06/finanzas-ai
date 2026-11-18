import { describe, expect, it } from "vitest";
import { buildCalendar, buildUpcomingPayments, debtNextPayment, type DebtSchedule } from "@/lib/finance/schedule";

const TODAY = "2026-11-18";

const card = (over: Partial<DebtSchedule> = {}): DebtSchedule => ({
  id: "t1", name: "Oro", institution: "Banco Azul", debtType: "tarjeta_credito", status: "activa",
  minimumPayment: null, fixedPayment: null, paymentDueDay: null,
  card: { statementDay: 5, paymentDueDay: 25 },
  cycles: [{
    id: "c1", period_start: "2026-10-06", statement_date: "2026-11-05", payment_due_date: "2026-11-25",
    statement_balance: "5000.00", minimum_payment: "400.00", no_interest_payment: "4800.00", status: "cerrado",
  }],
  paidByCycle: {}, lastPaymentOn: null, ...over,
});

describe("siguiente pago de una tarjeta", () => {
  it("usa el pago para no generar intereses del estado de cuenta real", () => {
    const p = debtNextPayment(card(), TODAY)!;
    expect(p).toMatchObject({ date: "2026-11-25", state: "pendiente", estimated: false });
    expect(p.amount?.toFixed(2)).toBe("4800.00");
    expect(p.minimum?.toFixed(2)).toBe("400.00");
  });

  it("descuenta lo ya abonado y marca parcial", () => {
    const p = debtNextPayment(card({ paidByCycle: { c1: "1000" } }), TODAY)!;
    expect(p.state).toBe("parcial");
    expect(p.amount?.toFixed(2)).toBe("3800.00");
    expect(p.minimum?.toFixed(2)).toBe("0.00");
  });

  it("sin estado de cuenta pendiente estima la fecha pero NO inventa el monto", () => {
    const p = debtNextPayment(card({ paidByCycle: { c1: "4800" } }), TODAY)!;
    expect(p).toMatchObject({ date: "2026-12-25", estimated: true, amount: null });
    expect(p.note).toContain("05/12");
  });

  it("tarjeta nueva sin estados de cuenta: el corte del 05/11 ya pasó, su pago vence el 25/11", () => {
    const p = debtNextPayment(card({ cycles: [] }), TODAY)!;
    expect(p).toMatchObject({ date: "2026-11-25", estimated: true, amount: null });
    expect(p.note).toBe("Captura tu estado de cuenta del corte del 05/11");
  });

  it("marca vencido si pasó la fecha límite sin pagar", () => {
    expect(debtNextPayment(card(), "2026-11-26")!.state).toBe("vencido");
  });
});

describe("siguiente pago de un préstamo", () => {
  const prestamo = card({ id: "p1", name: "Auto", debtType: "credito_automotriz", card: null, cycles: [], paymentDueDay: 10, fixedPayment: "3500.00" });

  it("toma el día de pago y el pago fijo", () => {
    const p = debtNextPayment(prestamo, TODAY)!;
    expect(p.date).toBe("2026-12-10");
    expect(p.amount?.toFixed(2)).toBe("3500.00");
  });

  it("si ya pagó este mes, pasa al siguiente", () => {
    const p = debtNextPayment({ ...prestamo, paymentDueDay: 20, lastPaymentOn: "2026-11-15" }, TODAY)!;
    expect(p.date).toBe("2026-12-20");
  });

  it("una deuda liquidada no tiene próximos pagos", () => {
    expect(debtNextPayment({ ...prestamo, status: "liquidada" }, TODAY)).toBeNull();
  });
});

describe("próximos pagos y calendario", () => {
  const recurring = [{ id: "r1", name: "Internet", amount: "499.00", frequency: "mensual", dueDay: 20, nextDueDate: "2026-11-20" }];

  it("ordena por fecha e incluye recurrentes proyectados", () => {
    const list = buildUpcomingPayments({ today: TODAY, debts: [card()], recurring }, 35);
    expect(list.map((p) => `${p.date} ${p.title}`)).toEqual(["2026-11-20 Internet", "2026-11-25 Oro", "2026-12-20 Internet"]);
    expect(list[2].estimated).toBe(true);
    // Con el horizonte normal de 30 días, el 20/12 queda fuera.
    expect(buildUpcomingPayments({ today: TODAY, debts: [card()], recurring })).toHaveLength(2);
  });

  it("arma el mes con cortes, fechas límite, recurrentes e ingresos", () => {
    const events = buildCalendar("2026-11", {
      today: TODAY, debts: [card()], recurring,
      incomes: [{ id: "i1", name: "Sueldo", frequency: "quincenal", payDays: null, expectedAmount: "8500.00" }],
    });
    expect(events.map((e) => `${e.date} ${e.kind}${e.estimated ? "*" : ""}`)).toEqual([
      "2026-11-05 corte", "2026-11-15 ingreso*", "2026-11-20 recurrente", "2026-11-25 limite", "2026-11-30 ingreso*",
    ]);
  });

  it("en meses sin estado de cuenta muestra fechas estimadas sin monto", () => {
    const events = buildCalendar("2026-12", { today: TODAY, debts: [card()], recurring: [], incomes: [] });
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.estimated && e.amount === null)).toBe(true);
  });
});
