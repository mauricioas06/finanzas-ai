"use client";

import { Loader2 } from "lucide-react";
import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import type { ActionState } from "@/lib/actions/shared";
import { Alert, buttonClass, cn } from "./ui";

const FieldErrorsContext = createContext<ActionState["fields"]>(undefined);

/**
 * Formulario estándar: envía a una Server Action, muestra errores por campo
 * y se limpia solo cuando se guardó bien (si hay error, conserva lo escrito).
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Guardando…",
  confirmMessage,
  variant = "primary",
  className,
  inline = false,
  hideMessages = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children?: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  confirmMessage?: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  inline?: boolean;
  hideMessages?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.stamp) ref.current?.reset();
  }, [state.stamp]);

  const buttonStyle =
    variant === "danger"
      ? "inline-flex items-center justify-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-negative transition hover:bg-negative/10 disabled:opacity-60"
      : buttonClass[variant];

  return (
    <form
      ref={ref}
      noValidate
      className={cn(inline ? "flex flex-wrap items-end gap-2" : "space-y-4", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      {!hideMessages && state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {!hideMessages && state.success ? <Alert tone="success">{state.success}</Alert> : null}
      {hideMessages && state.error ? <p role="alert" className="w-full text-xs text-negative">{state.error}</p> : null}
      <FieldErrorsContext.Provider value={state.fields}>{children}</FieldErrorsContext.Provider>
      <button type="submit" disabled={pending} aria-busy={pending} className={buttonStyle}>
        {pending ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{pendingLabel}</> : submitLabel}
      </button>
    </form>
  );
}

/** Muestra el error de un campo dentro de un ActionForm. */
export function FieldError({ name }: { name: string }) {
  const fields = useContext(FieldErrorsContext);
  const message = fields?.[name];
  return message ? <p className="mt-1 text-xs text-negative">{message}</p> : null;
}

/** `htmlId` debe coincidir con el id del control; por defecto es `name`. */
export function FormField({ label, name, htmlId, hint, children, className }: { label: string; name: string; htmlId?: string; hint?: string; children: ReactNode; className?: string }) {
  const fields = useContext(FieldErrorsContext);
  const error = fields?.[name];
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlId ?? name} className="block text-sm font-medium">{label}</label>
      {children}
      {error ? <p className="text-xs text-negative">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
