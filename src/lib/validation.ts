import { z } from "zod";
import { parseMoneyInput, toDbAmount } from "./money";

/** Esquemas de validación del servidor. Mensajes en español para el usuario. */

const email = z.string().trim().toLowerCase().email("Escribe un correo válido.").max(254);

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Escribe tu contraseña.").max(72),
});

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Escribe tu nombre.").max(120, "Máximo 120 caracteres."),
    email,
    password: z
      .string()
      .min(10, "Usa al menos 10 caracteres.")
      .max(72, "Máximo 72 caracteres.")
      .regex(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/, "Incluye al menos una letra.")
      .regex(/\d/, "Incluye al menos un número."),
    confirmPassword: z.string(),
    privacy: z.literal("on", { error: "Debes aceptar el aviso de privacidad." }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });

export const PAY_FREQUENCIES = ["semanal", "quincenal", "mensual", "variable"] as const;
export const RISK_PROFILES = ["conservador", "moderado", "agresivo"] as const;

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre.").max(120, "Máximo 120 caracteres."),
  payFrequency: z.enum(PAY_FREQUENCIES, { error: "Elige cada cuándo recibes dinero." }),
  riskProfile: z.union([z.enum(RISK_PROFILES), z.literal("")]).transform((v) => (v === "" ? null : v)),
  emergencyFundMonths: z
    .string()
    .trim()
    .regex(/^\d{1,2}(\.\d)?$/, "Escribe un número de meses, por ejemplo 3 o 4.5.")
    .refine((v) => Number(v) <= 24, "Máximo 24 meses."),
});

// ---------------------------------------------------------------------
// Campos comunes de la Fase 2: dinero, fechas, ids opcionales.
// ---------------------------------------------------------------------

/** Monto escrito por el usuario → texto exacto con 2 decimales ("1234.50"). */
export function moneyField(opts: { allowZero?: boolean; max?: string } = {}) {
  return z
    .string({ error: "Escribe un monto." })
    .trim()
    .min(1, "Escribe un monto.")
    .transform((raw, ctx) => {
      const value = parseMoneyInput(raw);
      if (!value) {
        ctx.addIssue({ code: "custom", message: "Monto inválido. Ejemplo: 1,250.50" });
        return z.NEVER;
      }
      if (value.isNegative() || (!opts.allowZero && value.isZero())) {
        ctx.addIssue({ code: "custom", message: opts.allowZero ? "No puede ser negativo." : "Debe ser mayor a cero." });
        return z.NEVER;
      }
      if (value.gt(opts.max ?? "999999999999.99")) {
        ctx.addIssue({ code: "custom", message: "El monto es demasiado grande." });
        return z.NEVER;
      }
      return toDbAmount(value);
    });
}

