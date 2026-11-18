import { describe, expect, it } from "vitest";
import { formatDate, greeting, todayInMexico } from "@/lib/dates";
import { formatMXN, parseMoneyInput, sum, toDbAmount } from "@/lib/money";
import { safeNextPath, signUpSchema, profileSchema } from "@/lib/validation";

describe("dinero con precisión decimal", () => {
  it("0.10 + 0.20 es exactamente 0.30 (no 0.30000000000000004)", () => {
    expect(sum(["0.10", "0.20"]).toFixed(2)).toBe("0.30");
    expect(sum(["0.10", "0.20"]).eq("0.3")).toBe(true);
  });

  it("redondea a centavos con redondeo bancario", () => {
    expect(toDbAmount("10.005")).toBe("10.00");
    expect(toDbAmount("10.015")).toBe("10.02");
    expect(toDbAmount("2500")).toBe("2500.00");
  });

  it("formatea en pesos mexicanos", () => {
    expect(formatMXN("10000")).toBe("$10,000.00");
    expect(formatMXN("1234.5")).toBe("$1,234.50");
  });

  it("entiende montos escritos por el usuario", () => {
    expect(parseMoneyInput("$1,234.50")?.toFixed(2)).toBe("1234.50");
    expect(parseMoneyInput("2500")?.toFixed(2)).toBe("2500.00");
    expect(parseMoneyInput("12.345")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
    expect(parseMoneyInput("1,23")).toBeNull();
  });
});

describe("fechas en México", () => {
  it("muestra fechas como DD/MM/YYYY sin recorrer el día", () => {
    expect(formatDate("2026-11-01")).toBe("01/11/2026");
  });

  it("calcula 'hoy' con la hora de la Ciudad de México", () => {
    // 02:00 UTC del 19/11 = 20:00 del 18/11 en CDMX (UTC-6)
    expect(todayInMexico(new Date("2026-11-19T02:00:00Z"))).toBe("2026-11-18");
    expect(greeting(new Date("2026-11-19T02:00:00Z"))).toBe("Buenas noches");
    expect(greeting(new Date("2026-11-18T15:00:00Z"))).toBe("Buenos días");
  });
});

describe("validación del servidor", () => {
  const base = { fullName: "Ana", email: "ANA@Correo.com ", password: "segura12345", confirmPassword: "segura12345", privacy: "on" };

  it("acepta un registro válido y normaliza el correo", () => {
    const r = signUpSchema.safeParse(base);
    expect(r.success && r.data.email).toBe("ana@correo.com");
  });

  it("rechaza contraseñas débiles, distintas o sin aceptar privacidad", () => {
    expect(signUpSchema.safeParse({ ...base, password: "corta1", confirmPassword: "corta1" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, confirmPassword: "otra123456" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, privacy: undefined }).success).toBe(false);
  });

  it("valida el perfil financiero", () => {
    const ok = profileSchema.safeParse({ fullName: "Ana", payFrequency: "quincenal", riskProfile: "", emergencyFundMonths: "4.5" });
    expect(ok.success && ok.data.riskProfile).toBe(null);
    expect(profileSchema.safeParse({ fullName: "Ana", payFrequency: "diario", riskProfile: "", emergencyFundMonths: "3" }).success).toBe(false);
    expect(profileSchema.safeParse({ fullName: "Ana", payFrequency: "mensual", riskProfile: "", emergencyFundMonths: "30" }).success).toBe(false);
  });

  it("solo redirige a rutas internas", () => {
    expect(safeNextPath("/deudas")).toBe("/deudas");
    expect(safeNextPath("https://malo.com")).toBe("/dashboard");
    expect(safeNextPath("//malo.com")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
  });
});
