"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";
import { signUp, type AuthState } from "../actions";

export function SignUpForm() {
  const [state, action] = useActionState<AuthState, FormData>(signUp, {});

  if (state.success) {
    return (
      <div className="mt-6 space-y-4">
        <Alert tone="success">{state.success}</Alert>
        <p className="text-sm text-muted">Si no lo ves en unos minutos, revisa la carpeta de spam.</p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field label="Nombre" htmlFor="fullName" error={state.fields?.fullName}>
        <input id="fullName" name="fullName" autoComplete="name" required maxLength={120}
          defaultValue={state.values?.fullName} className={inputClass} placeholder="¿Cómo te llamas?" />
      </Field>
      <Field label="Correo electrónico" htmlFor="email" error={state.fields?.email}>
        <input id="email" name="email" type="email" autoComplete="email" required
          defaultValue={state.values?.email} className={inputClass} placeholder="tu@correo.com" />
      </Field>
      <Field label="Contraseña" htmlFor="password" hint="Mínimo 10 caracteres, con letras y números." error={state.fields?.password}>
        <input id="password" name="password" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      <Field label="Confirma tu contraseña" htmlFor="confirmPassword" error={state.fields?.confirmPassword}>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      <div className="space-y-1.5">
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="privacy" className="mt-0.5 h-4 w-4 accent-[var(--brand)]" required />
          <span className="text-muted">
            Leí y acepto el{" "}
            <Link href="/privacidad" target="_blank" className="text-brand hover:underline">aviso de privacidad</Link>.
            Entiendo que FINANZAS AI no es asesoría financiera.
          </span>
        </label>
        {state.fields?.privacy ? <p className="text-xs text-negative">{state.fields.privacy}</p> : null}
      </div>
      <SubmitButton pendingText="Creando cuenta…" className="w-full">Crear cuenta</SubmitButton>
    </form>
  );
}
