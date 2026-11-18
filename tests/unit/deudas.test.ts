import { describe, expect, it } from "vitest";
import {
  cycleState, nextOnDay, nextRecurringDate, paydaysUntil, perPayday, projectRecurring, suggestCycle, lastOnOrBefore,
} from "@/lib/finance/billing";
import { compareStrategies, simulatePayoff } from "@/lib/finance/debt-strategy";

describe("fechas de tarjeta", () => {
  it("encuentra el siguiente y el último día del mes, ajustando a fin de mes", () => {
    expect(nextOnDay("2026-11-18", 25)).toBe("2026-11-25");
    expect(nextOnDay("2026-11-26", 25)).toBe("2026-12-25");
    expect(nextOnDay("2027-02-01", 31)).toBe("2027-02-28");
    expect(lastOnOrBefore("2026-11-03", 5)).toBe("2026-10-05");
  });

  it("sugiere el estado de cuenta: corte el 5, límite el 25", () => {
    expect(suggestCycle("2026-11-18", 5, 25)).toEqual({
      periodStart: "2026-10-06", statementDate: "2026-11-05", paymentDueDate: "2026-11-25",
    });
  });

  it("si el día límite es menor al de corte, la fecha límite cae el mes siguiente", () => {
    expect(suggestCycle("2026-11-28", 20, 10)).toEqual({
      periodStart: "2026-10-21", statementDate: "2026-11-20", paymentDueDate: "2026-12-10",
    });
  });
});

describe("estado de un pago", () => {
  const ciclo = { status: "cerrado", payment_due_date: "2026-11-25", no_interest_payment: "5000", statement_balance: "5000", minimum_payment: "400" };

  it("distingue pendiente, parcial, pagado y vencido", () => {
    expect(cycleState(ciclo, "0", "2026-11-18")).toBe("pendiente");
    expect(cycleState(ciclo, "400", "2026-11-18")).toBe("parcial");
    expect(cycleState(ciclo, "5000", "2026-11-18")).toBe("pagado");
    expect(cycleState(ciclo, "400", "2026-11-26")).toBe("vencido");
  });

  it("pagar el mínimo no es pagar para no generar intereses", () => {
    expect(cycleState(ciclo, "400", "2026-11-20")).not.toBe("pagado");
  });
});

describe("gastos recurrentes en TypeScript (igual que en SQL)", () => {
  it("coincide con la función de la base", () => {
    expect(nextRecurringDate("2026-11-18", "semanal", null)).toBe("2026-11-25");
    expect(nextRecurringDate("2026-11-10", "quincenal", null)).toBe("2026-11-15");
    expect(nextRecurringDate("2026-11-15", "quincenal", null)).toBe("2026-11-30");
    expect(nextRecurringDate("2026-11-30", "quincenal", null)).toBe("2026-12-15");
    expect(nextRecurringDate("2026-01-31", "mensual", 31)).toBe("2026-02-28");
    expect(nextRecurringDate("2026-02-28", "mensual", 31)).toBe("2026-03-31");
  });

  it("proyecta las fechas de un mes", () => {
    expect(projectRecurring("2026-11-04", "semanal", null, "2026-11-30")).toEqual(["2026-11-04", "2026-11-11", "2026-11-18", "2026-11-25"]);
  });
});

describe("cuánto separar por quincena", () => {
  it("cuenta los días de cobro antes de la fecha límite", () => {
    expect(paydaysUntil("2026-11-18", "2026-12-10", "quincenal")).toBe(1);
    expect(paydaysUntil("2026-11-10", "2026-12-20", "quincenal")).toBe(3);
    expect(paydaysUntil("2026-11-18", "2026-12-09", "semanal")).toBe(3);
    expect(paydaysUntil("2026-11-18", "2026-11-19", "mensual")).toBe(1);
  });

  it("redondea hacia arriba para no quedarse corto", () => {
    expect(perPayday("1000", 3).toFixed(2)).toBe("333.34");
  });
});

describe("estrategias de pago de deudas", () => {
  const tarjeta = { id: "t", name: "Tarjeta", balance: "10000", annualRate: "60", minPayment: "500" };
  const prestamo = { id: "p", name: "Préstamo", balance: "3000", annualRate: "24", minPayment: "300" };

  it("una deuda sin intereses se liquida en meses exactos", () => {
    const r = simulatePayoff([{ id: "a", name: "Amigo", balance: "1200", annualRate: "0", minPayment: "100" }], "300", "avalancha");
    expect(r).toMatchObject({ feasible: true, months: 4 });
    expect(r.totalInterest.toFixed(2)).toBe("0.00");
    expect(r.totalPaid.toFixed(2)).toBe("1200.00");
  });

  it("calcula el interés mensual con centavos exactos", () => {
    const r = simulatePayoff([{ id: "a", name: "A", balance: "1000", annualRate: "12", minPayment: "1010" }], "1010", "avalancha");
    expect(r.months).toBe(1);
    expect(r.totalInterest.toFixed(2)).toBe("10.00");
  });

  it("pagar solo el mínimo puede no liquidar nunca la tarjeta", () => {
    // 10,000 al 60 % anual = 500 de interés al mes; mínimo de 500 → nunca baja.
    const c = compareStrategies([tarjeta, prestamo], "2000");
    expect(c.minimos.feasible).toBe(false);
    expect(c.minimos.reason).toContain("deja de bajar");
    expect(c.avalancha.feasible).toBe(true);
    expect(c.interestSaved).toBeNull();
  });

  it("avalancha ataca la tasa más alta y bola de nieve el saldo más chico", () => {
    const c = compareStrategies([{ ...tarjeta, minPayment: "700" }, prestamo], "2000");
    expect(c.avalancha.order[0].id).toBe("t");
    expect(c.bola.order[0].id).toBe("p");
    expect(c.avalancha.totalInterest.lte(c.bola.totalInterest)).toBe(true);
    expect(c.recommended).toBe("avalancha");
    expect(c.interestSaved!.gt(0)).toBe(true);
    expect(c.minimos.months!).toBeGreaterThan(c.avalancha.months!);
  });

  it("avisa si el presupuesto no cubre los mínimos", () => {
    const r = simulatePayoff([tarjeta, prestamo], "700", "avalancha");
    expect(r.feasible).toBe(false);
    expect(r.reason).toContain("Faltan $100.00");
  });

  it("detecta cuando el pago no alcanza ni para los intereses", () => {
    const r = simulatePayoff([{ id: "x", name: "X", balance: "10000", annualRate: "120", minPayment: "100" }], "100", "avalancha");
    expect(r.feasible).toBe(false);
    expect(r.reason).toContain("no baja");
  });

  it("supone un mínimo cuando no se capturó y lo informa", () => {
    const r = simulatePayoff([{ id: "s", name: "Sin mínimo", balance: "2000", annualRate: "0", minPayment: null }], "1000", "avalancha");
    expect(r.assumedMinimums).toEqual(["s"]);
    expect(r.months).toBe(2);
  });
});
