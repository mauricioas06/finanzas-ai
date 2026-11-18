import type { Metadata } from "next";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/data/profile";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const profile = await requireProfile();

  return (
    <>
      <PageHeader title="Configuración" description="Tu perfil y preferencias. Estos datos ajustan las recomendaciones." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="mb-4 text-base font-semibold">Perfil financiero</h2>
          <ProfileForm profile={profile} />
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-semibold">Cuenta</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Correo</dt><dd className="truncate">{profile.email}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Plan</dt><dd><Badge tone={profile.plan === "premium" ? "brand" : "neutral"}>{profile.plan === "premium" ? "Premium" : "Gratuito"}</Badge></dd></div>
            </dl>
          </Card>
          <Card>
            <h2 className="text-base font-semibold">Región</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Moneda</dt><dd>MXN (peso mexicano)</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Fechas</dt><dd>DD/MM/AAAA</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Zona horaria</dt><dd>Ciudad de México</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
