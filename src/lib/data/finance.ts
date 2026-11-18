import "server-only";
import { redirect } from "next/navigation";
import { todayInMexico } from "@/lib/dates";
import { isMonthKey, lastMonths, monthOf, monthRange } from "@/lib/finance/months";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Lecturas de la Fase 2. Los montos se piden como texto (::text) para que
 * lleguen exactos; RLS garantiza que cada usuario solo recibe sus filas.
 */

export async function financeContext(mesParam?: string | string[]) {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login");
  const today = todayInMexico();
  const currentMonth = monthOf(today);
  const requested = typeof mesParam === "string" && isMonthKey(mesParam) ? mesParam : currentMonth;
  const month = requested > currentMonth ? currentMonth : requested;
  return { supabase, userId: user.id, today, currentMonth, month };
}

type Ctx = Awaited<ReturnType<typeof financeContext>>;

function must<T>(scope: string, res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) {
    console.error(`[datos:${scope}]`, res.error.message);
    throw new Error("No se pudieron cargar tus datos. Recarga la página.");
  }
  return res.data as T;
}

export async function getAccounts({ supabase, userId }: Ctx) {
  return must("cuentas", await supabase
    .from("money_accounts")
    .select("id, name, account_type, institution, balance::text, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at"));
}

export async function getCategories({ supabase, userId }: Ctx) {
  return must("categorias", await supabase
    .from("expense_categories")
    .select("id, name, icon, color, monthly_budget::text, is_essential, sort_order")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("sort_order")
    .order("name"));
}

export async function getIncomeSources({ supabase, userId }: Ctx) {
  return must("fuentes", await supabase
    .from("income_sources")
    .select("id, name, income_type, frequency, expected_amount::text, is_variable, pay_days")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at"));
}

export async function getRecurring({ supabase, userId }: Ctx) {
  return must("recurrentes", await supabase
    .from("recurring_expenses")
    .select("id, name, amount::text, frequency, due_day, next_due_date, is_essential, is_active, category_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("next_due_date", { nullsFirst: false }));
}

export async function getMonthTransactions({ supabase, userId }: Ctx, month: string, kind: "ingreso" | "gasto") {
  const { start, next } = monthRange(month);
  return must("movimientos", await supabase
    .from("transactions")
    .select("id, amount::text, occurred_on, description, account_id, income_source_id, income_type, category_id, recurring_expense_id, debt_id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("occurred_on", start)
    .lt("occurred_on", next)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500));
}

/** Ingresos y gastos por mes para los últimos n meses (meses sin datos = 0). */
export async function getCashflow({ supabase, userId }: Ctx, endMonth: string, n: number) {
  const months = lastMonths(endMonth, n);
  const rows = must("flujo", await supabase
    .from("v_monthly_cashflow")
    .select("month, income::text, expense::text, debt_paid::text")
    .eq("user_id", userId)
    .gte("month", `${months[0]}-01`)
    .lte("month", `${endMonth}-01`));
  const byMonth = new Map((rows ?? []).map((r) => [String(r.month).slice(0, 7), r]));
  return months.map((m) => ({
    month: m,
    income: byMonth.get(m)?.income ?? "0.00",
    expense: byMonth.get(m)?.expense ?? "0.00",
    debtPaid: byMonth.get(m)?.debt_paid ?? "0.00",
  }));
}

/** Gasto por categoría y mes: Map<"YYYY-MM", Map<categoryId|"sin", total>>. */
export async function getCategorySpend({ supabase, userId }: Ctx, endMonth: string, n: number) {
  const months = lastMonths(endMonth, n);
  const rows = must("gasto-categorias", await supabase
    .from("v_monthly_category_spend")
    .select("month, category_id, total::text")
    .eq("user_id", userId)
    .gte("month", `${months[0]}-01`)
    .lte("month", `${endMonth}-01`));
  const out = new Map<string, Map<string, string>>(months.map((m) => [m, new Map()]));
  for (const r of rows ?? []) {
    out.get(String(r.month).slice(0, 7))?.set(r.category_id ?? "sin", r.total ?? "0.00");
  }
  return { months, byMonth: out };
}
