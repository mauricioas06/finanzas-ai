"use server";

import { revalidatePath } from "next/cache";
import { idSchema } from "@/lib/validation";
import { failed, ok, runAction, type ActionState } from "./shared";

/** Borra un ingreso o gasto. Si tenía cuenta, la base revierte el saldo sola. */
export async function deleteTransaction(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(idSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("transactions").delete().eq("id", d.id).eq("user_id", userId);
    if (error) return failed("borrar-movimiento", error);
    for (const p of ["/ingresos", "/gastos", "/mi-dinero", "/dashboard"]) revalidatePath(p);
    return ok("Movimiento eliminado.");
  });
}
