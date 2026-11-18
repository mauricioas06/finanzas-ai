"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, safeNextPath, signInSchema, signUpSchema, type FieldErrors } from "@/lib/validation";

export interface AuthState {
  error?: string;
  success?: string;
  fields?: FieldErrors;
  values?: Record<string, string>;
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Primero confirma tu correo con el enlace que te enviamos.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Espera unos minutos y vuelve a intentar.";
  if (m.includes("password") && m.includes("weak")) return "La contraseña es muy débil. Usa una más larga.";
  if (m.includes("already registered")) return "Ese correo ya tiene cuenta. Inicia sesión.";
  return "No se pudo completar la operación. Intenta de nuevo.";
}

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "La aplicación aún no está conectada a la base de datos." };
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: translateAuthError(error.message), values };

  redirect(safeNextPath(formData.get("next")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "La aplicación aún no está conectada a la base de datos." };
  const values = { fullName: String(formData.get("fullName") ?? ""), email: String(formData.get("email") ?? "") };
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
      data: { full_name: parsed.data.fullName, privacy_accepted: true },
    },
  });
  if (error) return { error: translateAuthError(error.message), values };

  // Si Supabase no exige confirmar el correo, ya hay sesión.
  if (data.session) redirect("/dashboard");

  return {
    success: `Listo. Te enviamos un correo a ${parsed.data.email}. Abre el enlace para activar tu cuenta.`,
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
