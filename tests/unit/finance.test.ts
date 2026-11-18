import { describe, expect, it } from "vitest";
import { budgetStatus, buildTodayActions, changePercent, detectExcess } from "@/lib/finance/analysis";
import { daysBetween, lastMonths, monthLabel, monthRange, shiftMonth } from "@/lib/finance/months";

describe("meses", () => {
  it("avanza y retrocede meses cruzando años", () => {
    expect(shiftMonth("2026-11", 2)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(lastMonths("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });

  it("calcula el rango del mes, incluido febrero bisiesto", () => {
    expect(monthRange("2026-11")).toEqual({ start: "2026-11-01", end: "2026-11-30", next: "2026-12-01" });
    expect(monthRange("2028-02").end).toBe("2028-02-29");
  });

  it("nombra los meses en español y cuenta días", () => {
    expect(monthLabel("2026-11")).toBe("noviembre 2026");
    expect(monthLabel("2026-11", true)).toBe("nov 26");
    expect(daysBetween("2026-11-28", "2026-12-02")).toBe(4);
  });
});

describe("presupuestos", () => {
  it("clasifica el uso del presupuesto", () => {
    expect(budgetStatus("500", "1000").level).toBe("ok");
    expect(budgetStatus("800", "1000").level).toBe("aviso");
    expect(budgetStatus("1000", "1000").level).toBe("aviso");
    expect(budgetStatus("1000.01", "1000").level).toBe("excedido");
    expect(budgetStatus("50", null).level).toBe("sin_presupuesto");
  });

  it("calcula lo que queda con centavos exactos", () => {
    const s = budgetStatus("1234.56", "2000");
    expect(s.remaining?.toFixed(2)).toBe("765.44");
    expect(s.percent).toBe(62);
    expect(budgetStatus("2100.10", "2000").remaining?.toFixed(2)).toBe("-100.10");
  });
});

describe("gasto excesivo", () => {
  it("no alarma sin al menos dos meses de historia", () => {
    expect(detectExcess("5000", ["1000"]).excessive).toBe(false);
    expect(detectExcess("5000", ["0", "1000", "0"]).excessive).toBe(false);
  });

  it("detecta un mes muy por encima del promedio", () => {
    const r = detectExcess("3000", ["1000", "1200", "800"]);
    expect(r.excessive).toBe(true);
    expect(r.average?.toFixed(2)).toBe("1000.00");
    expect(r.ratio).toBe(3);
  });

  it("ignora diferencias chicas aunque el porcentaje sea alto", () => {
    expect(detectExcess("250", ["100", "100"]).excessive).toBe(false);
  });

  it("calcula la variación porcentual", () => {
    expect(changePercent("1500", "1000")).toBe(50);
    expect(changePercent("500", "0")).toBeNull();
  });
});

describe("¿Qué debo hacer hoy?", () => {
  const base = {
    today: "2026-11-18",
    profileComplete: true,
    accountCount: 1,
    incomeThisMonth: "10000",
    recurring: [],
    categories: [],
  };

  it("sin pendientes no inventa acciones", () => {
    expect(buildTodayActions(base)).toEqual([]);
  });

  it("prioriza pagos que vencen pronto y presupuestos excedidos", () => {
    const actions = buildTodayActions({
      ...base,
      recurring: [
        { id: "r1", name: "Internet", amount: "499", nextDueDate: "2026-11-19", isActive: true },
        { id: "r2", name: "Gimnasio", amount: "600", nextDueDate: "2026-11-23", isActive: true },
        { id: "r3", name: "Seguro", amount: "900", nextDueDate: "2026-12-20", isActive: true },
        { id: "r4", name: "Netflix", amount: "219", nextDueDate: "2026-11-18", isActive: false },
      ],
      categories: [
        { id: "c1", name: "Comida", spent: "4200", budget: "4000", excessive: false },
        { id: "c2", name: "Ocio", spent: "850", budget: "1000", excessive: false },
      ],
    });
    expect(actions.map((a) => a.title)).toEqual([
      "Pagar Internet", "Frena el gasto en Comida", "Pagar Gimnasio", "Cuida Ocio",
    ]);
    expect(actions[0].detail).toBe("Vence mañana. Monto: $499.00.");
  });

  it("pide los datos que faltan", () => {
    const titles = buildTodayActions({ ...base, accountCount: 0, incomeThisMonth: "0", profileComplete: false }).map((a) => a.id);
    expect(titles).toEqual(["cuentas", "ingreso", "perfil"]);
  });

  it("incluye pagos de tarjetas con el pago sin intereses y el mínimo", async () => {
    const { default: Decimal } = await import("decimal.js");
    const [a, b] = buildTodayActions({
      ...base,
      debtPayments: [
        { key: "c1", title: "Oro", date: "2026-11-20", amount: new Decimal("4800"), minimum: new Decimal("400"), state: "pendiente",
          estimated: false, href: "/deudas/t1", note: "Pago para no generar intereses" },
        { key: "t2", title: "Plata", date: "2026-12-25", amount: null, minimum: null, state: "pendiente",
          estimated: true, href: "/deudas/t2", note: "Captura tu estado de cuenta después del corte del 05/12" },
      ],
    });
    expect(a.title).toBe("Pagar Oro");
    expect(a.detail).toBe("Vence en 2 días (20/11). Paga $4,800.00 para no generar intereses. Mínimo: $400.00.");
    expect(a.priority).toBe(1);
    expect(b).toBeUndefined(); // el corte del 05/12 aún no ocurre: todavía no hay que capturar nada
  });

  it("pide capturar el estado de cuenta cuando el corte ya ocurrió", async () => {
    const [a] = buildTodayActions({
      ...base,
      debtPayments: [{ key: "t3", title: "Plata", date: "2026-11-25", amount: null, minimum: null, state: "pendiente",
        estimated: true, href: "/deudas/t3", note: "Captura tu estado de cuenta del corte del 05/11" }],
    });
    expect(a).toMatchObject({ title: "Captura el estado de cuenta de Plata", priority: 3 });
  });

  it("avisa de pagos vencidos", () => {
    const [a] = buildTodayActions({
      ...base,
      recurring: [{ id: "r", name: "Renta", amount: "8000", nextDueDate: "2026-11-15", isActive: true }],
    });
    expect(a.detail).toContain("Venció hace 3 días");
    expect(a.tone).toBe("urgente");
  });
});
