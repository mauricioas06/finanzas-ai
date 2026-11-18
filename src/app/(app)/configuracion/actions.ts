"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/server";
import { fieldErrors, profileSchema, type FieldErrors } from "@/lib/validation";

export interface ProfileState {
  error?: string;
  success?: string;
  fields?: FieldErrors;
}

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      pay_frequency: parsed.data.payFrequency,
      risk_profile: parsed.data.riskProfile,
      // Meses (no es dinero): un decimal de un dígito es seguro como número.
      emergency_fund_months: Number(parsed.data.emergencyFundMonths),
      onboarding_completed: parsed.data.riskProfile !== null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[configuracion] updateProfile", error.code, error.message);
    return { error: "No se pudo guardar. Intenta de nuevo." };
  }

  revalidatePath("/", "layout");
  return { success: "Perfil guardado." };
}
