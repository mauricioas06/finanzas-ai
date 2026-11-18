import Link from "next/link";
import { ArrowRight, CalendarDays, CreditCard, HandCoins, Lock, Radar, Bot } from "lucide-react";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClass, Disclaimer } from "@/components/ui";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

const FEATURES = [
  { icon: HandCoins, title: "Recibí dinero", text: "Registras tu quincena y te dice cuánto separar para tarjetas, gastos, emergencias e inversión." },
  { icon: CreditCard, title: "Deudas bajo control", text: "Fecha de corte, fecha límite, pago mínimo y pago sin intereses, cada uno en su lugar." },
  { icon: CalendarDays, title: "Próximos pagos", text: "Alertas antes de cada vencimiento para no volver a pagar intereses por olvido." },
  { icon: Radar, title: "Investment Radar", text: "Investiga noticias y fundamentales, y compara con CETES y SOFIPOs antes de invertir." },
  { icon: Bot, title: "CFO con IA", text: "Pregunta “¿cuánto puedo gastar hoy?” y responde con tus datos reales, no con suposiciones." },
  { icon: Lock, title: "Privado por diseño", text: "Cada persona ve solo su información. Nunca pedimos contraseñas bancarias, CVV ni NIP." },
];

export default async function Home() {
  const loggedIn = isSupabaseConfigured() ? Boolean((await getCurrentUser()).user) : false;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {loggedIn ? (
            <Link href="/dashboard" className={buttonClass.primary}>Ir a mi dashboard</Link>
          ) : (
            <>
              <Link href="/login" className={buttonClass.ghost}>Iniciar sesión</Link>
              <Link href="/registro" className={buttonClass.primary}>Crear cuenta</Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="relative py-20 text-center sm:py-28">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_50%_0%,color-mix(in_oklab,var(--brand)_16%,transparent),transparent)]" />
          <p className="mb-4 inline-flex rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">Hecho para México · MXN</p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Tu CFO personal. <span className="text-brand">Qué hacer con cada peso.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted sm:text-lg">
            FINANZAS AI organiza tus ingresos, deudas y metas, y convierte tu situación en instrucciones claras:
            cuánto pagar, cuándo pagar, cuánto apartar y cuánto puedes gastar.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={loggedIn ? "/dashboard" : "/registro"} className={`${buttonClass.primary} px-6 py-3`}>
              {loggedIn ? "Ir a mi dashboard" : "Empieza gratis"} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-line bg-surface p-5">
              <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mx-auto max-w-6xl space-y-3 border-t border-line px-4 py-8 sm:px-6">
        <Disclaimer />
        <Link href="/privacidad" className="text-xs text-muted hover:text-fg hover:underline">Aviso de privacidad</Link>
      </footer>
    </div>
  );
}
