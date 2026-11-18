"use server";

import { revalidatePath } from "next/cache";
import { asNumeric } from "@/lib/money";
import { failed, ok, runAction, type ActionState } from "@/lib/actions/shared";
import { budgetSchema, categorySchema, expenseSchema, idSchema, payRecurringSchema, recurringSchema } from "@/lib/validation";

function refresh() {
  for (const p of ["/gastos", "/mi-dinero", "/dashboard"]) revalidatePath(p);
}

export async function recordExpense(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(expenseSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      kind: "gasto",
      amount: asNumeric(d.amount),
      occurred_on: d.occurredOn,
      category_id: d.categoryId,
      account_id: d.accountId,
      description: d.description,
    });
    if (error) return failed("registrar-gasto", error);
    refresh();
    return ok(d.accountId ? "Gasto registrado y descontado de la cuenta." : "Gasto registrado.");
  });
}

export async function createCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(categorySchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("expense_categories").insert({
      user_id: userId,
      name: d.name,
      is_essential: d.isEssential,
      monthly_budget: d.monthlyBudget ? asNumeric(d.monthlyBudget) : null,
      sort_order: 50,
    });
    if (error) {
      if (error.code === "23505") return { error: `Ya tienes una categoría llamada "${d.name}".` };
      return failed("crear-categoria", error);
    }
    refresh();
    return ok(`Categoría "${d.name}" creada.`);
  });
}

export async function updateBudget(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(budgetSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase
      .from("expense_categories")
      .update({ monthly_budget: d.monthlyBudget ? asNumeric(d.monthlyBudget) : null })
      .eq("id", d.id)
      .eq("user_id", userId);
    if (error) return failed("presupuesto", error);
    refresh();
    return ok("Presupuesto guardado.");
  });
}

export async function archiveCategory(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(idSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("expense_categories").update({ is_archived: true }).eq("id", d.id).eq("user_id", userId);
    if (error) return failed("archivar-categoria", error);
    refresh();
    return ok("Categoría archivada.");
  });
}

export async function createRecurring(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(recurringSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("recurring_expenses").insert({
      user_id: userId,
      name: d.name,
      amount: asNumeric(d.amount),
      frequency: d.frequency,
      next_due_date: d.nextDueDate,
      due_day: Number(d.nextDueDate.slice(8, 10)),
      category_id: d.categoryId,
      is_essential: d.isEssential,
    });
    if (error) return failed("crear-recurrente", error);
    refresh();
    return ok(`Gasto recurrente "${d.name}" agregado.`);
  });
}

export async function payRecurring(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(payRecurringSchema, formData, async (d, { supabase }) => {
    const { error } = await supabase.rpc("pay_recurring_expense", {
      p_recurring_id: d.id,
      p_paid_on: d.paidOn,
      p_amount: asNumeric(d.amount),
      p_account_id: d.accountId ?? undefined,
    });
    if (error) return failed("pagar-recurrente", error);
    refresh();
    return ok("Pago registrado. La próxima fecha se actualizó.");
  });
}

export async function deleteRecurring(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(idSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("recurring_expenses").update({ is_active: false }).eq("id", d.id).eq("user_id", userId);
    if (error) return failed("quitar-recurrente", error);
    refresh();
    return ok("Gasto recurrente quitado.");
  });
}
