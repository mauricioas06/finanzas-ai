import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, Info } from "lucide-react";
import { CashflowChart, DonutChart, HorizontalBars } from "@/components/charts";
import { Stat } from "@/components/stat";
import { Badge, Card, PageHeader, cn } from "@/components/ui";
import { requireProfile } from "@/lib/data/profile";
import { financeContext, getAccounts, getCashflow, getCategories, getCategorySpend, getRecurring } from "@/lib/data/finance";
import { formatDate, greeting } from "@/lib/dates";
import { buildTodayActions, changePercent, detectExcess } from "@/lib/finance/analysis";
import { monthLabel, monthRange } from "@/lib/finance/months";
import { formatMXN, money, sum } from "@/lib/money";

export const metadata: Metadata = { title: "Dashboard" };

const PENDING: Array<{ label: string; phase: number }> = [
  { label: "Dinero apartado", phase: 4 },
  { label: "Deudas pendientes", phase: 3 },
  { label: "Total invertido", phase: 6 },
  { label: "Ahorro acumulado", phase: 4 },
];

const ACTION_ICON = { urgente: CircleAlert, aviso: CircleAlert, info: Info } as const;
const ACTION_TONE = { urgente: "text-negative", aviso: "text-[#f59e0b]", info: "text-info" } as const;

export default async function DashboardPage() {
  const profile = await requireProfile();
  const ctx = await financeContext();
  const [accounts, categories, recurring, flow, spend] = await Promise.all([
    getAccounts(ctx), getCategories(ctx), getRecurring(ctx), getCashflow(ctx, ctx.currentMonth, 6), getCategorySpend(ctx, ctx.currentMonth, 4),
  ]);

  const month = ctx.currentMonth;
  const { end } = monthRange(month);
  const available = sum(accounts.map((a) => a.balance));
  const thisFlow = flow[flow.length - 1];
  const prevFlow = flow[flow.length - 2];
  const monthBalance = money(thisFlow.income).minus(thisFlow.expense);

  // Comprometido: gastos recurrentes que aún vencen de hoy al fin de mes.
  const pendingRecurring = recurring.filter((r) => r.next_due_date && r.next_due_date <= end);
  const committed = sum(pendingRecurring.map((r) => r.amount));

  const [m3, m2, m1] = spend.months;
  const current = spend.byMonth.get(month)!;
  const categoryRows = categories.map((c) => {
    const spent = current.get(c.id) ?? "0.00";
    const previous = [m3, m2, m1].map((m) => spend.byMonth.get(m)?.get(c.id) ?? "0");
    return { id: c.id, name: c.name, spent, budget: c.monthly_budget, excessive: detectExcess(spent, previous).excessive };
  });

  const actions = buildTodayActions({
    today: ctx.today,
    profileComplete: profile.riskProfile !== null,
    accountCount: accounts.length,
    incomeThisMonth: thisFlow.income,
    recurring: recurring.map((r) => ({ id: r.id, name: r.name, amount: r.amount, nextDueDate: r.next_due_date, isActive: r.is_active })),
    categories: categoryRows,
  });

  const firstName = profile.fullName?.split(" ")[0];
  const hasFlow = flow.some((f) => money(f.income).gt(0) || money(f.expense).gt(0));
  const categoryChart = categoryRows.filter((c) => money(c.spent).gt(0)).sort((a, b) => money(b.spent).cmp(a.spent))
    .map((c) => ({ name: c.name, value: Number(c.spent) }));

  return (
    <>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description={`Hoy es ${formatDate(ctx.today)}. Resumen de ${monthLabel(month)}.`}
      />

      <Card className="mb-6 border-brand/30">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-brand">¿QUÉ DEBO HACER HOY?</h2>
          {actions.length ? <Badge tone="brand">{actions.length} pendiente{actions.length === 1 ? "" : "s"}</Badge> : null}
        </div>
        {actions.length === 0 ? (
          <p className="flex items-center gap-2 text-sm"><CircleCheck className="h-5 w-5 text-positive" aria-hidden="true" /> Todo en orden por hoy. No tienes pagos próximos ni presupuestos en riesgo.</p>
        ) : (
          <ol className="divide-y divide-line">
            {actions.map((a) => {
              const Icon = ACTION_ICON[a.tone];
              return (
                <li key={a.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", ACTION_TONE[a.tone])} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted">{a.detail}</p>
                  </div>
                  <Link href={a.href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline">
                    Ir <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Dinero total disponible" value={formatMXN(available)} note={`En ${accounts.length} cuenta${accounts.length === 1 ? "" : "s"}`} />
        <Stat label="Dinero comprometido" value={formatMXN(committed)}
          note={pendingRecurring.length ? `${pendingRecurring.length} gasto${pendingRecurring.length === 1 ? "" : "s"} recurrente${pendingRecurring.length === 1 ? "" : "s"} por pagar este mes` : "Sin recurrentes pendientes este mes. Deudas: Fase 3"} />
        <Stat label="Ingresos del mes" value={formatMXN(thisFlow.income)} change={changePercent(thisFlow.income, prevFlow.income)} tone="positive" />
        <Stat label="Gastos del mes" value={formatMXN(thisFlow.expense)} change={changePercent(thisFlow.expense, prevFlow.expense)} goodWhenUp={false} />
        <Stat label="Balance del mes" value={formatMXN(monthBalance)} tone={monthBalance.isNegative() ? "negative" : "positive"}
          note={monthBalance.isNegative() ? "Gastaste más de lo que entró" : "Ingresos menos gastos"} />
        <Stat label="Patrimonio neto" value={formatMXN(available)} note="Por ahora solo cuentas; restará deudas (F3) y sumará inversiones (F6)" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-semibold">Ingresos vs. gastos</h2>
          {hasFlow ? (
            <CashflowChart data={flow.map((f) => ({ label: monthLabel(f.month, true), income: Number(f.income), expense: Number(f.expense) }))} />
          ) : (
            <p className="py-16 text-center text-sm text-muted">Registra ingresos y gastos para ver tu evolución mes a mes.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold">Distribución del dinero</h2>
          {accounts.length && available.gt(0) ? (
            <DonutChart label="Dinero por cuenta" data={accounts.filter((a) => money(a.balance).gt(0)).map((a) => ({ name: a.name, value: Number(a.balance) }))} />
          ) : (
            <p className="py-16 text-center text-sm text-muted">Agrega tus cuentas en <Link href="/mi-dinero" className="text-brand hover:underline">Mi dinero</Link> para ver dónde está tu dinero.</p>
          )}
        </Card>
        {categoryChart.length ? (
          <Card className="lg:col-span-2">
            <h2 className="mb-3 text-base font-semibold">Gastos por categoría · {monthLabel(month)}</h2>
            <HorizontalBars label="Gastos por categoría del mes" data={categoryChart} />
          </Card>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PENDING.map((m) => (
          <div key={m.label} className="rounded-xl border border-dashed border-line px-4 py-3">
            <p className="text-xs text-muted">{m.label}</p>
            <p className="mt-1 text-xs text-muted/80">Se activa en la Fase {m.phase}</p>
          </div>
        ))}
      </div>
    </>
  );
}
