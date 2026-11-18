"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";
import type { ProfileData } from "@/lib/data/profile";
import { updateProfile, type ProfileState } from "./actions";

const RISK_HELP: Record<string, string> = {
  conservador: "Prefieres no perder dinero aunque ganes menos.",
  moderado: "Aceptas altibajos moderados a cambio de más rendimiento.",
  agresivo: "Aceptas caídas fuertes buscando el mayor crecimiento a largo plazo.",
};

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfile, {});

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <Field label="Nombre" htmlFor="fullName" error={state.fields?.fullName}>
        <input id="fullName" name="fullName" defaultValue={profile.fullName ?? ""} maxLength={120} required className={inputClass} />
      </Field>

      <Field label="¿Cada cuándo recibes dinero?" htmlFor="payFrequency" error={state.fields?.payFrequency}>
        <select id="payFrequency" name="payFrequency" defaultValue={profile.payFrequency} className={inputClass}>
          <option value="semanal">Semanal</option>
          <option value="quincenal">Quincenal</option>
          <option value="mensual">Mensual</option>
          <option value="variable">Variable (no tengo fechas fijas)</option>
        </select>
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Perfil de riesgo para inversiones</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["conservador", "moderado", "agresivo"] as const).map((risk) => (
            <label key={risk} className="flex cursor-pointer flex-col gap-1 rounded-xl border border-line bg-surface-2 p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10">
              <span className="flex items-center gap-2 font-medium capitalize">
                <input type="radio" name="riskProfile" value={risk} defaultChecked={profile.riskProfile === risk} className="accent-[var(--brand)]" />
                {risk}
              </span>
              <span className="text-xs text-muted">{RISK_HELP[risk]}</span>
            </label>
          ))}
        </div>
        {state.fields?.riskProfile ? <p className="text-xs text-negative">{state.fields.riskProfile}</p> : null}
      </fieldset>

      <Field
        label="Meta de fondo de emergencia (meses de gastos)"
        htmlFor="emergencyFundMonths"
        hint="Lo habitual es entre 3 y 6 meses de tus gastos indispensables."
        error={state.fields?.emergencyFundMonths}
      >
        <input id="emergencyFundMonths" name="emergencyFundMonths" inputMode="decimal" defaultValue={profile.emergencyFundMonths} className={`${inputClass} max-w-32`} />
      </Field>

      <SubmitButton pendingText="Guardando…">Guardar cambios</SubmitButton>
    </form>
  );
}
