import type { Metadata } from "next";
import Link from "next/link";
import { ConfigMissing } from "@/components/config-missing";
import { Alert, Card } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/validation";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (!isSupabaseConfigured()) return <ConfigMissing />;
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  const callbackError = params.error === "confirmacion";

  return (
    <Card className="p-7">
      <h1 className="text-xl font-semibold">Inicia sesión</h1>
      <p className="mt-1 text-sm text-muted">Entra para ver qué hacer hoy con tu dinero.</p>
      {callbackError ? (
        <div className="mt-4">
          <Alert tone="error">El enlace de confirmación no es válido o ya caducó. Inicia sesión o regístrate de nuevo.</Alert>
        </div>
      ) : null}
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-brand hover:underline">Crea una gratis</Link>
      </p>
    </Card>
  );
}
