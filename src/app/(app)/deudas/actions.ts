"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { todayInMexico } from "@/lib/dates";
import { asNumeric, money } from "@/lib/money";
import { failed, ok, runAction, type ActionState } from "@/lib/actions/shared";
import {
  cardPurchaseSchema, cardSettingsSchema, correctBalanceSchema, cycleSchema, debtChargeSchema, debtSchema,
  debtSettingsSchema, idSchema, payDebtSchema,
} from "@/lib/validation";

function refresh(debtId?: string) {
  for (const p of ["/deudas", "/calendario", "/dashboard", "/mi-dinero", "/gastos"]) revalidatePath(p);
  if (debtId) revalidatePath(`/deudas/${debtId}`);
}

export async function createDebt(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(debtSchema, formData, async (d, { supabase, userId }) => {
    const { data: debt, error } = await supabase
      .from("debts")
      .insert({
        user_id: userId,
        debt_type: d.debtType,
        institution: d.institution,
        name: d.name,
        current_balance: asNumeric(d.currentBalance),
        original_amount: money(d.currentBalance).gt(0) ? asNumeric(d.currentBalance) : null,
        annual_interest_rate: d.annualRate ? asNumeric(d.annualRate) : null,
        minimum_payment: d.minimumPayment ? asNumeric(d.minimumPayment) : null,
        fixed_payment: d.fixedPayment && d.fixedPayment !== "0.00" ? asNumeric(d.fixedPayment) : null,
        payment_due_day: d.debtType === "tarjeta_credito" ? null : d.paymentDueDay,
        status: money(d.currentBalance).isZero() ? "liquidada" : "activa",
      })
      .select("id")
      .single();
    if (error || !debt) return failed("crear-deuda", error!);

    if (d.debtType === "tarjeta_credito") {
      const { error: cardError } = await supabase.from("credit_cards").insert({
        user_id: userId,
        debt_id: debt.id,
        credit_limit: asNumeric(d.creditLimit!),
        statement_day: d.statementDay!,
        payment_due_day: d.cardDueDay!,
      });
      if (cardError) {
        // Sin tarjeta no tiene sentido la deuda: se deshace para no dejarla a medias.
        await supabase.from("debts").delete().eq("id", debt.id).eq("user_id", userId);
        return failed("crear-tarjeta", cardError);
      }
    }
    refresh();
    return ok(`"${d.name}" agregada.`);
  });
}

export async function updateDebtSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(debtSettingsSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("debts").update({
      annual_interest_rate: d.annualRate ? asNumeric(d.annualRate) : null,
      minimum_payment: d.minimumPayment ? asNumeric(d.minimumPayment) : null,
      fixed_payment: d.fixedPayment && d.fixedPayment !== "0.00" ? asNumeric(d.fixedPayment) : null,
      payment_due_day: d.paymentDueDay,
    }).eq("id", d.id).eq("user_id", userId);
    if (error) return failed("datos-deuda", error);
    refresh(d.id);
    return ok("Datos guardados.");
  });
}

export async function updateCardSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(cardSettingsSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("credit_cards").update({
      credit_limit: asNumeric(d.creditLimit),
      statement_day: d.statementDay,
      payment_due_day: d.cardDueDay,
    }).eq("id", d.cardId).eq("user_id", userId);
    if (error) return failed("datos-tarjeta", error);
    refresh();
    return ok("Datos de la tarjeta guardados.");
  });
}

export async function saveCycle(_: ActionState, formData: FormData): Promise<ActionState> {
  const addCharges = formData.get("addCharges") === "on";
  return runAction(cycleSchema, formData, async (d, { supabase, userId }) => {
    const { data: cycle, error } = await supabase.from("billing_cycles").insert({
      user_id: userId,
      credit_card_id: d.cardId,
      period_start: d.periodStart,
      statement_date: d.statementDate,
      payment_due_date: d.paymentDueDate,
      statement_balance: asNumeric(d.statementBalance),
      minimum_payment: asNumeric(d.minimumPayment),
      no_interest_payment: asNumeric(d.noInterestPayment),
      interest_charged: asNumeric(d.interestCharged ?? "0.00"),
      fees_charged: asNumeric(d.feesCharged ?? "0.00"),
      status: money(d.noInterestPayment).isZero() ? "pagado" : "cerrado",
    }).select("id").single();
    if (error || !cycle) {
      if (error?.code === "23505") return { error: "Ya capturaste un estado de cuenta con esa fecha de corte." };
      return failed("estado-cuenta", error!);
    }

    if (addCharges) {
      const charges = [
        { kind: "interes", amount: d.interestCharged },
        { kind: "comision", amount: d.feesCharged },
      ].filter((c) => c.amount && money(c.amount).gt(0));
      if (charges.length) {
        const { error: chargeError } = await supabase.from("debt_payments").insert(charges.map((c) => ({
          user_id: userId, debt_id: d.debtId, billing_cycle_id: cycle.id, kind: c.kind,
          amount: asNumeric(c.amount!), occurred_on: d.statementDate, notes: "Del estado de cuenta",
        })));
        if (chargeError) return failed("cargos-estado", chargeError);
      }
    }
    refresh(d.debtId);
    return ok("Estado de cuenta guardado.");
  });
}

