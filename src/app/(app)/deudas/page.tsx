import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard, Trophy } from "lucide-react";
import { ActionForm, FormField } from "@/components/action-form";
import { BudgetBar } from "@/components/budget-bar";
import { PaymentStateBadge } from "@/components/payment-state";
import { Stat } from "@/components/stat";
import { Badge, buttonClass, Card, cn, inputClass, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/data/profile";
import { getDebts, totalDebt } from "@/lib/data/debts";
import { financeContext } from "@/lib/data/finance";
import { formatDate } from "@/lib/dates";
import { compareStrategies, type PayoffResult } from "@/lib/finance/debt-strategy";
import { formatDuration } from "@/lib/finance/months";
import { debtNextPayment } from "@/lib/finance/schedule";
import { DEBT_TYPE_LABEL, label } from "@/lib/labels";
import { formatMXN, money, parseMoneyInput, sum } from "@/lib/money";
import { createDebt } from "./actions";

export const metadata: Metadata = { title: "Deudas" };

const PER_PAYDAY: Record<string, { div: number; label: string }> = {
  semanal: { div: 52 / 12, label: "por semana" },
  quincenal: { div: 2, label: "por quincena" },
  mensual: { div: 1, label: "al mes" },
  variable: { div: 1, label: "al mes" },
};

function StrategyColumn({ title, result, recommended, help }: { title: string; result: PayoffResult; recommended?: boolean; help: string }) {
  return (
    <div className={cn("rounded-xl border p-4", recommended ? "border-brand bg-brand/5" : "border-line")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        {recommended ? <Badge tone="brand"><Trophy className="mr-1 h-3 w-3" aria-hidden="true" />Recomendada</Badge> : null}
      </div>
      <p className="mt-1 text-xs text-muted">{help}</p>
      {result.feasible ? (
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Libre de deudas en</dt><dd className="font-medium">{formatDuration(result.months ?? 0)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Intereses totales</dt><dd className="num font-medium text-negative">{formatMXN(result.totalInterest)}</dd></div>
          {result.order.length > 1 ? (
            <div className="pt-2">
              <dt className="text-xs text-muted">Orden en que se liquidan</dt>
              <dd><ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs">{result.order.map((o) => <li key={o.id}>{o.name} · mes {o.month}</li>)}</ol></dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-negative">{result.reason}</p>
      )}
    </div>
  );
}

export default async function DeudasPage({ searchParams }: PageProps<"/deudas">) {
  const params = await searchParams;
  const [ctx, profile] = await Promise.all([financeContext(), requireProfile()]);
  const debts = await getDebts(ctx);
  const total = totalDebt(debts);
  const minimums = sum(debts.map((d) => d.fixedPayment ?? d.minimumPayment ?? "0"));
  const cards = debts.filter((d) => d.card);
  const cardBalance = sum(cards.map((d) => d.currentBalance));
  const cardLimit = sum(cards.map((d) => d.creditLimit ?? "0"));
  const utilization = cardLimit.gt(0) ? cardBalance.div(cardLimit).mul(100).toDecimalPlaces(0).toNumber() : null;
  const nextPayments = debts.map((d) => debtNextPayment(d, ctx.today)).filter((p) => p !== null).sort((a, b) => a.date.localeCompare(b.date));

  const requested = typeof params.presupuesto === "string" ? parseMoneyInput(params.presupuesto) : null;
  const defaultBudget = minimums.gt(0) ? minimums.mul(1.25).div(100).ceil().mul(100) : money(0);
  const budget = requested && requested.gt(0) ? requested : defaultBudget;
  const strategyDebts = debts.map((d) => ({ id: d.id, name: d.name, balance: d.currentBalance, annualRate: d.annualRate, minPayment: d.fixedPayment ?? d.minimumPayment }));
  const comparison = debts.length ? compareStrategies(strategyDebts, budget) : null;
  const assumed = comparison ? new Set([...comparison.avalancha.assumedMinimums]) : new Set<string>();
  const perPay = PER_PAYDAY[profile.payFrequency] ?? PER_PAYDAY.mensual;

  return (
    <>
      <PageHeader title="Deudas" description="Tarjetas, préstamos y financiamientos. Cuánto debes, cuándo pagar y cómo salir más rápido." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total que debes" value={formatMXN(total)} tone={total.gt(0) ? "negative" : undefined} note={`${debts.length} deuda${debts.length === 1 ? "" : "s"} activa${debts.length === 1 ? "" : "s"}`} />
        <Stat label="Pagos mínimos o fijos al mes" value={formatMXN(minimums)} note="Según lo que capturaste" />
        <Stat label="Uso de tus tarjetas" value={utilization === null ? "—" : `${utilization} %`}
          note={cardLimit.gt(0) ? `${formatMXN(cardBalance)} de ${formatMXN(cardLimit)}` : "Sin tarjetas registradas"} />
        <Stat label="Próximo pago" value={nextPayments[0] ? formatDate(nextPayments[0].date) : "—"}
          note={nextPayments[0] ? `${nextPayments[0].title}${nextPayments[0].amount ? ` · ${formatMXN(nextPayments[0].amount)}` : ""}` : "Nada programado"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          {debts.length === 0 ? (
            <Card className="flex flex-col items-center gap-2 py-12 text-center">
              <CreditCard className="h-8 w-8 text-muted" aria-hidden="true" />
              <p className="font-medium">No tienes deudas registradas</p>
              <p className="max-w-sm text-sm text-muted">Si tienes tarjetas o préstamos, agrégalos con el formulario. Si no tienes, ¡excelente!</p>
            </Card>
          ) : (
            <ul className="space-y-4">
              {debts.map((d) => {
                const next = debtNextPayment(d, ctx.today);
                const use = d.creditLimit && money(d.creditLimit).gt(0) ? money(d.currentBalance).div(d.creditLimit).mul(100).toDecimalPlaces(0).toNumber() : null;
                return (
                  <li key={d.id}>
                    <Card>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{d.name}</p>
                          <p className="text-xs text-muted">{d.institution} · {label(DEBT_TYPE_LABEL, d.debtType)}{d.annualRate ? ` · ${Number(d.annualRate)} % anual` : " · tasa no capturada"}</p>
                        </div>
                        <p className="num text-xl font-semibold">{formatMXN(d.currentBalance)}</p>
                      </div>
                      {d.card && use !== null ? (
                        <div className="mt-3">
                          <BudgetBar percent={use} level={use > 90 ? "excedido" : use >= 70 ? "aviso" : "ok"} />
                          <p className="mt-1 text-xs text-muted">Usas {use} % de {formatMXN(d.creditLimit!)} · corte día {d.card.statementDay} · límite de pago día {d.card.paymentDueDay}</p>
                        </div>
                      ) : null}
                      {next ? (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                          <span>
                            Próximo pago: <strong>{formatDate(next.date)}</strong>
                            {next.amount ? <> · <span className="num">{formatMXN(next.amount)}</span></> : null}
                            {next.minimum && next.amount && !next.minimum.eq(next.amount) ? <span className="text-xs text-muted"> (mínimo {formatMXN(next.minimum)})</span> : null}
                            {next.note && !next.amount ? <span className="block text-xs text-muted">{next.note}</span> : null}
                          </span>
                          <PaymentStateBadge state={next.state} estimated={next.estimated} />
                        </div>
                      ) : null}
                      <Link href={`/deudas/${d.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                        Ver detalle y registrar pagos <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}

          {comparison ? (
            <Card id="estrategia" className="scroll-mt-20">
              <h2 className="text-base font-semibold">¿Qué deuda pagar primero?</h2>
              <p className="mt-1 text-sm text-muted">Compara cuánto tardas y cuánto pagas de intereses según cuánto destines al mes a tus deudas.</p>
              <form method="get" action="/deudas#estrategia" className="mt-4 flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="presupuesto" className="block text-sm font-medium">Puedo destinar al mes</label>
                  <input id="presupuesto" name="presupuesto" inputMode="decimal" defaultValue={budget.toFixed(2)} className={cn(inputClass, "w-40")} />
                </div>
                <button type="submit" className={buttonClass.secondary}>Calcular</button>
                <p className="w-full text-xs text-muted">
                  Eso equivale a separar <strong className="text-fg">{formatMXN(budget.div(perPay.div))}</strong> {perPay.label}. Mínimos sumados: {formatMXN(minimums)}.
                </p>
              </form>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <StrategyColumn title="Solo pagos mínimos" result={comparison.minimos} help="Pagar únicamente el mínimo de cada deuda." />
                <StrategyColumn title="Avalancha" result={comparison.avalancha} recommended={comparison.recommended === "avalancha"} help="El extra va a la deuda con la tasa más alta. Pagas menos intereses." />
                <StrategyColumn title="Bola de nieve" result={comparison.bola} recommended={comparison.recommended === "bola_de_nieve"} help="El extra va a la deuda más chica. Liquidas deudas antes y te motiva." />
              </div>
              {comparison.interestSaved && comparison.interestSaved.gt(0) ? (
                <p className="mt-3 text-sm">Con la estrategia recomendada te ahorras <strong className="text-positive">{formatMXN(comparison.interestSaved)}</strong> de intereses frente a pagar solo mínimos.</p>
              ) : !comparison.minimos.feasible && comparison.recommended ? (
                <p className="mt-3 text-sm">Pagando solo mínimos no terminarías de pagar. Con la estrategia recomendada sí sales de deudas.</p>
              ) : null}
              <p className="mt-3 text-xs text-muted">
                Estimación: interés mensual = tasa anual ÷ 12, sin IVA de intereses, comisiones ni compras nuevas.
                {assumed.size ? ` A ${assumed.size} deuda${assumed.size === 1 ? "" : "s"} sin pago mínimo capturado se le supuso 3 % del saldo.` : ""}
                {debts.some((d) => !d.annualRate) ? " Las deudas sin tasa capturada se calcularon sin intereses." : ""}
              </p>
            </Card>
          ) : null}
        </div>

        <Card className="h-fit">
          <h2 className="mb-1 text-base font-semibold">Agregar deuda</h2>
          <p className="mb-4 text-xs text-muted">Copia los datos de tu estado de cuenta o contrato. Nunca escribas el número de tarjeta, CVV ni NIP.</p>
          <ActionForm action={createDebt} submitLabel="Agregar deuda">
            <FormField label="Tipo" name="debtType" htmlId="d-type">
              <select id="d-type" name="debtType" defaultValue="tarjeta_credito" className={inputClass}>
                {Object.entries(DEBT_TYPE_LABEL).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Institución" name="institution" htmlId="d-inst">
                <input id="d-inst" name="institution" maxLength={80} placeholder="Ej. BBVA" className={inputClass} />
              </FormField>
              <FormField label="Nombre" name="name" htmlId="d-name">
                <input id="d-name" name="name" maxLength={80} placeholder="Ej. Tarjeta Oro" className={inputClass} />
              </FormField>
            </div>
            <FormField label="Saldo que debes hoy" name="currentBalance" htmlId="d-bal">
              <input id="d-bal" name="currentBalance" inputMode="decimal" placeholder="0.00" className={inputClass} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tasa de interés anual %" name="annualRate" htmlId="d-rate" hint="Viene en tu estado de cuenta">
                <input id="d-rate" name="annualRate" inputMode="decimal" placeholder="Ej. 54.5" className={inputClass} />
              </FormField>
              <FormField label="Pago mínimo" name="minimumPayment" htmlId="d-min">
                <input id="d-min" name="minimumPayment" inputMode="decimal" placeholder="0.00" className={inputClass} />
              </FormField>
            </div>
            <fieldset className="space-y-3 rounded-xl border border-line p-3">
              <legend className="px-1 text-xs font-medium text-muted">Solo si es tarjeta de crédito</legend>
              <FormField label="Límite de crédito" name="creditLimit" htmlId="d-limit">
                <input id="d-limit" name="creditLimit" inputMode="decimal" placeholder="0.00" className={inputClass} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Día de corte" name="statementDay" htmlId="d-cut">
                  <input id="d-cut" name="statementDay" inputMode="numeric" placeholder="Ej. 5" className={inputClass} />
                </FormField>
                <FormField label="Día límite de pago" name="cardDueDay" htmlId="d-due">
                  <input id="d-due" name="cardDueDay" inputMode="numeric" placeholder="Ej. 25" className={inputClass} />
                </FormField>
              </div>
            </fieldset>
            <fieldset className="space-y-3 rounded-xl border border-line p-3">
              <legend className="px-1 text-xs font-medium text-muted">Solo si es préstamo o financiamiento</legend>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Pago fijo mensual" name="fixedPayment" htmlId="d-fixed">
                  <input id="d-fixed" name="fixedPayment" inputMode="decimal" placeholder="0.00" className={inputClass} />
                </FormField>
                <FormField label="Día de pago" name="paymentDueDay" htmlId="d-pday">
                  <input id="d-pday" name="paymentDueDay" inputMode="numeric" placeholder="Ej. 10" className={inputClass} />
                </FormField>
              </div>
            </fieldset>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
