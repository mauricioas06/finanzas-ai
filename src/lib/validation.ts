import { z } from "zod";

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
