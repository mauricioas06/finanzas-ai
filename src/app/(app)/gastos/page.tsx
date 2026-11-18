import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { ActionForm, FormField } from "@/components/action-form";
import { BudgetBar } from "@/components/budget-bar";
import { HorizontalBars } from "@/components/charts";
import { MonthNav } from "@/components/month-nav";
import { Stat } from "@/components/stat";
import { Badge, Card, inputClass, PageHeader } from "@/components/ui";
import { deleteTransaction } from "@/lib/actions/transactions";
import { financeContext, getAccounts, getCategories, getCategorySpend, getMonthTransactions, getRecurring } from "@/lib/data/finance";
import { formatDate } from "@/lib/dates";
import { budgetStatus, changePercent, detectExcess } from "@/lib/finance/analysis";
import { daysBetween, monthLabel } from "@/lib/finance/months";
import { FREQUENCY_LABEL, label } from "@/lib/labels";
import { formatMXN, money, sum } from "@/lib/money";
import { archiveCategory, createCategory, createRecurring, deleteRecurring, payRecurring, recordExpense, updateBudget } from "./actions";

export const metadata: Metadata = { title: "Gastos" };

const STATUS_BADGE = {
  sin_presupuesto: null,
  ok: <Badge tone="positive">En orden</Badge>,
  aviso: <Badge tone="info">Cerca del límite</Badge>,
  excedido: <Badge tone="negative">Excedido</Badge>,
} as const;

