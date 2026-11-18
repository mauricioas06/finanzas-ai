import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CircleAlert, Info } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { MonthNav } from "@/components/month-nav";
import { PaymentStateBadge } from "@/components/payment-state";
import { Badge, Card, cn, PageHeader } from "@/components/ui";
import { getDebts, getNotifications, syncAlerts } from "@/lib/data/debts";
import { financeContext, getIncomeSources, getRecurring } from "@/lib/data/finance";
import { formatDate } from "@/lib/dates";
import { daysBetween, daysInMonth, monthLabel } from "@/lib/finance/months";
import { buildCalendar, buildUpcomingPayments, type CalendarEvent, type EventKind } from "@/lib/finance/schedule";
import { formatMXN } from "@/lib/money";
import { markAllRead } from "./actions";

export const metadata: Metadata = { title: "Calendario" };

const KIND: Record<EventKind, { label: string; dot: string; chip: string }> = {
  corte: { label: "Fecha de corte", dot: "bg-info", chip: "border-info/30 bg-info/10 text-info" },
  limite: { label: "Fecha límite de pago", dot: "bg-negative", chip: "border-negative/30 bg-negative/10 text-negative" },
  prestamo: { label: "Pago de préstamo", dot: "bg-[#f59e0b]", chip: "border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#d97706] dark:text-[#fbbf24]" },
  recurrente: { label: "Gasto recurrente", dot: "bg-[#a78bfa]", chip: "border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#7c3aed] dark:text-[#c4b5fd]" },
  ingreso: { label: "Ingreso previsto", dot: "bg-positive", chip: "border-positive/30 bg-positive/10 text-positive" },
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function EventChip({ e }: { e: CalendarEvent }) {
  return (
    <Link href={e.href} className={cn("block truncate rounded-md border px-1.5 py-0.5 text-[11px] leading-tight", KIND[e.kind].chip, e.estimated && "border-dashed opacity-80")}
      title={`${KIND[e.kind].label}: ${e.title}${e.amount ? ` · ${formatMXN(e.amount)}` : ""}${e.estimated ? " (estimada)" : ""}`}>
      {e.title}{e.amount ? ` · ${formatMXN(e.amount)}` : ""}
    </Link>
  );
}

export default async function CalendarioPage({ searchParams }: PageProps<"/calendario">) {
  const ctx = await financeContext((await searchParams).mes);
  await syncAlerts(ctx);
  const [debts, recurring, incomes, alerts] = await Promise.all([
    getDebts(ctx), getRecurring(ctx), getIncomeSources(ctx), getNotifications(ctx, 15),
  ]);

  const debtSchedules = debts;
  const recurringSchedules = recurring.map((r) => ({ id: r.id, name: r.name, amount: r.amount, frequency: r.frequency, dueDay: r.due_day, nextDueDate: r.next_due_date }));
  const upcoming = buildUpcomingPayments({ today: ctx.today, debts: debtSchedules, recurring: recurringSchedules });
  const events = buildCalendar(ctx.month, {
    today: ctx.today, debts: debtSchedules, recurring: recurringSchedules,
    incomes: incomes.filter((s) => s.frequency !== "unica" && s.frequency !== "variable")
      .map((s) => ({ id: s.id, name: s.name, frequency: s.frequency, payDays: s.pay_days, expectedAmount: s.expected_amount })),
  });

  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const total = daysInMonth(ctx.month);
  const firstWeekday = (new Date(`${ctx.month}-01T12:00:00Z`).getUTCDay() + 6) % 7; // lunes = 0
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: total }, (_, i) => `${ctx.month}-${String(i + 1).padStart(2, "0")}`)];
  const unread = alerts.filter((a) => !a.read_at).length;

  return (
    <>
      <PageHeader title="Calendario" description="Cortes, fechas límite, préstamos, gastos recurrentes e ingresos previstos."
        action={<MonthNav basePath="/calendario" month={ctx.month} currentMonth={ctx.currentMonth} />} />

      <Card className="mb-6 p-0">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-brand">PRÓXIMOS PAGOS</h2>
          <p className="text-xs text-muted">Los siguientes 30 días y lo vencido. El estado «Dinero apartado» llega con los apartados en la Fase 4.</p>
        </div>
        {upcoming.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">No tienes pagos en los próximos 30 días.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr><th className="px-5 py-2 font-medium">Deuda o pago</th><th className="py-2 font-medium">Institución</th><th className="py-2 text-right font-medium">Importe</th><th className="py-2 font-medium">Fecha límite</th><th className="px-5 py-2 font-medium">Estado</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {upcoming.map((p) => {
                  const days = daysBetween(ctx.today, p.date);
                  return (
                    <tr key={p.key}>
                      <td className="px-5 py-3"><Link href={p.href} className="font-medium hover:underline">{p.title}</Link>{p.note && !p.amount ? <p className="text-xs text-muted">{p.note}</p> : null}</td>
                      <td className="py-3 text-muted">{p.institution ?? "—"}</td>
                      <td className="num py-3 text-right font-medium">{p.amount ? formatMXN(p.amount) : <span className="text-muted">Por capturar</span>}</td>
                      <td className="num whitespace-nowrap py-3">{formatDate(p.date)}<span className="block text-xs text-muted">{days < 0 ? `hace ${-days} d` : days === 0 ? "hoy" : `en ${days} d`}</span></td>
                      <td className="px-5 py-3"><PaymentStateBadge state={p.state} estimated={p.estimated} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted">
            {Object.values(KIND).map((k) => <span key={k.label} className="inline-flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", k.dot)} />{k.label}</span>)}
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded border border-dashed border-muted" />Fecha estimada</span>
          </div>

          {/* Cuadrícula (pantallas medianas y grandes) */}
          <div className="hidden md:block">
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line text-xs">
              {WEEKDAYS.map((w) => <div key={w} className="bg-surface-2 px-2 py-1.5 font-medium text-muted">{w}</div>)}
              {cells.map((date, i) => (
                <div key={date ?? `vacio-${i}`} className={cn("min-h-24 bg-surface p-1.5", !date && "bg-surface-2/40")}>
                  {date ? (
                    <>
                      <p className={cn("num mb-1 text-right text-[11px]", date === ctx.today ? "font-bold text-brand" : "text-muted")}>{Number(date.slice(8))}</p>
                      <div className="space-y-1">{(byDay.get(date) ?? []).map((e) => <EventChip key={e.key} e={e} />)}</div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Agenda (teléfono) */}
          <ul className="space-y-3 md:hidden">
            {events.length === 0 ? <li className="text-sm text-muted">Sin fechas en {monthLabel(ctx.month)}.</li> : null}
            {[...byDay.entries()].map(([date, list]) => (
              <li key={date}>
                <p className={cn("text-xs font-medium", date === ctx.today ? "text-brand" : "text-muted")}>{formatDate(date)}</p>
                <div className="mt-1 space-y-1">{list.map((e) => <EventChip key={e.key} e={e} />)}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card id="alertas" className="h-fit scroll-mt-20">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold"><Bell className="h-4 w-4" aria-hidden="true" /> Alertas</h2>
            {unread ? <Badge tone="negative">{unread} nueva{unread === 1 ? "" : "s"}</Badge> : null}
          </div>
          <p className="mb-3 text-xs text-muted">Se crean 7, 3 y 1 día antes de cada pago, y el día del vencimiento. Por ahora se ven aquí; los avisos por correo llegan en la Fase 8.</p>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted">Sin alertas.</p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((a) => (
                <li key={a.id} className={cn("flex gap-2 text-sm", a.read_at && "opacity-60")}>
                  {a.severity === "urgente" ? <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-negative" aria-hidden="true" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />}
                  <div><p className="font-medium">{a.title}</p>{a.body ? <p className="text-xs text-muted">{a.body}</p> : null}</div>
                </li>
              ))}
            </ul>
          )}
          {unread ? (
            <div className="mt-4">
              <ActionForm action={markAllRead} submitLabel="Marcar todas como leídas" variant="secondary" hideMessages />
            </div>
          ) : null}
        </Card>
      </div>
    </>
  );
}
