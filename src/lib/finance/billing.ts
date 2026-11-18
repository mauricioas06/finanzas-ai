import Decimal from "decimal.js";
import { money, type MoneyInput } from "@/lib/money";
import { daysInMonth, shiftMonth } from "./months";

/** Fechas de tarjetas, préstamos y recurrentes. Todo como "YYYY-MM-DD". */

export function dateOn(month: string, day: number): string {
  return `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, "0")}`;
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Primera fecha >= from con ese día del mes (ajustado a fin de mes). */
export function nextOnDay(from: string, day: number): string {
  const month = from.slice(0, 7);
  const candidate = dateOn(month, day);
  return candidate >= from ? candidate : dateOn(shiftMonth(month, 1), day);
}

/** Última fecha <= from con ese día del mes. */
export function lastOnOrBefore(from: string, day: number): string {
  const month = from.slice(0, 7);
  const candidate = dateOn(month, day);
  return candidate <= from ? candidate : dateOn(shiftMonth(month, -1), day);
}

/**
 * Sugerencia de fechas para capturar el estado de cuenta más reciente:
 * el último corte ya ocurrido, el periodo que cubre y su fecha límite.
 * Solo es una sugerencia: el usuario confirma con su estado de cuenta real.
 */
export function suggestCycle(today: string, statementDay: number, paymentDueDay: number) {
  const statementDate = lastOnOrBefore(today, statementDay);
  const previous = lastOnOrBefore(addDays(statementDate, -1), statementDay);
  return {
    periodStart: addDays(previous, 1),
    statementDate,
    paymentDueDate: nextOnDay(addDays(statementDate, 1), paymentDueDay),
  };
}

/** Próximo corte (estimado) a partir de hoy, incluido hoy. */
export function nextStatementDate(today: string, statementDay: number): string {
  return nextOnDay(today, statementDay);
}

export type PaymentState = "pendiente" | "parcial" | "pagado" | "vencido";

/** Lo que conviene pagar del ciclo: pago para no generar intereses, si existe. */
export function cycleTarget(c: { no_interest_payment: MoneyInput | null; statement_balance: MoneyInput | null; minimum_payment: MoneyInput | null }): Decimal | null {
  const v = c.no_interest_payment ?? c.statement_balance ?? c.minimum_payment;
  return v === null || v === undefined ? null : money(v);
}

export function cycleState(
  c: { status: string; payment_due_date: string; no_interest_payment: MoneyInput | null; statement_balance: MoneyInput | null; minimum_payment: MoneyInput | null },
  paid: MoneyInput,
  today: string,
): PaymentState {
  const target = cycleTarget(c);
  const p = money(paid);
  if (c.status === "pagado" || (target && target.gt(0) && p.gte(target)) || (target && target.isZero())) return "pagado";
  if (c.payment_due_date < today) return "vencido";
  return p.gt(0) ? "parcial" : "pendiente";
}

/** Próximas fechas de un gasto recurrente (versión TS de next_due_date en SQL). */
export function nextRecurringDate(cur: string, freq: string, dueDay: number | null): string {
  if (freq === "semanal") return addDays(cur, 7);
  const month = cur.slice(0, 7);
  const day = Number(cur.slice(8, 10));
  if (freq === "quincenal") {
    if (day < 15) return `${month}-15`;
    const end = dateOn(month, 31);
    return cur < end ? end : `${shiftMonth(month, 1)}-15`;
  }
  const months = { mensual: 1, bimestral: 2, trimestral: 3, anual: 12 }[freq];
  if (!months) throw new Error(`Frecuencia desconocida: ${freq}`);
  return dateOn(shiftMonth(month, months), dueDay ?? day);
}

export function projectRecurring(nextDue: string, freq: string, dueDay: number | null, until: string, limit = 40): string[] {
  const out: string[] = [];
  let d = nextDue;
  while (d <= until && out.length < limit) {
    out.push(d);
    d = nextRecurringDate(d, freq, dueDay);
  }
  return out;
}

/**
 * Cuántos días de cobro hay entre hoy (excluido) y la fecha límite (incluida),
 * según la frecuencia de pago del perfil. Siempre al menos 1.
 */
export function paydaysUntil(today: string, due: string, frequency: string): number {
  if (due <= today) return 1;
  let count = 0;
  if (frequency === "semanal") {
    for (let d = addDays(today, 7); d <= due; d = addDays(d, 7)) count++;
  } else if (frequency === "quincenal" || frequency === "mensual") {
    let month = today.slice(0, 7);
    while (`${month}-01` <= due) {
      const days = frequency === "quincenal" ? [dateOn(month, 15), dateOn(month, 31)] : [dateOn(month, 31)];
      for (const d of days) if (d > today && d <= due) count++;
      month = shiftMonth(month, 1);
    }
  }
  return Math.max(1, count);
}

/** Cuánto separar en cada cobro para juntar `amount` antes de la fecha límite. */
export function perPayday(amount: MoneyInput, paydays: number): Decimal {
  return money(amount).div(Math.max(1, paydays)).toDecimalPlaces(2, Decimal.ROUND_UP);
}
