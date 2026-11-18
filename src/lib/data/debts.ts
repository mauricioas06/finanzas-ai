import "server-only";
import { addDays } from "@/lib/finance/billing";
import type { CycleInfo, DebtSchedule } from "@/lib/finance/schedule";
import { money, sum } from "@/lib/money";
import type { financeContext } from "./finance";

type Ctx = Awaited<ReturnType<typeof financeContext>>;

export interface DebtView extends DebtSchedule {
  currentBalance: string;
  originalAmount: string | null;
  annualRate: string | null;
  notes: string | null;
  createdAt: string;
  cardId: string | null;
  creditLimit: string | null;
}

function must<T>(scope: string, res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) {
    console.error(`[datos:${scope}]`, res.error.message);
    throw new Error("No se pudieron cargar tus deudas. Recarga la página.");
  }
  return res.data as T;
}

/** Deudas con su tarjeta, estados de cuenta recientes y abonos por ciclo. */
export async function getDebts(ctx: Ctx, opts: { includeLiquidated?: boolean } = {}): Promise<DebtView[]> {
  const { supabase, userId, today } = ctx;
  const since = addDays(today, -400);

  let debtQuery = supabase
    .from("debts")
    .select("id, debt_type, institution, name, current_balance::text, original_amount::text, annual_interest_rate::text, minimum_payment::text, fixed_payment::text, payment_due_day, status, notes, created_at")
    .eq("user_id", userId)
    .order("created_at");
  if (!opts.includeLiquidated) debtQuery = debtQuery.neq("status", "liquidada");

  const [debts, cards, cycles, abonos] = await Promise.all([
    debtQuery,
    supabase.from("credit_cards").select("id, debt_id, credit_limit::text, statement_day, payment_due_day").eq("user_id", userId),
    supabase.from("billing_cycles")
      .select("id, credit_card_id, period_start, statement_date, payment_due_date, statement_balance::text, minimum_payment::text, no_interest_payment::text, status")
      .eq("user_id", userId).gte("statement_date", since).order("statement_date", { ascending: false }),
    supabase.from("debt_payments").select("debt_id, billing_cycle_id, amount::text, occurred_on")
      .eq("user_id", userId).eq("kind", "abono").gte("occurred_on", since),
  ]);

  const debtRows = must("deudas", debts);
  const cardRows = must("tarjetas", cards);
  const cycleRows = must("ciclos", cycles);
  const abonoRows = must("abonos", abonos);

  const cardByDebt = new Map(cardRows.map((c) => [c.debt_id, c]));
  const paidByCycle: Record<string, string> = {};
  const lastPayment = new Map<string, string>();
  for (const a of abonoRows) {
    if (a.billing_cycle_id) paidByCycle[a.billing_cycle_id] = money(paidByCycle[a.billing_cycle_id] ?? "0").plus(a.amount).toFixed(2);
    const prev = lastPayment.get(a.debt_id);
    if (!prev || a.occurred_on > prev) lastPayment.set(a.debt_id, a.occurred_on);
  }

  return debtRows.map((d) => {
    const card = cardByDebt.get(d.id) ?? null;
    const debtCycles: CycleInfo[] = card ? cycleRows.filter((c) => c.credit_card_id === card.id) : [];
    return {
      id: d.id,
      name: d.name,
      institution: d.institution,
      debtType: d.debt_type,
      status: d.status,
      minimumPayment: d.minimum_payment,
      fixedPayment: d.fixed_payment,
      paymentDueDay: d.payment_due_day,
      card: card ? { statementDay: card.statement_day, paymentDueDay: card.payment_due_day } : null,
      cycles: debtCycles,
      paidByCycle: Object.fromEntries(debtCycles.map((c) => [c.id, paidByCycle[c.id] ?? "0.00"])),
      lastPaymentOn: lastPayment.get(d.id) ?? null,
      currentBalance: d.current_balance,
      originalAmount: d.original_amount,
      annualRate: d.annual_interest_rate,
      notes: d.notes,
      createdAt: d.created_at,
      cardId: card?.id ?? null,
      creditLimit: card?.credit_limit ?? null,
    };
  });
}

export function totalDebt(debts: DebtView[]) {
  return sum(debts.filter((d) => d.status !== "liquidada").map((d) => d.currentBalance));
}

export async function getDebtMovements({ supabase, userId }: Ctx, debtId: string) {
  return must("movimientos-deuda", await supabase
    .from("debt_payments")
    .select("id, kind, amount::text, occurred_on, notes, billing_cycle_id, transaction_id, created_at")
    .eq("user_id", userId)
    .eq("debt_id", debtId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200));
}

/**
 * Saldo de las deudas al final de cada mes, reconstruido desde el saldo actual
 * restando los movimientos posteriores. Solo cuenta cada deuda desde que se registró.
 */
export async function getDebtHistory(ctx: Ctx, debts: DebtView[], monthEnds: string[]) {
  const { supabase, userId } = ctx;
  const first = monthEnds[0];
  const rows = must("historial-deudas", await supabase
    .from("debt_payments")
    .select("debt_id, kind, amount::text, occurred_on")
    .eq("user_id", userId)
    .gt("occurred_on", first));
  return monthEnds.map((end) => {
    let total = money(0);
    for (const d of debts) {
      if (d.createdAt.slice(0, 10) > end) continue;
      let balance = money(d.currentBalance);
      for (const r of rows) {
        if (r.debt_id !== d.id || r.occurred_on <= end) continue;
        const delta = r.kind === "abono" ? money(r.amount).neg() : money(r.amount);
        balance = balance.minus(delta);
      }
      total = total.plus(balance.isNegative() ? 0 : balance);
    }
    return { end, total: total.toFixed(2) };
  });
}

export async function getNotifications({ supabase, userId }: Ctx, limit = 20) {
  return must("alertas", await supabase
    .from("notifications")
    .select("id, type, severity, title, body, related_table, related_id, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit));
}

/** Genera las alertas del día (7, 3, 1 día antes y el día del vencimiento). Idempotente. */
export async function syncAlerts({ supabase }: Ctx) {
  const { error } = await supabase.rpc("sync_payment_alerts");
  if (error) console.error("[alertas] sync", error.message);
}
