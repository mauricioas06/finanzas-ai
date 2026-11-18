import type { Metadata } from "next";
import { ActionForm, FormField } from "@/components/action-form";
import { MonthNav } from "@/components/month-nav";
import { Stat } from "@/components/stat";
import { Badge, Card, inputClass, PageHeader } from "@/components/ui";
import { deleteTransaction } from "@/lib/actions/transactions";
import { financeContext, getAccounts, getCashflow, getIncomeSources, getMonthTransactions } from "@/lib/data/finance";
import { formatDate } from "@/lib/dates";
import { changePercent } from "@/lib/finance/analysis";
import { monthLabel } from "@/lib/finance/months";
import { FREQUENCY_LABEL, INCOME_TYPE_LABEL, label } from "@/lib/labels";
import { formatMXN, sum } from "@/lib/money";
import { createIncomeSource, deleteIncomeSource, recordIncome } from "./actions";

export const metadata: Metadata = { title: "Ingresos" };

export default async function IngresosPage({ searchParams }: PageProps<"/ingresos">) {
  const ctx = await financeContext((await searchParams).mes);
  const [accounts, sources, txs, flow] = await Promise.all([
    getAccounts(ctx), getIncomeSources(ctx), getMonthTransactions(ctx, ctx.month, "ingreso"), getCashflow(ctx, ctx.month, 2),
  ]);
  const total = sum(txs.map((t) => t.amount));
  const change = changePercent(flow[1].income, flow[0].income);
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const isCurrent = ctx.month === ctx.currentMonth;

  const bySource = new Map<string, string[]>();
  for (const t of txs) {
    const key = t.income_source_id ? sourceName.get(t.income_source_id) ?? "Fuente eliminada" : label(INCOME_TYPE_LABEL, t.income_type);
    bySource.set(key, [...(bySource.get(key) ?? []), t.amount]);
  }

  return (
    <>
      <PageHeader
        title="Ingresos"
        description="Todo el dinero que entra: sueldo, bonos, comisiones, negocios y extras."
        action={<MonthNav basePath="/ingresos" month={ctx.month} currentMonth={ctx.currentMonth} />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat label={`Ingresos de ${monthLabel(ctx.month)}`} value={formatMXN(total)} change={change} tone="positive" />
        <Stat label="Movimientos del mes" value={txs.length} note={bySource.size ? `${bySource.size} fuente${bySource.size === 1 ? "" : "s"}` : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-0">
            <h2 className="border-b border-line px-5 py-4 text-base font-semibold">Historial de {monthLabel(ctx.month)}</h2>
            {txs.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted">No hay ingresos registrados en este mes.</p>
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
                          <p>{t.description ?? (t.income_source_id ? sourceName.get(t.income_source_id) : null) ?? label(INCOME_TYPE_LABEL, t.income_type)}</p>
                          <p className="text-xs text-muted">{label(INCOME_TYPE_LABEL, t.income_type)}{t.income_source_id && sourceName.get(t.income_source_id) ? ` · ${sourceName.get(t.income_source_id)}` : ""}</p>
                        </td>
                        <td className="py-3 text-muted">{t.account_id ? accountName.get(t.account_id) ?? "—" : "—"}</td>
                        <td className="num py-3 text-right font-medium text-positive">{formatMXN(t.amount)}</td>
                        <td className="px-5 py-3 text-right">
                          <ActionForm action={deleteTransaction} submitLabel="Borrar" pendingLabel="…" variant="danger" inline hideMessages
                            confirmMessage="¿Borrar este ingreso? Si estaba ligado a una cuenta, su saldo se ajustará.">
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

          {bySource.size > 0 ? (
            <Card>
              <h2 className="mb-3 text-base font-semibold">Por fuente</h2>
              <ul className="space-y-2 text-sm">
                {[...bySource.entries()].map(([name, amounts]) => (
                  <li key={name} className="flex justify-between gap-3"><span>{name}</span><span className="num font-medium">{formatMXN(sum(amounts))}</span></li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <h2 className="text-base font-semibold">Fuentes de ingreso</h2>
            <p className="mb-4 text-sm text-muted">Tus fuentes habituales. Los ingresos variables no tienen monto fijo: no se supone que se repetirán igual.</p>
            {sources.length > 0 ? (
              <ul className="mb-5 divide-y divide-line rounded-xl border border-line">
                {sources.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted">
                        {label(INCOME_TYPE_LABEL, s.income_type)} · {label(FREQUENCY_LABEL, s.frequency)}
                        {s.pay_days?.length ? ` · días ${s.pay_days.join(", ")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.is_variable || !s.expected_amount ? <Badge tone="info">Variable</Badge> : <span className="num text-sm font-medium">{formatMXN(s.expected_amount)}</span>}
                      <ActionForm action={deleteIncomeSource} submitLabel="Quitar" pendingLabel="…" variant="danger" inline hideMessages
                        confirmMessage={`¿Quitar la fuente "${s.name}"? Los ingresos ya registrados se conservan.`}>
                        <input type="hidden" name="id" value={s.id} />
                      </ActionForm>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            <details>
              <summary className="cursor-pointer text-sm font-medium text-brand hover:underline">+ Agregar fuente de ingreso</summary>
              <div className="mt-4">
                <ActionForm action={createIncomeSource} submitLabel="Agregar fuente">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Nombre" name="name" htmlId="src-name">
                      <input id="src-name" name="name" maxLength={80} placeholder="Ej. Sueldo empresa" className={inputClass} />
                    </FormField>
                    <FormField label="Tipo" name="incomeType" htmlId="src-type">
                      <select id="src-type" name="incomeType" defaultValue="sueldo" className={inputClass}>
                        {Object.entries(INCOME_TYPE_LABEL).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Frecuencia" name="frequency" htmlId="src-freq">
                      <select id="src-freq" name="frequency" defaultValue="quincenal" className={inputClass}>
                        {["semanal", "quincenal", "mensual", "variable", "unica"].map((v) => <option key={v} value={v}>{FREQUENCY_LABEL[v]}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Monto esperado (opcional)" name="expectedAmount" htmlId="src-amount" hint="Déjalo vacío si cambia cada vez.">
                      <input id="src-amount" name="expectedAmount" inputMode="decimal" placeholder="0.00" className={inputClass} />
                    </FormField>
                    <FormField label="Días de pago (opcional)" name="payDays" htmlId="src-days" hint="Ej. 15, 30">
                      <input id="src-days" name="payDays" placeholder="15, 30" className={inputClass} />
                    </FormField>
                    <label className="flex items-center gap-2 self-center text-sm">
                      <input type="checkbox" name="isVariable" className="h-4 w-4 accent-[var(--brand)]" />
                      El monto varía (comisiones, propinas, negocio)
                    </label>
                  </div>
                </ActionForm>
              </div>
            </details>
          </Card>
        </div>

        <Card className="h-fit">
          <h2 className="mb-1 text-base font-semibold">Registrar ingreso</h2>
          <p className="mb-4 text-xs text-muted">El botón «RECIBÍ DINERO», con la distribución de cada peso, llega en la Fase 4.</p>
          <ActionForm action={recordIncome} submitLabel="Registrar ingreso">
            <FormField label="Monto recibido" name="amount" htmlId="inc-amount">
              <input id="inc-amount" name="amount" inputMode="decimal" placeholder="0.00" className={inputClass} />
            </FormField>
            <FormField label="Fecha" name="occurredOn" htmlId="inc-date">
              <input id="inc-date" name="occurredOn" type="date" defaultValue={isCurrent ? ctx.today : `${ctx.month}-01`} max={ctx.today} className={inputClass} />
            </FormField>
            <FormField label="Tipo de ingreso" name="incomeType" htmlId="inc-type">
              <select id="inc-type" name="incomeType" defaultValue="sueldo" className={inputClass}>
                {Object.entries(INCOME_TYPE_LABEL).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Fuente (opcional)" name="incomeSourceId" htmlId="inc-source">
              <select id="inc-source" name="incomeSourceId" defaultValue="" className={inputClass}>
                <option value="">Sin fuente</option>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>
            <FormField label="¿A qué cuenta entró?" name="accountId" htmlId="inc-account" hint="Si eliges una, su saldo sube solo.">
              <select id="inc-account" name="accountId" defaultValue={accounts[0]?.id ?? ""} className={inputClass}>
                <option value="">No ligar a una cuenta</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </FormField>
            <FormField label="Descripción (opcional)" name="description" htmlId="inc-desc">
              <input id="inc-desc" name="description" maxLength={300} placeholder="Ej. Quincena 15 de noviembre" className={inputClass} />
            </FormField>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
