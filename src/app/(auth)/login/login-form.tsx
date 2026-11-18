"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";
import { signIn, type AuthState } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, {});

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Field label="Correo electrónico" htmlFor="email" error={state.fields?.email}>
        <input id="email" name="email" type="email" autoComplete="email" required
          defaultValue={state.values?.email} className={inputClass} placeholder="tu@correo.com" />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={state.fields?.password}>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <SubmitButton pendingText="Entrando…" className="w-full">Iniciar sesión</SubmitButton>
    </form>
  );
}
