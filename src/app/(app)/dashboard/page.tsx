import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleCheck, Circle } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/data/profile";
import { formatDate, greeting, todayInMexico } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const METRICS: Array<{ label: string; phase: number }> = [
  { label: "Dinero total disponible", phase: 2 },
  { label: "Dinero comprometido", phase: 3 },
  { label: "Dinero apartado", phase: 4 },
  { label: "Ingresos del mes", phase: 2 },
  { label: "Gastos del mes", phase: 2 },
  { label: "Deudas pendientes", phase: 3 },
  { label: "Total invertido", phase: 6 },
  { label: "Ahorro acumulado", phase: 4 },
  { label: "Patrimonio neto", phase: 2 },
];

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { count: categoryCount } = await supabase
    .from("expense_categories")
    .select("id", { count: "exact", head: true })
    .eq("is_archived", false);

  const firstName = profile.fullName?.split(" ")[0];
  const profileDone = profile.riskProfile !== null;

  const steps = [
    { done: profileDone, title: "Completa tu perfil financiero", detail: "Cada cuándo cobras, tu perfil de riesgo y tu meta de fondo de emergencia.", href: "/configuracion" },
    { done: false, title: "Registra tus cuentas, ingresos y gastos", detail: "Con eso se calcula cuánto dinero tienes realmente.", phase: 2 },
    { done: false, title: "Captura tus tarjetas y deudas", detail: "Con fecha de corte, fecha límite, pago mínimo y pago sin intereses.", phase: 3 },
    { done: false, title: "Usa «RECIBÍ DINERO» en tu próximo ingreso", detail: "Te dirá qué hacer con cada peso.", phase: 4 },
  ];

  return (
    <>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description={`Hoy es ${formatDate(todayInMexico())}. Esta es tu situación financiera.`}
      />

      <Card className="mb-6 border-brand/30">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-brand">¿QUÉ DEBO HACER HOY?</h2>
          <Badge tone="brand">{steps.filter((s) => s.done).length} de {steps.length}</Badge>
        </div>
        <ol className="divide-y divide-line">
          {steps.map((step) => (
            <li key={step.title} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              {step.done ? (
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-positive" aria-label="Hecho" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-label="Pendiente" />
              )}
              <div className="min-w-0 flex-1">
                <p className={step.done ? "text-sm text-muted line-through" : "text-sm font-medium"}>{step.title}</p>
                <p className="text-xs text-muted">{step.detail}</p>
              </div>
              {"href" in step && step.href && !step.done ? (
                <Link href={step.href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline">
                  Ir <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : "phase" in step ? (
                <Badge>Fase {step.phase}</Badge>
              ) : null}
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {METRICS.map((m) => (
          <Card key={m.label} className="p-4">
            <p className="text-xs text-muted">{m.label}</p>
            <p className="num mt-2 text-2xl font-semibold text-muted/50" aria-label="Sin datos todavía">—</p>
            <p className="mt-1 text-xs text-muted">Se calcula con tus datos a partir de la Fase {m.phase}.</p>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted">
        Base de datos conectada: tienes {categoryCount ?? 0} categorías de gasto listas para usar.
      </p>
    </>
  );
}