export default async function GastosPage({ searchParams }: PageProps<"/gastos">) {
  const ctx = await financeContext((await searchParams).mes);
  const [accounts, categories, recurring, txs, spend] = await Promise.all([
    getAccounts(ctx), getCategories(ctx), getRecurring(ctx), getMonthTransactions(ctx, ctx.month, "gasto"), getCategorySpend(ctx, ctx.month, 4),
  ]);

  const [m3, m2, m1, current] = spend.months;
  const thisMonth = spend.byMonth.get(current)!;
  const prevMonth = spend.byMonth.get(m1)!;
  const total = sum(txs.map((t) => t.amount));
  const prevTotal = sum([...prevMonth.values()]);
  const totalBudget = sum(categories.map((c) => c.monthly_budget ?? "0"));
  const isCurrent = ctx.month === ctx.currentMonth;
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));

  const rows = categories.map((c) => {
    const spent = thisMonth.get(c.id) ?? "0.00";
    const previous = [m3, m2, m1].map((m) => spend.byMonth.get(m)?.get(c.id) ?? "0");
    return {
      ...c,
      spent,
      status: budgetStatus(spent, c.monthly_budget),
      change: changePercent(spent, prevMonth.get(c.id) ?? "0"),
      excess: detectExcess(spent, previous),
    };
  });
  const alerts = rows.filter((r) => r.status.level === "excedido" || r.excess.excessive);
  const chartData = rows.filter((r) => money(r.spent).gt(0)).sort((a, b) => money(b.spent).cmp(a.spent))
    .map((r) => ({ name: r.name, value: Number(r.spent) }));

  return (
    <>
      <PageHeader
        title="Gastos"
        description="Lo que sale: gastos únicos y recurrentes, con presupuesto por categoría."
        action={<MonthNav basePath="/gastos" month={ctx.month} currentMonth={ctx.currentMonth} />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label={`Gastos de ${monthLabel(ctx.month)}`} value={formatMXN(total)} change={changePercent(total, prevTotal)} goodWhenUp={false} />
        <Stat label="Presupuesto del mes" value={totalBudget.gt(0) ? formatMXN(totalBudget) : "Sin definir"}
          note={totalBudget.gt(0)
            ? totalBudget.gte(total) ? `Te quedan ${formatMXN(totalBudget.minus(total))}` : `Te pasaste por ${formatMXN(total.minus(totalBudget))}`
            : "Asígnalo por categoría abajo"} />
        <Stat label="Movimientos del mes" value={txs.length} />
      </div>

      {alerts.length > 0 ? (
        <Card className="mb-6 border-negative/30 bg-negative/5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-negative"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> Alertas de gasto</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {alerts.map((a) => (
              <li key={a.id}>
                <strong>{a.name}:</strong>{" "}
                {a.status.level === "excedido"
                  ? `te pasaste ${formatMXN(a.status.remaining!.abs())} del presupuesto (${a.status.percent} %).`
                  : `llevas ${formatMXN(a.spent)}, ${a.excess.ratio} veces tu promedio de ${formatMXN(a.excess.average!)} de los meses anteriores.`}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card id="categorias" className="scroll-mt-20 p-0">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold">Categorías y presupuestos</h2>
              <p className="text-xs text-muted">Aviso al 80 % del presupuesto. «Gasto inusual» = 1.5 veces tu promedio de los 3 meses anteriores.</p>
            </div>
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color ?? "#94a3b8" }} aria-hidden="true" />
                      <span className="font-medium">{r.name}</span>
                      {r.is_essential ? <Badge>Indispensable</Badge> : null}
                      {STATUS_BADGE[r.status.level]}
                      {r.excess.excessive ? <Badge tone="negative">Gasto inusual</Badge> : null}
                    </div>
                    <p className="num text-sm">
                      <span className="font-semibold">{formatMXN(r.spent)}</span>
                      {r.monthly_budget ? <span className="text-muted"> de {formatMXN(r.monthly_budget)}</span> : null}
                    </p>
                  </div>
                  <div className="mt-2"><BudgetBar percent={r.status.percent} level={r.status.level} /></div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span>{r.change === null ? "Sin gasto el mes anterior" : `${r.change > 0 ? "▲" : r.change < 0 ? "▼" : "="} ${Math.abs(r.change)} % vs. ${monthLabel(m1)}`}</span>
                    <details>
                      <summary className="cursor-pointer font-medium text-brand hover:underline">Editar</summary>
                      <div className="mt-2 flex flex-wrap items-end gap-3">
                        <ActionForm action={updateBudget} submitLabel="Guardar" variant="secondary" inline hideMessages>
                          <input type="hidden" name="id" value={r.id} />
                          <FormField label="Presupuesto mensual" name="monthlyBudget" htmlId={`bud-${r.id}`} className="w-40">
                            <input id={`bud-${r.id}`} name="monthlyBudget" inputMode="decimal" defaultValue={r.monthly_budget ?? ""} placeholder="Sin límite" className={inputClass} />
                          </FormField>
                        </ActionForm>
                        <ActionForm action={archiveCategory} submitLabel="Archivar" variant="danger" inline hideMessages
                          confirmMessage={`¿Archivar "${r.name}"? Ya no aparecerá para nuevos gastos; el historial se conserva.`}>
                          <input type="hidden" name="id" value={r.id} />
                        </ActionForm>
                      </div>
                    </details>
                  </div>
                </li>
              ))}
            </ul>
            <details className="border-t border-line px-5 py-4">
              <summary className="cursor-pointer text-sm font-medium text-brand hover:underline">+ Nueva categoría</summary>
              <div className="mt-4">
                <ActionForm action={createCategory} submitLabel="Crear categoría">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Nombre" name="name" htmlId="cat-name">
                      <input id="cat-name" name="name" maxLength={60} placeholder="Ej. Mascotas" className={inputClass} />
                    </FormField>
                    <FormField label="Presupuesto mensual (opcional)" name="monthlyBudget" htmlId="cat-budget">
                      <input id="cat-budget" name="monthlyBudget" inputMode="decimal" placeholder="0.00" className={inputClass} />
                    </FormField>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="isEssential" className="h-4 w-4 accent-[var(--brand)]" /> Es un gasto indispensable
                  </label>
                </ActionForm>
              </div>
            </details>
          </Card>

          {chartData.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-base font-semibold">Gasto por categoría</h2>
              <HorizontalBars label={`Gasto por categoría en ${monthLabel(ctx.month)}`} data={chartData} />
            </Card>
          ) : null}

          <Card id="recurrentes" className="scroll-mt-20 p-0">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold">Gastos recurrentes</h2>
              <p className="text-xs text-muted">Renta, servicios, suscripciones. Al registrar el pago, la próxima fecha se calcula sola.</p>
            </div>
            {recurring.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">Aún no tienes gastos recurrentes.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recurring.map((r) => {
                  const days = r.next_due_date ? daysBetween(ctx.today, r.next_due_date) : null;
                  return (
                    <li key={r.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-muted">
                            {label(FREQUENCY_LABEL, r.frequency)}
                            {r.category_id && categoryName.get(r.category_id) ? ` · ${categoryName.get(r.category_id)}` : ""}
                            {r.next_due_date ? ` · próximo: ${formatDate(r.next_due_date)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {days !== null && days < 0 ? <Badge tone="negative">Vencido</Badge> : days !== null && days <= 7 ? <Badge tone="info">En {days} día{days === 1 ? "" : "s"}</Badge> : null}
                          <span className="num font-semibold">{formatMXN(r.amount)}</span>
                        </div>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-brand hover:underline">Registrar pago o quitar</summary>
                        <div className="mt-3 flex flex-wrap items-end gap-3">
                          <ActionForm action={payRecurring} submitLabel="Registrar pago" variant="secondary" inline hideMessages>
                            <input type="hidden" name="id" value={r.id} />
                            <FormField label="Monto" name="amount" htmlId={`pay-amt-${r.id}`} className="w-32">
                              <input id={`pay-amt-${r.id}`} name="amount" inputMode="decimal" defaultValue={r.amount} className={inputClass} />
                            </FormField>
                            <FormField label="Fecha" name="paidOn" htmlId={`pay-date-${r.id}`} className="w-40">
                              <input id={`pay-date-${r.id}`} name="paidOn" type="date" defaultValue={ctx.today} max={ctx.today} className={inputClass} />
                            </FormField>
                            <FormField label="Cuenta" name="accountId" htmlId={`pay-acc-${r.id}`} className="w-44">
                              <select id={`pay-acc-${r.id}`} name="accountId" defaultValue={accounts[0]?.id ?? ""} className={inputClass}>
                                <option value="">Sin cuenta</option>
                                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                            </FormField>
                          </ActionForm>
                          <ActionForm action={deleteRecurring} submitLabel="Quitar" variant="danger" inline hideMessages
                            confirmMessage={`¿Quitar "${r.name}" de tus gastos recurrentes? Los pagos ya registrados se conservan.`}>
                            <input type="hidden" name="id" value={r.id} />
                          </ActionForm>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
            <details className="border-t border-line px-5 py-4">
              <summary className="cursor-pointer text-sm font-medium text-brand hover:underline">+ Agregar gasto recurrente</summary>
              <div className="mt-4">
                <ActionForm action={createRecurring} submitLabel="Agregar">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Nombre" name="name" htmlId="rec-name">
                      <input id="rec-name" name="name" maxLength={80} placeholder="Ej. Internet" className={inputClass} />
                    </FormField>
                    <FormField label="Monto" name="amount" htmlId="rec-amount">
                      <input id="rec-amount" name="amount" inputMode="decimal" placeholder="0.00" className={inputClass} />
                    </FormField>
                    <FormField label="Frecuencia" name="frequency" htmlId="rec-freq">
                      <select id="rec-freq" name="frequency" defaultValue="mensual" className={inputClass}>
                        {["semanal", "quincenal", "mensual", "bimestral", "trimestral", "anual"].map((v) => <option key={v} value={v}>{FREQUENCY_LABEL[v]}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Próximo pago" name="nextDueDate" htmlId="rec-date">
                      <input id="rec-date" name="nextDueDate" type="date" defaultValue={ctx.today} className={inputClass} />
                    </FormField>
                    <FormField label="Categoría" name="categoryId" htmlId="rec-cat">
                      <select id="rec-cat" name="categoryId" defaultValue={categories.find((c) => c.name === "Servicios")?.id ?? ""} className={inputClass}>
                        <option value="">Sin categoría</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </FormField>
                    <label className="flex items-center gap-2 self-center text-sm">
                      <input type="checkbox" name="isEssential" defaultChecked className="h-4 w-4 accent-[var(--brand)]" /> Es indispensable
                    </label>
                  </div>
                </ActionForm>
              </div>
            </details>
          </Card>

          <Card className="p-0">
            <h2 className="border-b border-line px-5 py-4 text-base font-semibold">Historial de {monthLabel(ctx.month)}</h2>
            {txs.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted">No hay gastos registrados en este mes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted">
                    <tr><th className="px-5 py-2 font-medium">Fecha</th><th className="py-2 font-medium">Concepto</th><th className="py-2 font-medium">Cuenta</th><th className="py-2 text-right font-medium">Monto</th><th className="px-5 py-2" /></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {txs.map((t) => (
                      <tr key={t.id}>
                        <td className="num whitespace-nowrap px-5 py-3 text-muted">{formatDate(t.occurred_on)}</td>
                        <td className="py-3">
                          <p>{t.description ?? (t.category_id ? categoryName.get(t.category_id) : null) ?? "Gasto"}</p>
                          <p className="text-xs text-muted">
                            {t.category_id ? categoryName.get(t.category_id) ?? "Categoría archivada" : "Sin categoría"}
                            {t.recurring_expense_id ? " · recurrente" : ""}
                          </p>
                        </td>
                        <td className="py-3 text-muted">{t.account_id ? accountName.get(t.account_id) ?? "—" : "—"}</td>
                        <td className="num py-3 text-right font-medium">{formatMXN(t.amount)}</td>
                        <td className="px-5 py-3 text-right">
                          <ActionForm action={deleteTransaction} submitLabel="Borrar" pendingLabel="…" variant="danger" inline hideMessages
                            confirmMessage="¿Borrar este gasto? Si estaba ligado a una cuenta, el dinero regresa a su saldo.">
                            <input type="hidden" name="id" value={t.id} />
                          </ActionForm>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <h2 className="mb-4 text-base font-semibold">Registrar gasto</h2>
          <ActionForm action={recordExpense} submitLabel="Registrar gasto">
            <FormField label="Monto" name="amount" htmlId="exp-amount">
              <input id="exp-amount" name="amount" inputMode="decimal" placeholder="0.00" className={inputClass} />
            </FormField>
            <FormField label="Fecha" name="occurredOn" htmlId="exp-date">
              <input id="exp-date" name="occurredOn" type="date" defaultValue={isCurrent ? ctx.today : `${ctx.month}-01`} max={ctx.today} className={inputClass} />
            </FormField>
            <FormField label="Categoría" name="categoryId" htmlId="exp-cat">
              <select id="exp-cat" name="categoryId" defaultValue="" className={inputClass}>
                <option value="" disabled>Elige una categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="¿Con qué cuenta pagaste?" name="accountId" htmlId="exp-account" hint="Si eliges una, se descuenta sola. Pagos con tarjeta de crédito: Fase 3.">
              <select id="exp-account" name="accountId" defaultValue={accounts[0]?.id ?? ""} className={inputClass}>
                <option value="">No ligar a una cuenta</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatMXN(a.balance)})</option>)}
              </select>
            </FormField>
            <FormField label="Descripción (opcional)" name="description" htmlId="exp-desc">
              <input id="exp-desc" name="description" maxLength={300} placeholder="Ej. Súper de la semana" className={inputClass} />
            </FormField>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
