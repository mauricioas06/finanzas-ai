import Decimal from "decimal.js";
import { money, type MoneyInput } from "@/lib/money";
import { addDays, cycleState, cycleTarget, dateOn, lastOnOrBefore, nextOnDay, projectRecurring, type PaymentState } from "./billing";
import { daysInMonth } from "./months";

/**
 * Próximos pagos y calendario. Reglas:
 *  - Montos solo si existen en los datos (estado de cuenta, pago fijo o mínimo capturado).
 *  - Fechas calculadas a partir de días de corte/pago se marcan como "estimada".
 */

export interface CycleInfo {
  id: string;
  period_start: string;
  statement_date: string;
  payment_due_date: string;
  statement_balance: string | null;
  minimum_payment: string | null;
  no_interest_payment: string | null;
  status: string;
}

export interface DebtSchedule {
  id: string;
  name: string;
  institution: string;
  debtType: string;
  status: string;
  minimumPayment: string | null;
  fixedPayment: string | null;
  paymentDueDay: number | null;
  card: { statementDay: number; paymentDueDay: number } | null;
  cycles: CycleInfo[];
  /** Total abonado por ciclo (id → monto). */
  paidByCycle: Record<string, string>;
  /** Fecha del abono más reciente (para préstamos sin estado de cuenta). */
  lastPaymentOn: string | null;
}

export interface RecurringSchedule {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  dueDay: number | null;
  nextDueDate: string | null;
}

export interface IncomeSchedule {
  id: string;
  name: string;
  frequency: string;
  payDays: number[] | null;
  expectedAmount: string | null;
}

export interface UpcomingPayment {
  key: string;
  date: string;
  title: string;
  institution: string | null;
  kind: "tarjeta" | "prestamo" | "recurrente";
  /** Lo recomendado (para tarjetas: pago para no generar intereses menos lo ya pagado). */
  amount: Decimal | null;
  minimum: Decimal | null;
  state: PaymentState;
  estimated: boolean;
  href: string;
  note?: string;
}

const remaining = (target: Decimal | null, paid: MoneyInput) =>
  target === null ? null : Decimal.max(0, target.minus(money(paid)));

/** El estado de cuenta más reciente de una tarjeta. */
export function latestCycle(cycles: CycleInfo[]): CycleInfo | null {
  return [...cycles].sort((a, b) => b.statement_date.localeCompare(a.statement_date))[0] ?? null;
}

export function debtNextPayment(d: DebtSchedule, today: string): UpcomingPayment | null {
  if (d.status === "liquidada") return null;
  const href = `/deudas/${d.id}`;

  if (d.card) {
    const cycle = latestCycle(d.cycles);
    if (cycle) {
      const paid = d.paidByCycle[cycle.id] ?? "0";
      const state = cycleState(cycle, paid, today);
      if (state !== "pagado") {
        return {
          key: `ciclo-${cycle.id}`, date: cycle.payment_due_date, title: d.name, institution: d.institution, kind: "tarjeta",
          amount: remaining(cycleTarget(cycle), paid),
          minimum: cycle.minimum_payment ? remaining(money(cycle.minimum_payment), paid) : null,
          state, estimated: false, href,
          note: cycle.no_interest_payment ? "Pago para no generar intereses" : undefined,
        };
      }
    }
    // Sin estado de cuenta pendiente: el siguiente corte después del último
    // capturado (o el último corte ocurrido, si nunca se capturó uno).
    // Fecha estimada y sin monto: el monto solo sale del estado de cuenta real.
    const { statementDay, paymentDueDay } = d.card;
    let statement = cycle ? nextOnDay(addDays(cycle.statement_date, 1), statementDay) : lastOnOrBefore(today, statementDay);
    let due = nextOnDay(addDays(statement, 1), paymentDueDay);
    while (due < today) {
      statement = nextOnDay(addDays(statement, 1), statementDay);
      due = nextOnDay(addDays(statement, 1), paymentDueDay);
    }
    const ddmm = `${statement.slice(8)}/${statement.slice(5, 7)}`;
    return {
      key: `tarjeta-${d.id}-${statement}`, date: due,
      title: d.name, institution: d.institution, kind: "tarjeta", amount: null, minimum: null,
      state: "pendiente", estimated: true, href,
      note: statement <= today
        ? `Captura tu estado de cuenta del corte del ${ddmm}`
        : `Captura tu estado de cuenta después del corte del ${ddmm}`,
    };
  }

  if (d.paymentDueDay) {
    let due = nextOnDay(addDays(today, -3), d.paymentDueDay);
    const paidRecently = d.lastPaymentOn !== null && d.lastPaymentOn > addDays(today, -25);
    if (paidRecently && due <= addDays(today, 3)) due = nextOnDay(addDays(due, 1), d.paymentDueDay);
    const amount = d.fixedPayment ?? d.minimumPayment;
    return {
      key: `prestamo-${d.id}-${due}`, date: due, title: d.name, institution: d.institution, kind: "prestamo",
      amount: amount ? money(amount) : null, minimum: d.minimumPayment ? money(d.minimumPayment) : null,
      state: due < today ? "vencido" : "pendiente", estimated: false, href,
    };
  }
  return null;
}

