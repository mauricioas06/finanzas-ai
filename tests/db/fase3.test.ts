import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createTestDb, createUser } from "./supabase-local";

const ANA = "55555555-5555-4555-8555-555555555555";
const BETO = "66666666-6666-4666-8666-666666666666";

let db: PGlite;
let cuenta: string;
let tarjeta: string; // id de la deuda
let ciclo: string;
let cat: string;

const one = async <T,>(sql: string, params: unknown[] = []) =>
  asUser(db, ANA, async () => (await db.query<T>(sql, params)).rows[0]);

beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ANA, "Ana");
  await createUser(db, BETO, "Beto");
  cuenta = (await one<{ id: string }>(
    "insert into money_accounts (user_id, name, account_type, balance) values ($1, 'Nómina', 'debito', 20000) returning id", [ANA])).id;
  tarjeta = (await one<{ id: string }>(
    `insert into debts (user_id, debt_type, institution, name, current_balance, annual_interest_rate, minimum_payment)
     values ($1, 'tarjeta_credito', 'Banco Azul', 'Oro', 5000, 60, 400) returning id`, [ANA])).id;
  const card = await one<{ id: string }>(
    "insert into credit_cards (user_id, debt_id, credit_limit, statement_day, payment_due_day) values ($1, $2, 30000, 5, 25) returning id",
    [ANA, tarjeta]);
  ciclo = (await one<{ id: string }>(
    `insert into billing_cycles (user_id, credit_card_id, period_start, statement_date, payment_due_date,
                                 statement_balance, minimum_payment, no_interest_payment)
     values ($1, $2, '2026-10-06', '2026-11-05', '2026-11-25', 5000, 400, 5000) returning id`, [ANA, card.id])).id;
  cat = (await one<{ id: string }>("select id from expense_categories where name = 'Compras'")).id;
}, 60_000);

const deuda = async () => one<{ b: string; s: string }>("select current_balance::text as b, status as s from debts where id = $1", [tarjeta]);
const saldo = async () => (await one<{ b: string }>("select balance::text as b from money_accounts where id = $1", [cuenta])).b;

describe("compras con tarjeta", () => {
  it("cuenta como gasto con su categoría y aumenta la deuda", async () => {
    const tx = (await one<{ id: string }>("select card_purchase($1, 1200.50, '2026-11-10', $2, 'Zapatos') as id", [tarjeta, cat])).id;
    expect(await deuda()).toEqual({ b: "6200.50", s: "activa" });
    expect(await saldo()).toBe("20000.00");
    const g = await one<{ expense: string }>("select expense::text from v_monthly_cashflow where month = '2026-11-01'");
    expect(g.expense).toBe("1200.50");

    await asUser(db, ANA, () => db.query("delete from transactions where id = $1", [tx]));
    expect((await deuda()).b).toBe("5000.00");
  });
});

describe("pagos a deudas", () => {
  it("sale de la cuenta, baja la deuda y NO se cuenta como gasto", async () => {
    await one("select pay_debt($1, 400, '2026-11-18', $2, $3)", [tarjeta, cuenta, ciclo]);
    expect(await saldo()).toBe("19600.00");
    expect((await deuda()).b).toBe("4600.00");
    const f = await one<{ expense: string; debt_paid: string }>(
      "select expense::text, debt_paid::text from v_monthly_cashflow where month = '2026-11-01'");
    expect(f).toEqual({ expense: "0.00", debt_paid: "400.00" });
  });

  it("pagar el mínimo no marca el estado de cuenta como pagado; el pago sin intereses sí", async () => {
    expect((await one<{ status: string }>("select status from billing_cycles where id = $1", [ciclo])).status).toBe("abierto");
    await one("select pay_debt($1, 4600, '2026-11-20', $2, $3)", [tarjeta, cuenta, ciclo]);
    expect((await one<{ status: string }>("select status from billing_cycles where id = $1", [ciclo])).status).toBe("pagado");
    expect(await deuda()).toEqual({ b: "0.00", s: "liquidada" });
  });

  it("no permite pagar más de lo que se debe", async () => {
    await expect(one("select pay_debt($1, 1, '2026-11-20', null, null)", [tarjeta])).rejects.toThrow(/current_balance_check/);
  });

  it("intereses y comisiones suben la deuda y la reactivan", async () => {
    await asUser(db, ANA, () => db.query(
      "insert into debt_payments (user_id, debt_id, kind, amount, occurred_on) values ($1, $2, 'interes', 85.30, '2026-12-05')",
      [ANA, tarjeta]));
    expect(await deuda()).toEqual({ b: "85.30", s: "activa" });
  });

  it("nadie puede pagar ni comprar con la deuda de otra persona", async () => {
    await expect(asUser(db, BETO, () => db.query("select pay_debt($1, 10, '2026-11-20', null, null)", [tarjeta]))).rejects.toThrow(/no encontrada/);
    await expect(asUser(db, BETO, () => db.query("select card_purchase($1, 10, '2026-11-20', null, null)", [tarjeta]))).rejects.toThrow(/no encontrada/);
  });
});

describe("alertas de pago", () => {
  it("crea una alerta por umbral y no la repite", async () => {
    await asUser(db, ANA, () => db.query(
      `insert into recurring_expenses (user_id, name, amount, frequency, due_day, next_due_date)
       values ($1, 'Renta', 8000, 'mensual', 1, today_mx() + 2)`, [ANA]));
    const first = await one<{ n: number }>("select sync_payment_alerts() as n");
    const second = await one<{ n: number }>("select sync_payment_alerts() as n");
    expect(first.n).toBeGreaterThanOrEqual(1);
    expect(second.n).toBe(0);
    const renta = await one<{ title: string; severity: string; body: string }>(
      "select title, severity, body from notifications where related_table = 'recurring_expenses'");
    expect(renta.title).toBe("En 2 días vence: Renta");
    expect(renta.severity).toBe("aviso");
    expect(renta.body).toContain("Monto $8,000.00");
  });

  it("cada quien ve solo sus alertas y solo puede marcarlas como leídas", async () => {
    const beto = await asUser(db, BETO, () => db.query("select id from notifications"));
    expect(beto.rows).toEqual([]);
    await asUser(db, ANA, () => db.query("update notifications set read_at = now()"));
    await expect(asUser(db, ANA, () => db.query("update notifications set title = 'x'"))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, ANA, () => db.query(
      "insert into notifications (user_id, type, title) values ($1, 'sistema', 'falsa')", [ANA]))).rejects.toThrow(/permission denied/);
  });
});
