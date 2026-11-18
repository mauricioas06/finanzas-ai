"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { failed, ok, runAction, type ActionState } from "@/lib/actions/shared";

export async function markAllRead(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(z.object({}), formData, async (_d, { supabase, userId }) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) return failed("alertas-leidas", error);
    revalidatePath("/", "layout");
    return ok("Alertas marcadas como leídas.");
  });
}
