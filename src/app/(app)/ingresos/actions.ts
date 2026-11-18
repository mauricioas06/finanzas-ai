"use server";

import { revalidatePath } from "next/cache";
import { asNumeric } from "@/lib/money";
import { failed, ok, runAction, type ActionState } from "@/lib/actions/shared";
import { idSchema, incomeSchema, incomeSourceSchema } from "@/lib/validation";

function refresh() {
  for (const p of ["/ingresos", "/mi-dinero", "/dashboard"]) revalidatePath(p);
}

export async function recordIncome(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(incomeSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      kind: "ingreso",
      amount: asNumeric(d.amount),
      occurred_on: d.occurredOn,
      income_type: d.incomeType,
      income_source_id: d.incomeSourceId,
      account_id: d.accountId,
      description: d.description,
    });
    if (error) return failed("registrar-ingreso", error);
    refresh();
    return ok(d.accountId ? "Ingreso registrado y sumado a la cuenta." : "Ingreso registrado.");
  });
}

export async function createIncomeSource(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(incomeSourceSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("income_sources").insert({
      user_id: userId,
      name: d.name,
      income_type: d.incomeType,
      frequency: d.frequency,
      is_variable: d.isVariable,
      expected_amount: d.expectedAmount ? asNumeric(d.expectedAmount) : null,
      pay_days: d.payDays,
      description: d.description,
    });
    if (error) return failed("crear-fuente", error);
    refresh();
    return ok(`Fuente "${d.name}" agregada.`);
  });
}

export async function deleteIncomeSource(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(idSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("income_sources").delete().eq("id", d.id).eq("user_id", userId);
    if (error) return failed("borrar-fuente", error);
    refresh();
    return ok("Fuente eliminada.");
  });
}
