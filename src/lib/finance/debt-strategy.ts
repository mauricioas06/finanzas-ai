import Decimal from "decimal.js";
import { money, sum, type MoneyInput } from "@/lib/money";

/**
 * Simulación mes a mes para liquidar deudas.
 *  - Interés mensual = tasa anual / 12, redondeado a centavos.
 *  - Avalancha: el dinero extra va a la deuda con mayor tasa.
 *  - Bola de nieve: el dinero extra va a la deuda con menor saldo.
 *  - Al liquidar una deuda, su pago se suma al siguiente objetivo (presupuesto constante).
 * Es una estimación: no incluye IVA de intereses, comisiones ni compras nuevas.
 */

export type Strategy = "avalancha" | "bola_de_nieve" | "solo_minimos";

export interface DebtInput {
  id: string;
  name: string;
  balance: MoneyInput;
  /** Tasa anual en porcentaje (54.5 = 54.5 %). Nula = 0 %. */
  annualRate: MoneyInput | null;
  minPayment: MoneyInput | null;
}

export interface PayoffResult {
  strategy: Strategy;
  feasible: boolean;
  reason?: string;
  months: number | null;
  totalInterest: Decimal;
  totalPaid: Decimal;
  order: Array<{ id: string; name: string; month: number }>;
  /** Deudas sin pago mínimo capturado: se supuso 3 % del saldo (mínimo $100). */
  assumedMinimums: string[];
}

export const MAX_MONTHS = 600;
const ZERO = new Decimal(0);
const cents = (d: Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

export function assumedMinimum(balance: Decimal): Decimal {
  return Decimal.max(cents(balance.mul(0.03)), new Decimal(100));
}

export function simulatePayoff(input: DebtInput[], monthlyBudget: MoneyInput, strategy: Strategy): PayoffResult {
  const assumedMinimums: string[] = [];
  const debts = input
    .map((d) => {
      const balance = money(d.balance);
      let min = d.minPayment !== null && d.minPayment !== undefined ? money(d.minPayment) : null;
      if (!min || min.lte(0)) {
        min = assumedMinimum(balance);
        assumedMinimums.push(d.id);
      }
      return { id: d.id, name: d.name, balance, rate: money(d.annualRate ?? 0).div(1200), min, paidOffAt: null as number | null };
    })
    .filter((d) => d.balance.gt(0));

  const base = { strategy, totalInterest: ZERO, totalPaid: ZERO, order: [], assumedMinimums };
  if (debts.length === 0) return { ...base, feasible: true, months: 0 };

  const budget = strategy === "solo_minimos" ? sum(debts.map((d) => d.min)) : money(monthlyBudget);
  const minimums = sum(debts.map((d) => Decimal.min(d.min, d.balance)));
  if (budget.lt(minimums)) {
    return { ...base, feasible: false, months: null,
      reason: `El presupuesto no alcanza para los pagos mínimos. Faltan $${cents(minimums.minus(budget)).toFixed(2)} al mes.` };
  }

  let totalInterest = ZERO;
  let totalPaid = ZERO;
  const order: PayoffResult["order"] = [];

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const active = debts.filter((d) => d.balance.gt(0));
    const startTotal = sum(active.map((d) => d.balance));

    for (const d of active) {
      const interest = cents(d.balance.mul(d.rate));
      d.balance = d.balance.plus(interest);
      totalInterest = totalInterest.plus(interest);
    }

    // Solo mínimos: cada deuda paga su mínimo, sin pasar sobrantes a otras.
    let remaining = strategy === "solo_minimos" ? ZERO : budget;
    for (const d of active) {
      const pay = Decimal.min(d.min, d.balance);
      d.balance = d.balance.minus(pay);
      totalPaid = totalPaid.plus(pay);
      if (strategy !== "solo_minimos") remaining = remaining.minus(pay);
    }

    if (strategy !== "solo_minimos") {
      const targets = active.filter((d) => d.balance.gt(0)).sort((a, b) =>
        strategy === "avalancha"
          ? b.rate.cmp(a.rate) || a.balance.cmp(b.balance)
          : a.balance.cmp(b.balance) || b.rate.cmp(a.rate));
      for (const d of targets) {
        if (remaining.lte(0)) break;
        const pay = Decimal.min(remaining, d.balance);
        d.balance = d.balance.minus(pay);
        totalPaid = totalPaid.plus(pay);
        remaining = remaining.minus(pay);
      }
    }

    for (const d of active) {
      if (d.balance.lte(0) && d.paidOffAt === null) {
        d.paidOffAt = month;
        order.push({ id: d.id, name: d.name, month });
      }
    }

    if (debts.every((d) => d.balance.lte(0))) {
      return { strategy, feasible: true, months: month, totalInterest, totalPaid, order, assumedMinimums };
    }

    // Si en un mes la deuda total no baja, ya no bajará: el pago no supera los intereses.
    const endTotal = sum(debts.filter((d) => d.balance.gt(0)).map((d) => d.balance));
    if (endTotal.gte(startTotal)) {
      return { strategy, feasible: false, months: null, totalInterest, totalPaid, order, assumedMinimums,
        reason: month === 1
          ? "Con estos pagos la deuda no baja: los intereses son iguales o mayores a lo que pagas."
          : `A partir del mes ${month} la deuda deja de bajar: los intereses se comen el pago.` };
    }
  }

  return { strategy, feasible: false, months: null, totalInterest, totalPaid, order, assumedMinimums,
    reason: "Con estos pagos tardarías más de 50 años en liquidar." };
}

export interface StrategyComparison {
  minimos: PayoffResult;
  avalancha: PayoffResult;
  bola: PayoffResult;
  recommended: "avalancha" | "bola_de_nieve" | null;
  interestSaved: Decimal | null;
}

export function compareStrategies(debts: DebtInput[], monthlyBudget: MoneyInput): StrategyComparison {
  const minimos = simulatePayoff(debts, 0, "solo_minimos");
  const avalancha = simulatePayoff(debts, monthlyBudget, "avalancha");
  const bola = simulatePayoff(debts, monthlyBudget, "bola_de_nieve");
  let recommended: StrategyComparison["recommended"] = null;
  if (avalancha.feasible && bola.feasible) {
    // Avalancha ahorra más intereses; si empatan, bola de nieve da victorias rápidas.
    recommended = avalancha.totalInterest.lt(bola.totalInterest) ? "avalancha" : "bola_de_nieve";
  } else if (avalancha.feasible) recommended = "avalancha";
  else if (bola.feasible) recommended = "bola_de_nieve";
  const best = recommended === "avalancha" ? avalancha : recommended === "bola_de_nieve" ? bola : null;
  const interestSaved = best && minimos.feasible ? Decimal.max(ZERO, minimos.totalInterest.minus(best.totalInterest)) : null;
  return { minimos, avalancha, bola, recommended, interestSaved };
}
