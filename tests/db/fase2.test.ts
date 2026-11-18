import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createTestDb, createUser } from "./supabase-local";

const ANA = "33333333-3333-4333-8333-333333333333";
const BETO = "44444444-4444-4444-8444-444444444444";

let db: PGlite;
let cuenta: string;

beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ANA, "Ana");
  await createUser(db, BETO, "Beto");
  cuenta = await asUser(db, ANA, async () => {
    const r = await db.query<{ id: string }>(
      "insert into money_accounts (user_id, name, account_type, balance) values ($1, 'Débito', 'debito', 1000) returning id",
      [ANA]);
    return r.rows[0].id;
  });
}, 60_000);

const saldo = () =>
  asUser(db, ANA, async () =>
    (await db.query<{ b: string }>("select balance::text as b from money_accounts where id = $1", [cuenta])).rows[0].b);

const tx = (kind: string, amount: string, date = "2026-11-10", extra = "") =>
  asUser(db, ANA, async () =>
    (await db.query<{ id: string }>(
      `insert into transactions (user_id, kind, amount, occurred_on, account_id${extra ? ", category_id" : ""})
       values ($1, $2, $3, $4, $5${extra ? ", $6" : ""}) returning id`,
      extra ? [ANA, kind, amount, date, cuenta, extra] : [ANA, kind, amount, date, cuenta])).rows[0].id);

describe("saldos automáticos de las cuentas", () => {
  it("un ingreso suma y un gasto resta, con centavos exactos", async () => {
    await tx("ingreso", "10000.10");
    await tx("gasto", "2500.05");
    expect(await saldo()).toBe("8500.05");
  });

  it("borrar o corregir una transacción revierte su efecto", async () => {
    const id = await tx("gasto", "500");
    expect(await saldo()).toBe("8000.05");
    await asUser(db, ANA, () => db.query("update transactions set amount = 300 where id = $1", [id]));
    expect(await saldo()).toBe("8200.05");
    await asUser(db, ANA, () => db.query("delete from transactions where id = $1", [id]));
    expect(await saldo()).toBe("8500.05");
  });

  it("no permite gastar más de lo que hay en la cuenta", async () => {
    await expect(tx("gasto", "9000")).rejects.toThrow(/balance_check/);
    expect(await saldo()).toBe("8500.05");
  });
});

describe("resúmenes mensuales", () => {
  it("suma ingresos y gastos por mes y por categoría", async () => {
    const cat = await asUser(db, ANA, async () =>
      (await db.query<{ id: string }>("select id from expense_categories where name = 'Alimentación'")).rows[0].id);
    await tx("gasto", "120.40", "2026-11-12", cat);
    await tx("gasto", "79.60", "2026-11-13", cat);
    await tx("gasto", "50", "2026-10-30", cat);

    const flow = await asUser(db, ANA, () =>
      db.query<{ month: string; income: string; expense: string }>(
        "select month::text, income::text, expense::text from v_monthly_cashflow order by month"));
    expect(flow.rows).toEqual([
      { month: "2026-10-01", income: "0.00", expense: "50.00" },
      { month: "2026-11-01", income: "10000.10", expense: "2700.05" },
    ]);

    const byCat = await asUser(db, ANA, () =>
      db.query<{ total: string }>(
        "select total::text from v_monthly_category_spend where month = '2026-11-01' and category_id = $1", [cat]));
    expect(byCat.rows).toEqual([{ total: "200.00" }]);
  });

  it("otro usuario no ve los resúmenes ajenos", async () => {
    const r = await asUser(db, BETO, () => db.query("select * from v_monthly_cashflow"));
    expect(r.rows).toEqual([]);
  });
});

describe("gastos recurrentes", () => {
  const next = async (date: string, freq: string, day: number | null) =>
    (await db.query<{ d: string }>("select next_due_date($1::date, $2, $3::smallint)::text as d", [date, freq, day])).rows[0].d;

  it("calcula la siguiente fecha según la frecuencia", async () => {
    expect(await next("2026-11-18", "semanal", null)).toBe("2026-11-25");
    expect(await next("2026-11-10", "quincenal", null)).toBe("2026-11-15");
    expect(await next("2026-11-15", "quincenal", null)).toBe("2026-11-30");
    expect(await next("2026-11-30", "quincenal", null)).toBe("2026-12-15");
    expect(await next("2026-01-31", "mensual", 31)).toBe("2026-02-28");
    expect(await next("2026-02-28", "mensual", 31)).toBe("2026-03-31");
    expect(await next("2026-11-05", "anual", 5)).toBe("2027-11-05");
  });

  it("registrar el pago crea el gasto, descuenta la cuenta y mueve la fecha", async () => {
    const rid = await asUser(db, ANA, async () =>
      (await db.query<{ id: string }>(
        `insert into recurring_expenses (user_id, name, amount, frequency, due_day, next_due_date)
         values ($1, 'Internet', 499, 'mensual', 20, '2026-11-20') returning id`, [ANA])).rows[0].id);
    const antes = await saldo();

    await asUser(db, ANA, () =>
      db.query("select pay_recurring_expense($1, '2026-11-18', 499, $2)", [rid, cuenta]));

    const r = await asUser(db, ANA, () =>
      db.query<{ next: string; n: number }>(
        `select next_due_date::text as next,
                (select count(*)::int from transactions where recurring_expense_id = $1) as n
         from recurring_expenses where id = $1`, [rid]));
    expect(r.rows[0]).toEqual({ next: "2026-12-20", n: 1 });
    expect(Number(await saldo())).toBeCloseTo(Number(antes) - 499, 2);
  });

  it("nadie puede pagar el gasto recurrente de otra persona", async () => {
    const rid = await asUser(db, ANA, async () =>
      (await db.query<{ id: string }>("select id from recurring_expenses limit 1")).rows[0].id);
    await expect(
      asUser(db, BETO, () => db.query("select pay_recurring_expense($1, '2026-11-18', 10, null)", [rid])),
    ).rejects.toThrow(/no encontrado/);
  });
});