export function buildUpcomingPayments(
  input: { today: string; debts: DebtSchedule[]; recurring: RecurringSchedule[] },
  horizonDays = 30,
): UpcomingPayment[] {
  const until = addDays(input.today, horizonDays);
  const out: UpcomingPayment[] = [];
  for (const d of input.debts) {
    const p = debtNextPayment(d, input.today);
    if (p && p.date <= until) out.push(p);
  }
  for (const r of input.recurring) {
    if (!r.nextDueDate) continue;
    for (const date of projectRecurring(r.nextDueDate, r.frequency, r.dueDay, until, 6)) {
      out.push({
        key: `rec-${r.id}-${date}`, date, title: r.name, institution: null, kind: "recurrente",
        amount: money(r.amount), minimum: null, state: date < input.today ? "vencido" : "pendiente",
        estimated: date !== r.nextDueDate, href: "/gastos#recurrentes",
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

// ---------------------------------------------------------------------
// Calendario mensual
// ---------------------------------------------------------------------
export type EventKind = "corte" | "limite" | "prestamo" | "recurrente" | "ingreso";

export interface CalendarEvent {
  key: string;
  date: string;
  kind: EventKind;
  title: string;
  amount: Decimal | null;
  estimated: boolean;
  state?: PaymentState;
  href: string;
}

export function buildCalendar(
  month: string,
  input: { today: string; debts: DebtSchedule[]; recurring: RecurringSchedule[]; incomes: IncomeSchedule[] },
): CalendarEvent[] {
  const start = `${month}-01`;
  const end = dateOn(month, daysInMonth(month));
  const inMonth = (d: string) => d >= start && d <= end;
  const events: CalendarEvent[] = [];

  for (const d of input.debts) {
    if (d.status === "liquidada") continue;
    const href = `/deudas/${d.id}`;
    if (d.card) {
      const real = d.cycles.filter((c) => inMonth(c.statement_date) || inMonth(c.payment_due_date));
      for (const c of real) {
        if (inMonth(c.statement_date)) {
          events.push({ key: `corte-${c.id}`, date: c.statement_date, kind: "corte", title: `Corte ${d.name}`,
            amount: c.statement_balance ? money(c.statement_balance) : null, estimated: false, href });
        }
        if (inMonth(c.payment_due_date)) {
          const paid = d.paidByCycle[c.id] ?? "0";
          events.push({ key: `limite-${c.id}`, date: c.payment_due_date, kind: "limite", title: `Pagar ${d.name}`,
            amount: cycleTarget(c), estimated: false, state: cycleState(c, paid, input.today), href });
        }
      }
      // Fechas estimadas del mes que no tienen estado de cuenta capturado.
      const estCorte = dateOn(month, d.card.statementDay);
      if (!d.cycles.some((c) => c.statement_date === estCorte)) {
        events.push({ key: `corte-est-${d.id}`, date: estCorte, kind: "corte", title: `Corte ${d.name}`, amount: null, estimated: true, href });
      }
      const estLimite = dateOn(month, d.card.paymentDueDay);
      if (!d.cycles.some((c) => c.payment_due_date === estLimite)) {
        events.push({ key: `limite-est-${d.id}`, date: estLimite, kind: "limite", title: `Pagar ${d.name}`, amount: null, estimated: true, href });
      }
    } else if (d.paymentDueDay) {
      const amount = d.fixedPayment ?? d.minimumPayment;
      events.push({ key: `prestamo-${d.id}`, date: dateOn(month, d.paymentDueDay), kind: "prestamo", title: `Pagar ${d.name}`,
        amount: amount ? money(amount) : null, estimated: false, href });
    }
  }

  for (const r of input.recurring) {
    if (!r.nextDueDate) continue;
    for (const date of projectRecurring(r.nextDueDate, r.frequency, r.dueDay, end, 10)) {
      if (inMonth(date)) {
        events.push({ key: `rec-${r.id}-${date}`, date, kind: "recurrente", title: r.name, amount: money(r.amount),
          estimated: date !== r.nextDueDate, href: "/gastos#recurrentes" });
      }
    }
  }

  for (const s of input.incomes) {
    const days = s.payDays?.length
      ? s.payDays
      : s.frequency === "quincenal" ? [15, 31] : s.frequency === "mensual" ? [31] : [];
    for (const day of days) {
      events.push({ key: `ing-${s.id}-${day}`, date: dateOn(month, day), kind: "ingreso", title: s.name,
        amount: s.expectedAmount ? money(s.expectedAmount) : null, estimated: true, href: "/ingresos" });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
