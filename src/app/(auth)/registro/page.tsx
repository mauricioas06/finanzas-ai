import type { Metadata } from "next";
import Link from "next/link";
import { ConfigMissing } from "@/components/config-missing";
import { Card } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  if (!isSupabaseConfigured()) return <ConfigMissing />;
  return (
    <Card className="p-7">
      <h1 className="text-xl font-semibold">Crea tu cuenta</h1>
      <p className="mt-1 text-sm text-muted">Gratis. Tus datos solo los ves tú.</p>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">Inicia sesión</Link>
      </p>
    </Card>
  );
}