/** Fecha "YYYY-MM-DD" real, entre el año 2000 y un año en el futuro. */
export const dateField = z
  .string({ error: "Elige una fecha." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha.")
  .refine((v) => {
    const d = new Date(`${v}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Fecha inválida.")
  .refine((v) => v >= "2000-01-01" && v <= nextYear(), "La fecha está fuera de rango.");

function nextYear(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/** Id opcional de un <select>: "" se convierte en null. */
export const optionalId = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.uuid().safeParse(v).success, "Opción inválida.");

export const requiredId = z.uuid({ error: "Elige una opción." });

const shortText = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres.`).optional().transform((v) => (v ? v : null));

export const ACCOUNT_TYPES = ["efectivo", "debito", "ahorro", "cartera_digital", "otro"] as const;
export const INCOME_TYPES = ["sueldo", "bono", "comision", "trabajo_adicional", "negocio", "extraordinario", "otro"] as const;
export const INCOME_FREQUENCIES = ["unica", "semanal", "quincenal", "mensual", "variable"] as const;
export const RECURRING_FREQUENCIES = ["semanal", "quincenal", "mensual", "bimestral", "trimestral", "anual"] as const;

const name = (max: number) => z.string().trim().min(1, "Escribe un nombre.").max(max, `Máximo ${max} caracteres.`);

export const accountSchema = z.object({
  name: name(80),
  accountType: z.enum(ACCOUNT_TYPES, { error: "Elige el tipo de cuenta." }),
  institution: shortText(80),
  balance: moneyField({ allowZero: true }),
});

export const adjustBalanceSchema = z.object({ id: requiredId, balance: moneyField({ allowZero: true }) });

export const incomeSourceSchema = z
  .object({
    name: name(80),
    incomeType: z.enum(INCOME_TYPES, { error: "Elige el tipo de ingreso." }),
    frequency: z.enum(INCOME_FREQUENCIES, { error: "Elige la frecuencia." }),
    isVariable: z.literal("on").optional().transform((v) => v === "on"),
    expectedAmount: z.string().optional(),
    payDays: z
      .string()
      .trim()
      .optional()
      .transform((v, ctx) => {
        if (!v) return null;
        const days = v.split(/[,\s]+/).filter(Boolean).map(Number);
        if (days.length > 4 || days.some((d) => !Number.isInteger(d) || d < 1 || d > 31)) {
          ctx.addIssue({ code: "custom", message: "Escribe días del 1 al 31 separados por coma. Ejemplo: 15, 30" });
          return z.NEVER;
        }
        return days;
      }),
    description: shortText(300),
  })
  .transform((d, ctx) => {
    let expected: string | null = null;
    if (!d.isVariable && d.frequency !== "variable" && d.expectedAmount?.trim()) {
      const parsed = moneyField().safeParse(d.expectedAmount);
      if (!parsed.success) {
        ctx.addIssue({ code: "custom", path: ["expectedAmount"], message: parsed.error.issues[0].message });
        return z.NEVER;
      }
      expected = parsed.data;
    }
    return { ...d, isVariable: d.isVariable || d.frequency === "variable", expectedAmount: expected };
  });

export const incomeSchema = z.object({
  amount: moneyField(),
  occurredOn: dateField,
  incomeType: z.enum(INCOME_TYPES, { error: "Elige el tipo de ingreso." }),
  incomeSourceId: optionalId,
  accountId: optionalId,
  description: shortText(300),
});

export const expenseSchema = z.object({
  amount: moneyField(),
  occurredOn: dateField,
  categoryId: requiredId,
  accountId: optionalId,
  description: shortText(300),
});

export const categorySchema = z.object({
  name: name(60),
  monthlyBudget: z.string().optional(),
  isEssential: z.literal("on").optional().transform((v) => v === "on"),
}).transform((d, ctx) => {
  let budget: string | null = null;
  if (d.monthlyBudget?.trim()) {
    const parsed = moneyField({ allowZero: true }).safeParse(d.monthlyBudget);
    if (!parsed.success) {
      ctx.addIssue({ code: "custom", path: ["monthlyBudget"], message: parsed.error.issues[0].message });
      return z.NEVER;
    }
    budget = parsed.data;
  }
  return { name: d.name, isEssential: d.isEssential, monthlyBudget: budget };
});

export const budgetSchema = z.object({
  id: requiredId,
  monthlyBudget: z.string().trim().optional(),
}).transform((d, ctx) => {
  if (!d.monthlyBudget) return { id: d.id, monthlyBudget: null };
  const parsed = moneyField({ allowZero: true }).safeParse(d.monthlyBudget);
  if (!parsed.success) {
    ctx.addIssue({ code: "custom", path: ["monthlyBudget"], message: parsed.error.issues[0].message });
    return z.NEVER;
  }
  return { id: d.id, monthlyBudget: parsed.data };
});

export const recurringSchema = z.object({
  name: name(80),
  amount: moneyField(),
  frequency: z.enum(RECURRING_FREQUENCIES, { error: "Elige la frecuencia." }),
  nextDueDate: dateField,
  categoryId: optionalId,
  isEssential: z.literal("on").optional().transform((v) => v === "on"),
});

export const payRecurringSchema = z.object({
  id: requiredId,
  amount: moneyField(),
  paidOn: dateField,
  accountId: optionalId,
});

export const idSchema = z.object({ id: requiredId });

/** Devuelve solo rutas internas seguras para redirigir después del login. */
export function safeNextPath(value: FormDataEntryValue | string | null | undefined): string {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/dashboard";
  if (value.startsWith("/login") || value.startsWith("/registro") || value.startsWith("/auth/")) return "/dashboard";
  return value;
}

export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
