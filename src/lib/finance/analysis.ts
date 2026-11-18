import Decimal from "decimal.js";
import { formatMXN, money, sum, type MoneyInput } from "@/lib/money";
import { daysBetween } from "./months";

// ---------------------------------------------------------------------
// Presupuestos
// ---------------------------------------------------------------------
export type BudgetLevel = "sin_presupuesto" | "ok" | "aviso" | "excedido";

export interface BudgetStatus {
  level: BudgetLevel;
  /** Porcentaje usado (0–∞), redondeado a entero. Nulo si no hay presupuesto. */
  percent: number | null;
  /** Lo que queda (negativo si se pasó). Nulo si no hay presupuesto. */
  remaining: Decimal | null;
}

/** Aviso al 80 % del presupuesto; excedido al pasar el 100 %. */
export function budgetStatus(spent: MoneyInput, budget: MoneyInput | null | undefined): BudgetStatus {
  if (budget === null || budget === undefined || money(budget).lte(0)) {
    return { level: "sin_presupuesto", percent: null, remaining: null };
  }
  const s = money(spent);
  const b = money(budget);
  const ratio = s.div(b);
  const level: BudgetLevel = ratio.gt(1) ? "excedido" : ratio.gte(0.8) ? "aviso" : "ok";
  return { level, percent: ratio.mul(100).toDecimalPlaces(0).toNumber(), remaining: b.minus(s) };
}

// ---------------------------------------------------------------------
// Gasto excesivo: el mes actual supera por mucho el promedio reciente.
// Requiere al menos 2 meses previos con gasto para no alarmar sin base.
// ---------------------------------------------------------------------
export interface ExcessResult {
  excessive: boolean;
  average: Decimal | null;
  /** Cuántas veces el promedio (ej. 1.8). */
  ratio: number | null;
}

export const EXCESS_RATIO = 1.5;
export const EXCESS_MIN_DIFF = 200;

export function detectExcess(current: MoneyInput, previous: MoneyInput[]): ExcessResult {
  const withData = previous.map((p) => money(p)).filter((p) => p.gt(0));
  if (withData.length < 2) return { excessive: false, average: null, ratio: null };
  const average = sum(withData).div(withData.length);
  const cur = money(current);
  const ratio = cur.div(average);
  const excessive = ratio.gte(EXCESS_RATIO) && cur.minus(average).gte(EXCESS_MIN_DIFF);
  return { excessive, average: average.toDecimalPlaces(2), ratio: ratio.toDecimalPlaces(1).toNumber() };
}

// ---------------------------------------------------------------------
// Variación entre dos meses.
// ---------------------------------------------------------------------
export function changePercent(current: MoneyInput, previous: MoneyInput): number | null {
  const p = money(previous);
  if (p.isZero()) return null;
  return money(current).minus(p).div(p).mul(100).toDecimalPlaces(0).toNumber();
}

// ---------------------------------------------------------------------
// "¿Qué debo hacer hoy?" — acciones concretas a partir de datos reales.
// ---------------------------------------------------------------------
export interface TodayInput {
  today: string;
  profileComplete: boolean;
  accountCount: number;
  incomeThisMonth: MoneyInput;
  recurring: Array<{ id: string; name: string; amount: MoneyInput; nextDueDate: string | null; isActive: boolean }>;
  categories: Array<{ id: string; name: string; spent: MoneyInput; budget: MoneyInput | null; excessive: boolean }>;
}

export interface TodayAction {
  id: string;
  priority: 1 | 2 | 3;
  title: string;
  detail: string;
  href: string;
  tone: "urgente" | "aviso" | "info";
}

export const RECURRING_LOOKAHEAD_DAYS = 7;

export function buildTodayActions(input: TodayInput): TodayAction[] {
  const actions: TodayAction[] = [];

  for (const r of input.recurring) {
    if (!r.isActive || !r.nextDueDate) continue;
    const days = daysBetween(input.today, r.nextDueDate);
    if (days > RECURRING_LOOKAHEAD_DAYS) continue;
    const when = days < 0 ? `venció hace ${-days} día${days === -1 ? "" : "s"}`
      : days === 0 ? "vence hoy"
      : days === 1 ? "vence mañana"
      : `vence en ${days} días`;
    actions.push({
      id: `recurrente-${r.id}`,
      priority: days <= 1 ? 1 : 2,
      title: `Pagar ${r.name}`,
      detail: `${when[0].toUpperCase()}${when.slice(1)}. Monto: ${formatMXN(r.amount)}.`,
      href: "/gastos#recurrentes",
      tone: days <= 1 ? "urgente" : "aviso",
    });
  }

  for (const c of input.categories) {
    const status = budgetStatus(c.spent, c.budget);
    if (status.level === "excedido") {
      actions.push({
        id: `presupuesto-${c.id}`, priority: 1, tone: "urgente", href: "/gastos#categorias",
        title: `Frena el gasto en ${c.name}`,
        detail: `Vas en ${status.percent} % de tu presupuesto del mes.`,
      });
    } else if (status.level === "aviso") {
      actions.push({
        id: `presupuesto-${c.id}`, priority: 2, tone: "aviso", href: "/gastos#categorias",
        title: `Cuida ${c.name}`,
        detail: `Ya usaste ${status.percent} % del presupuesto del mes.`,
      });
    } else if (c.excessive) {
      actions.push({
        id: `exceso-${c.id}`, priority: 2, tone: "aviso", href: "/gastos#categorias",
        title: `Gasto inusual en ${c.name}`,
        detail: "Este mes vas muy por encima de tu promedio reciente.",
      });
    }
  }

  if (input.accountCount === 0) {
    actions.push({
      id: "cuentas", priority: 1, tone: "info", href: "/mi-dinero",
      title: "Registra dónde tienes tu dinero",
      detail: "Efectivo, débito o ahorro. Sin esto no se puede calcular tu dinero disponible.",
    });
  }
  if (money(input.incomeThisMonth).isZero()) {
    actions.push({
      id: "ingreso", priority: 3, tone: "info", href: "/ingresos",
      title: "Registra tus ingresos de este mes",
      detail: "Así se compara lo que entra contra lo que sale.",
    });
  }
  if (!input.profileComplete) {
    actions.push({
      id: "perfil", priority: 3, tone: "info", href: "/configuracion",
      title: "Completa tu perfil financiero",
      detail: "Frecuencia de pago, perfil de riesgo y meta de fondo de emergencia.",
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}
