import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PiggyBank } from "lucide-react";
import { ActionForm, FormField } from "@/components/action-form";
import { PaymentStateBadge } from "@/components/payment-state";
import { Stat } from "@/components/stat";
import { Badge, Card, inputClass, PageHeader } from "@/components/ui";
import { getDebtMovements, getDebts } from "@/lib/data/debts";
import { financeContext, getAccounts, getCategories } from "@/lib/data/finance";
import { requireProfile } from "@/lib/data/profile";
import { formatDate } from "@/lib/dates";
import { cycleState, cycleTarget, paydaysUntil, perPayday, suggestCycle } from "@/lib/finance/billing";
import { debtNextPayment } from "@/lib/finance/schedule";
import { DEBT_MOVEMENT_LABEL, DEBT_TYPE_LABEL, FREQUENCY_LABEL, label } from "@/lib/labels";
import { formatMXN, money } from "@/lib/money";
import {
  addCharge, cardPurchase, correctBalance, deleteCycle, deleteDebt, deleteMovement, payDebt, saveCycle,
  updateCardSettings, updateDebtSettings,
} from "../actions";

export const metadata: Metadata = { title: "Detalle de deuda" };

export default async function DeudaDetallePage({ params }: PageProps<"/deudas/[id]">) {
  const { id } = await params;
  const [ctx, profile] = await Promise.all([financeContext(), requireProfile()]);
  const debts = await getDebts(ctx, { includeLiquidated: true });
  const d = debts.find((x) => x.id === id);
  if (!d) notFound();

  const [movements, accounts, categories] = await Promise.all([getDebtMovements(ctx, d.id), getAccounts(ctx), getCategories(ctx)]);
  const next = debtNextPayment(d, ctx.today);
  const paydays = next ? paydaysUntil(ctx.today, next.date, profile.payFrequency) : 1;
  const unpaidCycles = d.cycles.filter((c) => cycleState(c, d.paidByCycle[c.id] ?? "0", ctx.today) !== "pagado");
  const suggestion = d.card ? suggestCycle(ctx.today, d.card.statementDay, d.card.paymentDueDay) : null;
  const use = d.creditLimit && money(d.creditLimit).gt(0) ? money(d.currentBalance).div(d.creditLimit).mul(100).toDecimalPlaces(0).toNumber() : null;
  const payDefault = next?.amount && next.amount.gt(0) ? next.amount.toFixed(2) : "";

  return (
    <>
      <Link href="/deudas" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Todas las deudas</Link>
      <PageHeader
        title={d.name}
        description={`${d.institution} · ${label(DEBT_TYPE_LABEL, d.debtType)}`}
        action={d.status === "liquidada" ? <Badge tone="positive">Liquidada</Badge> : <Badge tone="negative">Activa</Badge>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Saldo actual" value={formatMXN(d.currentBalance)} tone={money(d.currentBalance).gt(0) ? "negative" : "positive"} />
        <Stat label="Tasa de interés anual" value={d.annualRate ? `${Number(d.annualRate)} %` : "No capturada"} note={d.annualRate ? `≈ ${(Number(d.annualRate) / 12).toFixed(2)} % al mes` : undefined} />
        <Stat label={d.fixedPayment ? "Pago fijo" : "Pago mínimo"} value={d.fixedPayment ?? d.minimumPayment ? formatMXN((d.fixedPayment ?? d.minimumPayment)!) : "—"} />
        <Stat label={d.card ? "Límite de crédito" : "Monto original"} value={d.card ? formatMXN(d.creditLimit ?? "0") : d.originalAmount ? formatMXN(d.originalAmount) : "—"}
          note={use !== null ? `Usas ${use} %` : undefined} />
      </div>

      {next ? (
        <Card className="mb-6 border-brand/30">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-brand">PRÓXIMO PAGO</h2>
              <p className="mt-1 text-lg font-semibold">{formatDate(next.date)}{next.amount ? <> · <span className="num">{formatMXN(next.amount)}</span></> : null}</p>
              {next.note ? <p className="text-xs text-muted">{next.note}</p> : null}
              {next.minimum && next.amount && !next.minimum.eq(next.amount) ? (
                <p className="text-xs text-muted">Si solo pagas el mínimo ({formatMXN(next.minimum)}), el resto generará intereses.</p>
              ) : null}
            </div>
            <PaymentStateBadge state={next.state} estimated={next.estimated} />
          </div>
          {next.amount && next.amount.gt(0) && next.state !== "vencido" ? (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
              <PiggyBank className="h-4 w-4 text-brand" aria-hidden="true" />
              Para pagarlo a tiempo separa <strong className="num">{formatMXN(perPayday(next.amount, paydays))}</strong>
              {paydays > 1 ? ` en cada uno de tus próximos ${paydays} cobros (${label(FREQUENCY_LABEL, profile.payFrequency).toLowerCase()})` : " de tu próximo cobro"}.
            </p>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          {d.card ? (
            <Card className="p-0">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-base font-semibold">Estados de cuenta</h2>
                <p className="text-xs text-muted">Cada mes captura lo que dice tu estado de cuenta. Fecha de corte y fecha límite son distintas; también el pago mínimo y el pago para no generar intereses.</p>
              </div>
              {d.cycles.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">Aún no capturas estados de cuenta de esta tarjeta.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted">
                      <tr><th className="px-5 py-2 font-medium">Corte</th><th className="py-2 font-medium">Fecha límite</th><th className="py-2 text-right font-medium">Mínimo</th><th className="py-2 text-right font-medium">Sin intereses</th><th className="py-2 text-right font-medium">Pagado</th><th className="py-2 font-medium">Estado</th><th className="px-5 py-2" /></tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {d.cycles.map((c) => {
                        const paid = d.paidByCycle[c.id] ?? "0.00";
                        return (
                          <tr key={c.id}>
                            <td className="num whitespace-nowrap px-5 py-3">{formatDate(c.statement_date)}</td>
                            <td className="num whitespace-nowrap py-3 font-medium">{formatDate(c.payment_due_date)}</td>
                            <td className="num py-3 text-right">{c.minimum_payment ? formatMXN(c.minimum_payment) : "—"}</td>
                            <td className="num py-3 text-right">{cycleTarget(c) ? formatMXN(cycleTarget(c)!) : "—"}</td>
                            <td className="num py-3 text-right">{formatMXN(paid)}</td>
                            <td className="py-3"><PaymentStateBadge state={cycleState(c, paid, ctx.today)} /></td>
                            <td className="px-5 py-3 text-right">
                              <ActionForm action={deleteCycle} submitLabel="Borrar" pendingLabel="…" variant="danger" inline hideMessages
                                confirmMessage="¿Borrar este estado de cuenta? Los pagos registrados se conservan.">
                                <input type="hidden" name="id" value={c.id} />
                              </ActionForm>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {suggestion && d.cardId ? (
                <details className="border-t border-line px-5 py-4" open={d.cycles.length === 0}>
                  <summary className="cursor-pointer text-sm font-medium text-brand hover:underline">+ Capturar estado de cuenta</summary>
                  <p className="mt-2 text-xs text-muted">Las fechas vienen sugeridas por tus días de corte y de pago. Corrígelas si tu estado de cuenta dice otra cosa.</p>
                  <div className="mt-4">
                    <ActionForm action={saveCycle} submitLabel="Guardar estado de cuenta">
                      <input type="hidden" name="debtId" value={d.id} />
                      <input type="hidden" name="cardId" value={d.cardId} />
                      <div className="grid gap-4 sm:grid-cols-3">
                        <FormField label="Inicio del periodo" name="periodStart" htmlId="c-start">
                          <input id="c-start" name="periodStart" type="date" defaultValue={suggestion.periodStart} className={inputClass} />
                        </FormField>
                        <FormField label="Fecha de corte" name="statementDate" htmlId="c-cut">
                          <input id="c-cut" name="statementDate" type="date" defaultValue={suggestion.statementDate} className={inputClass} />
                        </FormField>
                        <FormField label="Fecha límite de pago" name="paymentDueDate" htmlId="c-due">
                          <input id="c-due" name="paymentDueDate" type="date" defaultValue={suggestion.paymentDueDate} className={inputClass} />
                        </FormField>
                        <FormField label="Saldo al corte" name="statementBalance" htmlId="c-bal">
                          <input id="c-bal" name="statementBalance" inputMode="decimal" placeholder="0.00" className={inputClass} />
                        </FormField>
                        <FormField label="Pago mínimo" name="minimumPayment" htmlId="c-min">
                          <input id="c-min" name="minimumPayment" inputMode="decimal" placeholder="0.00" className={inputClass} />
                        </FormField>
                        <FormField label="Pago para no generar intereses" name="noInterestPayment" htmlId="c-noint">
                          <input id="c-noint" name="noInterestPayment" inputMode="decimal" placeholder="0.00" className={inputClass} />
                        </FormField>
                        <FormField label="Intereses cobrados (opcional)" name="interestCharged" htmlId="c-int">
                          <input id="c-int" name="interestCharged" inputMode="decimal" placeholder="0.00" className={inputClass} />
                        </FormField>
                        <FormField label="Comisiones cobradas (opcional)" name="feesCharged" htmlId="c-fee">
                          <input id="c-fee" name="feesCharged" inputMode="decimal" placeholder="0.00" className={inputClass} />
                        </FormField>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="addCharges" defaultChecked className="h-4 w-4 accent-[var(--brand)]" />
                        Sumar intereses y comisiones al saldo de la deuda
                      </label>
                    </ActionForm>
                  </div>
                </details>
              ) : null}
            </Card>
          ) : null}

          <Card className="p-0">
            <h2 className="border-b border-line px-5 py-4 text-base font-semibold">Historial de movimientos</h2>
            {movements.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">Sin movimientos todavía.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted">
                    <tr><th className="px-5 py-2 font-medium">Fecha</th><th className="py-2 font-medium">Tipo</th><th className="py-2 font-medium">Nota</th><th className="py-2 text-right font-medium">Monto</th><th className="px-5 py-2" /></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {movements.map((m) => {
                      const lowers = m.kind === "abono" || (m.kind === "ajuste" && money(m.amount).isNegative());
                      return (
                        <tr key={m.id}>
                          <td className="num whitespace-nowrap px-5 py-3 text-muted">{formatDate(m.occurred_on)}</td>
                          <td className="py-3">{label(DEBT_MOVEMENT_LABEL, m.kind)}{m.transaction_id && m.kind === "abono" ? <span className="text-xs text-muted"> · desde cuenta</span> : null}</td>
                          <td className="py-3 text-muted">{m.notes ?? "—"}</td>
                          <td className={`num py-3 text-right font-medium ${lowers ? "text-positive" : "text-negative"}`}>
                            {lowers ? "−" : "+"}{formatMXN(money(m.amount).abs())}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <ActionForm action={deleteMovement} submitLabel="Borrar" pendingLabel="…" variant="danger" inline hideMessages
                              confirmMessage={m.transaction_id ? "¿Borrar este movimiento? También se borrará el gasto o pago ligado y se ajustarán los saldos." : "¿Borrar este movimiento? El saldo de la deuda se ajustará."}>
                              <input type="hidden" name="id" value={m.id} />
                            </ActionForm>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold">Datos de la deuda</h2>
            <div className="space-y-6">
              <ActionForm action={updateDebtSettings} submitLabel="Guardar datos" variant="secondary">
                <input type="hidden" name="id" value={d.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Tasa de interés anual %" name="annualRate" htmlId="s-rate">
                    <input id="s-rate" name="annualRate" inputMode="decimal" defaultValue={d.annualRate ? String(Number(d.annualRate)) : ""} className={inputClass} />
                  </FormField>
                  <FormField label="Pago mínimo" name="minimumPayment" htmlId="s-min">
                    <input id="s-min" name="minimumPayment" inputMode="decimal" defaultValue={d.minimumPayment ?? ""} className={inputClass} />
                  </FormField>
                  {!d.card ? (
                    <>
                      <FormField label="Pago fijo mensual" name="fixedPayment" htmlId="s-fixed">
                        <input id="s-fixed" name="fixedPayment" inputMode="decimal" defaultValue={d.fixedPayment ?? ""} className={inputClass} />
                      </FormField>
                      <FormField label="Día de pago" name="paymentDueDay" htmlId="s-day">
                        <input id="s-day" name="paymentDueDay" inputMode="numeric" defaultValue={d.paymentDueDay ?? ""} className={inputClass} />
                      </FormField>
                    </>
                  ) : null}
                </div>
              </ActionForm>
              {d.card && d.cardId ? (
                <ActionForm action={updateCardSettings} submitLabel="Guardar datos de la tarjeta" variant="secondary">
                  <input type="hidden" name="cardId" value={d.cardId} />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField label="Límite de crédito" name="creditLimit" htmlId="s-limit">
                      <input id="s-limit" name="creditLimit" inputMode="decimal" defaultValue={d.creditLimit ?? ""} className={inputClass} />
                    </FormField>
                    <FormField label="Día de corte" name="statementDay" htmlId="s-cut">
                      <input id="s-cut" name="statementDay" inputMode="numeric" defaultValue={d.card.statementDay} className={inputClass} />
                    </FormField>
                    <FormField label="Día límite de pago" name="cardDueDay" htmlId="s-due">
                      <input id="s-due" name="cardDueDay" inputMode="numeric" defaultValue={d.card.paymentDueDay} className={inputClass} />
                    </FormField>
                  </div>
                </ActionForm>
              ) : null}
              <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4">
                <ActionForm action={correctBalance} submitLabel="Corregir saldo" variant="secondary" inline>
                  <input type="hidden" name="debtId" value={d.id} />
                  <FormField label="Saldo real según tu banco" name="newBalance" htmlId="s-real" className="w-48">
                    <input id="s-real" name="newBalance" inputMode="decimal" defaultValue={d.currentBalance} className={inputClass} />
                  </FormField>
                </ActionForm>
                <ActionForm action={deleteDebt} submitLabel="Eliminar deuda" variant="danger" inline hideMessages
                  confirmMessage={`¿Eliminar "${d.name}" con todo su historial? Los gastos hechos con ella se conservan. No se puede deshacer.`}>
                  <input type="hidden" name="id" value={d.id} />
                </ActionForm>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {d.status !== "liquidada" ? (
            <Card>
              <h2 className="mb-4 text-base font-semibold">Registrar pago</h2>
              <ActionForm action={payDebt} submitLabel="Registrar pago">
                <input type="hidden" name="debtId" value={d.id} />
                <FormField label="Monto" name="amount" htmlId="p-amount">
                  <input id="p-amount" name="amount" inputMode="decimal" defaultValue={payDefault} placeholder="0.00" className={inputClass} />
                </FormField>
                <FormField label="Fecha" name="paidOn" htmlId="p-date">
                  <input id="p-date" name="paidOn" type="date" defaultValue={ctx.today} max={ctx.today} className={inputClass} />
                </FormField>
                <FormField label="¿De qué cuenta salió?" name="accountId" htmlId="p-acc" hint="Si eliges una, se descuenta de su saldo. No cuenta como gasto.">
                  <select id="p-acc" name="accountId" defaultValue={accounts[0]?.id ?? ""} className={inputClass}>
                    <option value="">No ligar a una cuenta</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatMXN(a.balance)})</option>)}
                  </select>
                </FormField>
                {d.card ? (
                  <FormField label="¿A qué estado de cuenta?" name="cycleId" htmlId="p-cycle">
                    <select id="p-cycle" name="cycleId" defaultValue={unpaidCycles[0]?.id ?? ""} className={inputClass}>
                      <option value="">Ninguno en particular</option>
                      {unpaidCycles.map((c) => <option key={c.id} value={c.id}>Corte {formatDate(c.statement_date)} · límite {formatDate(c.payment_due_date)}</option>)}
                    </select>
                  </FormField>
                ) : null}
              </ActionForm>
            </Card>
          ) : null}

          {d.card ? (
            <Card>
              <h2 className="mb-1 text-base font-semibold">Registrar compra con la tarjeta</h2>
              <p className="mb-4 text-xs text-muted">Cuenta como gasto en su categoría y sube la deuda. También puedes hacerlo desde Gastos.</p>
              <ActionForm action={cardPurchase} submitLabel="Registrar compra">
                <input type="hidden" name="debtId" value={d.id} />
                <FormField label="Monto" name="amount" htmlId="cp-amount">
                  <input id="cp-amount" name="amount" inputMode="decimal" placeholder="0.00" className={inputClass} />
                </FormField>
                <FormField label="Fecha" name="occurredOn" htmlId="cp-date">
                  <input id="cp-date" name="occurredOn" type="date" defaultValue={ctx.today} max={ctx.today} className={inputClass} />
                </FormField>
                <FormField label="Categoría" name="categoryId" htmlId="cp-cat">
                  <select id="cp-cat" name="categoryId" defaultValue="" className={inputClass}>
                    <option value="" disabled>Elige una categoría</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FormField>
                <FormField label="Descripción (opcional)" name="description" htmlId="cp-desc">
                  <input id="cp-desc" name="description" maxLength={300} className={inputClass} />
                </FormField>
              </ActionForm>
            </Card>
          ) : null}

          <Card>
            <h2 className="mb-1 text-base font-semibold">Registrar interés o comisión</h2>
            <p className="mb-4 text-xs text-muted">Cargos que te cobró el banco. Suben la deuda.</p>
            <ActionForm action={addCharge} submitLabel="Registrar cargo" variant="secondary">
              <input type="hidden" name="debtId" value={d.id} />
              <FormField label="Tipo" name="kind" htmlId="ch-kind">
                <select id="ch-kind" name="kind" defaultValue="interes" className={inputClass}>
                  <option value="interes">Interés</option>
                  <option value="comision">Comisión</option>
                </select>
              </FormField>
              <FormField label="Monto" name="amount" htmlId="ch-amount">
                <input id="ch-amount" name="amount" inputMode="decimal" placeholder="0.00" className={inputClass} />
              </FormField>
              <FormField label="Fecha" name="occurredOn" htmlId="ch-date">
                <input id="ch-date" name="occurredOn" type="date" defaultValue={ctx.today} className={inputClass} />
              </FormField>
              <FormField label="Nota (opcional)" name="notes" htmlId="ch-notes">
                <input id="ch-notes" name="notes" maxLength={300} className={inputClass} />
              </FormField>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
