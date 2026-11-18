import { describe, expect, it } from "vitest";
import { accountSchema, expenseSchema, incomeSourceSchema, moneyField, recurringSchema } from "@/lib/validation";

const CAT = "11111111-1111-4111-8111-111111111111";

describe("montos escritos por el usuario", () => {
  const field = moneyField();

  it("acepta formatos mexicanos y los deja exactos a 2 decimales", () => {
    expect(field.parse("$1,250.5")).toBe("1250.50");
    expect(field.parse(" 999 ")).toBe("999.00");
  });

  it("rechaza ceros, negativos, letras y más de 2 decimales", () => {
    for (const bad of ["0", "-5", "abc", "10.999", "1,2,3", ""]) {
      expect(field.safeParse(bad).success, bad).toBe(false);
    }
    expect(moneyField({ allowZero: true }).parse("0")).toBe("0.00");
  });
});

describe("formularios de la Fase 2", () => {
  it("cuenta: saldo inicial puede ser cero", () => {
    expect(accountSchema.parse({ name: "Efectivo", accountType: "efectivo", balance: "0" }).balance).toBe("0.00");
    expect(accountSchema.safeParse({ name: "X", accountType: "tarjeta", balance: "10" }).success).toBe(false);
  });

  it("gasto: exige categoría y fecha válida", () => {
    const ok = expenseSchema.parse({ amount: "120.40", occurredOn: "2026-11-18", categoryId: CAT, accountId: "" });
    expect(ok).toMatchObject({ amount: "120.40", accountId: null, description: null });
    expect(expenseSchema.safeParse({ amount: "10", occurredOn: "2026-02-30", categoryId: CAT }).success).toBe(false);
    expect(expenseSchema.safeParse({ amount: "10", occurredOn: "2026-11-18", categoryId: "" }).success).toBe(false);
  });

  it("fuente de ingreso variable no guarda monto esperado", () => {
    const v = incomeSourceSchema.parse({ name: "Comisiones", incomeType: "comision", frequency: "mensual", isVariable: "on", expectedAmount: "5000" });
    expect(v).toMatchObject({ isVariable: true, expectedAmount: null });
    const fijo = incomeSourceSchema.parse({ name: "Sueldo", incomeType: "sueldo", frequency: "quincenal", expectedAmount: "8,500", payDays: "15, 30" });
    expect(fijo).toMatchObject({ isVariable: false, expectedAmount: "8500.00", payDays: [15, 30] });
    expect(incomeSourceSchema.safeParse({ name: "S", incomeType: "sueldo", frequency: "quincenal", payDays: "15, 40" }).success).toBe(false);
  });

  it("gasto recurrente necesita monto, frecuencia y fecha", () => {
    expect(recurringSchema.safeParse({ name: "Luz", amount: "350", frequency: "bimestral", nextDueDate: "2026-12-05" }).success).toBe(true);
    expect(recurringSchema.safeParse({ name: "Luz", amount: "350", frequency: "diario", nextDueDate: "2026-12-05" }).success).toBe(false);
  });
});
