"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, cn } from "./ui";

export function SubmitButton({ children, pendingText, className }: { children: ReactNode; pendingText: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn(buttonClass.primary, className)} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
