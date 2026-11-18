import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import type { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { fieldErrors, type FieldErrors } from "@/lib/validation";

/** Estado que devuelven todas las Server Actions de formularios. */
export interface ActionState {
  error?: string;
  success?: string;
  fields?: FieldErrors;
  /** Cambia en cada éxito para que el formulario sepa que debe limpiarse. */
  stamp?: number;
}

/** Traduce errores de PostgreSQL a mensajes claros. Nunca muestra detalles internos. */
export function dbErrorMessage(error: PostgrestError): string {
  const msg = `${error.message} ${error.details ?? ""}`;
  if (error.code === "23514" && msg.includes("balance_check")) {
    return "La cuenta no tiene saldo suficiente. Revisa el monto o elige otra cuenta.";
  }
  if (error.code === "23505") return "Ya existe un registro con ese nombre.";
  if (error.code === "23503") return "La cuenta o categoría elegida ya no existe. Recarga la página.";
  if (error.code === "23514") return "Algún dato no es válido. Revisa el formulario.";
  if (error.code === "P0002") return "No se encontró el registro.";
  return "No se pudo guardar. Intenta de nuevo.";
}

/**
 * Envoltura común: valida con Zod, exige sesión y entrega el cliente.
 * La seguridad final la aplica RLS: aunque se mande otro user_id, la base lo rechaza.
 */
export async function runAction<S extends z.ZodType>(
  schema: S,
  formData: FormData,
  handler: (data: z.output<S>, ctx: NonNullable<Awaited<ReturnType<typeof requireUser>>>) => Promise<ActionState>,
): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const ctx = await requireUser();
  if (!ctx) return { error: "Tu sesión terminó. Vuelve a iniciar sesión." };
  return handler(parsed.data, ctx);
}

async function requireUser() {
  const { supabase, user } = await getCurrentUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

export function failed(scope: string, error: PostgrestError): ActionState {
  console.error(`[${scope}]`, error.code, error.message);
  return { error: dbErrorMessage(error) };
}

export function ok(message: string): ActionState {
  return { success: message, stamp: Date.now() };
}
