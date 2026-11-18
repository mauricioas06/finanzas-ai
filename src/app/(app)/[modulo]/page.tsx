import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hammer } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { findNavItem } from "@/lib/navigation";

/**
 * Página temporal de los módulos que todavía no se construyen. Dice con
 * claridad en qué fase llegan; no muestra datos inventados ni botones vacíos.
 * Cuando un módulo se construye, su carpeta propia reemplaza esta ruta.
 */
export async function generateMetadata({ params }: PageProps<"/[modulo]">): Promise<Metadata> {
  const item = findNavItem((await params).modulo);
  return { title: item?.label ?? "No encontrado" };
}

export default async function ModuloPendiente({ params }: PageProps<"/[modulo]">) {
  const item = findNavItem((await params).modulo);
  if (!item || item.slug === "dashboard" || item.slug === "configuracion") notFound();

  return (
    <>
      <PageHeader title={item.label} description={item.description} action={<Badge tone="info">Llega en la Fase {item.phase}</Badge>} />
      <Card className="flex flex-col items-start gap-4 p-7">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-info/10 text-info">
          <Hammer className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-semibold">Este módulo está en construcción</h2>
          <p className="mt-1 text-sm text-muted">Cuando esté listo, aquí podrás:</p>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {item.features.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </Card>
    </>
  );
}
