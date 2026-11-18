"use server";

import { revalidatePath } from "next/cache";
import { asNumeric } from "@/lib/money";
import { failed, ok, runAction, type ActionState } from "@/lib/actions/shared";
import { accountSchema, adjustBalanceSchema, idSchema } from "@/lib/validation";

function refresh() {
  revalidatePath("/mi-dinero");
  revalidatePath("/dashboard");
}

export async function createAccount(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(accountSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("money_accounts").insert({
      user_id: userId,
      name: d.name,
      account_type: d.accountType,
      institution: d.institution,
      balance: asNumeric(d.balance),
    });
    if (error) return failed("crear-cuenta", error);
    refresh();
    return ok(`Cuenta "${d.name}" agregada.`);
  });
}

export async function adjustBalance(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(adjustBalanceSchema, formData, async (d, { supabase, userId }) => {
    const { error, count } = await supabase
      .from("money_accounts")
      .update({ balance: asNumeric(d.balance) }, { count: "exact" })
      .eq("id", d.id)
      .eq("user_id", userId);
    if (error) return failed("ajustar-saldo", error);
    if (!count) return { error: "No se encontró la cuenta." };
    refresh();
    return ok("Saldo actualizado.");
  });
}

export async function deleteAccount(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(idSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("money_accounts").delete().eq("id", d.id).eq("user_id", userId);
    if (error) return failed("borrar-cuenta", error);
    refresh();
    return ok("Cuenta eliminada.");
  });
}
