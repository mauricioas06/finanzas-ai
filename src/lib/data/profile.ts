import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export interface ProfileData {
  id: string;
  email: string;
  fullName: string | null;
  payFrequency: "semanal" | "quincenal" | "mensual" | "variable";
  riskProfile: "conservador" | "moderado" | "agresivo" | null;
  emergencyFundMonths: string;
  onboardingCompleted: boolean;
  plan: "free" | "premium";
}

/** Perfil del usuario con sesión. Si no hay sesión, manda al login. */
export async function requireProfile(): Promise<ProfileData> {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login");

  const [profileRes, subRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, pay_frequency, risk_profile, emergency_fund_months, onboarding_completed")
      .eq("id", user.id)
      .single(),
    supabase.from("subscriptions").select("plan").eq("user_id", user.id).single(),
  ]);

  if (profileRes.error || !profileRes.data) {
    throw new Error("No se encontró el perfil del usuario.");
  }
  const p = profileRes.data;
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: p.full_name,
    // Los CHECK de la base garantizan que el texto es uno de estos valores.
    payFrequency: p.pay_frequency as ProfileData["payFrequency"],
    riskProfile: p.risk_profile as ProfileData["riskProfile"],
    emergencyFundMonths: String(p.emergency_fund_months),
    onboardingCompleted: p.onboarding_completed,
    plan: subRes.data?.plan === "premium" ? "premium" : "free",
  };
}