export async function payDebt(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(payDebtSchema, formData, async (d, { supabase }) => {
    const { error } = await supabase.rpc("pay_debt", {
      p_debt_id: d.debtId,
      p_amount: asNumeric(d.amount),
      p_paid_on: d.paidOn,
      p_account_id: d.accountId ?? undefined,
      p_billing_cycle_id: d.cycleId ?? undefined,
    });
    if (error) {
      if (`${error.message}`.includes("current_balance_check")) return { error: "El pago es mayor que lo que debes. Revisa el monto." };
      return failed("pagar-deuda", error);
    }
    refresh(d.debtId);
    return ok(d.accountId ? "Pago registrado y descontado de tu cuenta." : "Pago registrado.");
  });
}

export async function addCharge(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(debtChargeSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("debt_payments").insert({
      user_id: userId, debt_id: d.debtId, kind: d.kind, amount: asNumeric(d.amount), occurred_on: d.occurredOn, notes: d.notes,
    });
    if (error) return failed("cargo-deuda", error);
    refresh(d.debtId);
    return ok(d.kind === "interes" ? "Interés registrado." : "Comisión registrada.");
  });
}

export async function cardPurchase(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(cardPurchaseSchema, formData, async (d, { supabase }) => {
    const { error } = await supabase.rpc("card_purchase", {
      p_debt_id: d.debtId, p_amount: asNumeric(d.amount), p_occurred_on: d.occurredOn,
      p_category_id: d.categoryId, p_description: d.description ?? undefined,
    });
    if (error) return failed("compra-tarjeta", error);
    refresh(d.debtId);
    return ok("Compra registrada: cuenta como gasto y sube la deuda de la tarjeta.");
  });
}

/** Corrige el saldo al valor real: registra un ajuste por la diferencia. */
export async function correctBalance(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(correctBalanceSchema, formData, async (d, { supabase, userId }) => {
    const { data: debt, error: readError } = await supabase
      .from("debts").select("current_balance::text").eq("id", d.debtId).eq("user_id", userId).single();
    if (readError || !debt) return { error: "No se encontró la deuda." };
    const delta = money(d.newBalance).minus(debt.current_balance);
    if (delta.isZero()) return ok("El saldo ya era ese.");
    const { error } = await supabase.from("debt_payments").insert({
      user_id: userId, debt_id: d.debtId, kind: "ajuste", amount: asNumeric(delta.toFixed(2)),
      occurred_on: todayInMexico(), notes: "Corrección de saldo",
    });
    if (error) return failed("corregir-saldo", error);
    refresh(d.debtId);
    return ok("Saldo corregido.");
  });
}

/** Borra un movimiento. Si salió de una cuenta, borra también ese pago (y regresa el dinero). */
export async function deleteMovement(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(idSchema, formData, async (d, { supabase, userId }) => {
    const { data: mov } = await supabase
      .from("debt_payments").select("debt_id, transaction_id").eq("id", d.id).eq("user_id", userId).single();
    if (!mov) return { error: "No se encontró el movimiento." };
    const { error } = mov.transaction_id
      ? await supabase.from("transactions").delete().eq("id", mov.transaction_id).eq("user_id", userId)
      : await supabase.from("debt_payments").delete().eq("id", d.id).eq("user_id", userId);
    if (error) {
      if (`${error.message}`.includes("current_balance_check")) return { error: "No se puede borrar: la deuda quedaría negativa." };
      return failed("borrar-movimiento-deuda", error);
    }
    refresh(mov.debt_id);
    return ok("Movimiento eliminado.");
  });
}

export async function deleteCycle(_: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(idSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("billing_cycles").delete().eq("id", d.id).eq("user_id", userId);
    if (error) return failed("borrar-estado", error);
    refresh();
    return ok("Estado de cuenta eliminado.");
  });
}

export async function deleteDebt(_: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(idSchema, formData, async (d, { supabase, userId }) => {
    const { error } = await supabase.from("debts").delete().eq("id", d.id).eq("user_id", userId);
    if (error) return failed("borrar-deuda", error);
    refresh();
    return ok("Deuda eliminada.");
  });
  if (result.success) redirect("/deudas");
  return result;
}
