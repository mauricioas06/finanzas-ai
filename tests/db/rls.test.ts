import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createTestDb, createUser } from "./supabase-local";

const ANA = "11111111-1111-4111-8111-111111111111";
const BETO = "22222222-2222-4222-8222-222222222222";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ANA, "Ana Prueba");
  await createUser(db, BETO, "Beto Prueba");
}, 60_000);

describe("migraciones y alta de usuario", () => {
  it("crea perfil, plan gratuito y 9 categorías al registrarse", async () => {
    const r = await asUser(db, ANA, async () => ({
      profile: await db.query<{ full_name: string; currency: string; timezone: string }>(
        "select full_name, currency, timezone from profiles"),
      plan: await db.query<{ plan: string }>("select plan from subscriptions"),
      cats: await db.query("select id from expense_categories"),
    }));
    expect(r.profile.rows).toEqual([
      { full_name: "Ana Prueba", currency: "MXN", timezone: "America/Mexico_City" },
    ]);
    expect(r.plan.rows).toEqual([{ plan: "free" }]);
    expect(r.cats.rows).toHaveLength(9);
  });

  it("todas las tablas de public tienen RLS activado", async () => {
    const r = await db.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' and not rowsecurity");
    expect(r.rows).toEqual([]);
  });
});

describe("aislamiento entre usuarios (RLS)", () => {
  it("cada usuario ve solo sus categorías y su perfil", async () => {
    const ana = await asUser(db, ANA, () => db.query<{ user_id: string }>("select distinct user_id from expense_categories"));
    expect(ana.rows).toEqual([{ user_id: ANA }]);
    const perfiles = await asUser(db, BETO, () => db.query("select id from profiles"));
    expect(perfiles.rows).toEqual([{ id: BETO }]);
  });

  it("no se puede insertar a nombre de otro usuario", async () => {
    await expect(
      asUser(db, ANA, () =>
        db.query("insert into money_accounts (user_id, name, account_type) values ($1, 'Robo', 'efectivo')", [BETO])),
    ).rejects.toThrow(/row-level security/);
  });

  it("no se puede ligar un gasto a la categoría de otro usuario", async () => {
    const catBeto = await asUser(db, BETO, () =>
      db.query<{ id: string }>("select id from expense_categories limit 1"));
    await expect(
      asUser(db, ANA, () =>
        db.query(
          `insert into transactions (user_id, kind, amount, occurred_on, category_id)
           values ($1, 'gasto', 100, '2026-11-18', $2)`,
          [ANA, catBeto.rows[0].id])),
    ).rejects.toThrow(/foreign key/);
  });

  it("no se pueden modificar ni borrar filas ajenas", async () => {
    const r = await asUser(db, ANA, () =>
      db.query("update expense_categories set name = 'Hackeado' where user_id = $1", [BETO]));
    expect(r.affectedRows ?? 0).toBe(0);
    const d = await asUser(db, ANA, () => db.query("delete from expense_categories where user_id = $1", [BETO]));
    expect(d.affectedRows ?? 0).toBe(0);
    const cats = await asUser(db, BETO, () => db.query("select id from expense_categories"));
    expect(cats.rows).toHaveLength(9);
  });

  it("un visitante sin sesión no puede leer nada", async () => {
    await expect(asUser(db, null, () => db.query("select * from profiles"))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, null, () => db.query("select * from plan_limits"))).rejects.toThrow(/permission denied/);
  });

  it("el usuario no puede subirse de plan ni borrar su auditoría", async () => {
    await expect(
      asUser(db, ANA, () => db.query("update subscriptions set plan = 'premium'")),
    ).rejects.toThrow(/permission denied/);
    await expect(asUser(db, ANA, () => db.query("delete from audit_log"))).rejects.toThrow(/permission denied/);
  });

  it("el perfil solo permite editar columnas permitidas", async () => {
    await asUser(db, ANA, () => db.query("update profiles set pay_frequency = 'mensual'"));
    await expect(asUser(db, ANA, () => db.query("update profiles set currency = 'USD'"))).rejects.toThrow(
      /permission denied/);
  });

  it("las tablas de mercado son de solo lectura para usuarios", async () => {
    await expect(
      asUser(db, ANA, () =>
        db.query("insert into market_assets (symbol, name, asset_class, currency) values ('X', 'X', 'otro', 'MXN')")),
    ).rejects.toThrow(/permission denied/);
    const r = await asUser(db, ANA, () => db.query("select count(*)::int as n from plan_limits"));
    expect(r.rows).toEqual([{ n: 10 }]);
  });
});

describe("reglas financieras en la base", () => {
  async function crearTarjeta(): Promise<string> {
    return asUser(db, ANA, async () => {
      const debt = await db.query<{ id: string }>(
        `insert into debts (user_id, debt_type, institution, name, current_balance)
         values ($1, 'tarjeta_credito', 'Banco Prueba', 'Tarjeta Oro', 5000) returning id`, [ANA]);
      const card = await db.query<{ id: string }>(
        `insert into credit_cards (user_id, debt_id, credit_limit, statement_day, payment_due_day)
         values ($1, $2, 20000, 5, 25) returning id`, [ANA, debt.rows[0].id]);
      return card.rows[0].id;
    });
  }

  it("la fecha límite de pago debe ser posterior a la fecha de corte", async () => {
    const card = await crearTarjeta();
    await expect(
      asUser(db, ANA, () =>
        db.query(
          `insert into billing_cycles (user_id, credit_card_id, period_start, statement_date, payment_due_date)
           values ($1, $2, '2026-10-06', '2026-11-05', '2026-11-05')`, [ANA, card])),
    ).rejects.toThrow(/check constraint/);
  });

  it("el pago mínimo no puede ser mayor al pago para no generar intereses", async () => {
    const card = await crearTarjeta();
    await expect(
      asUser(db, ANA, () =>
        db.query(
          `insert into billing_cycles (user_id, credit_card_id, period_start, statement_date, payment_due_date,
                                       minimum_payment, no_interest_payment)
           values ($1, $2, '2026-10-06', '2026-11-05', '2026-11-25', 6000, 5000)`, [ANA, card])),
    ).rejects.toThrow(/check constraint/);
  });

  it("los montos se suman con precisión decimal exacta", async () => {
    const r = await asUser(db, ANA, async () => {
      for (const amount of ["0.10", "0.20", "1234567.89"]) {
        await db.query(
          "insert into transactions (user_id, kind, amount, occurred_on) values ($1, 'ajuste', $2, '2026-11-18')",
          [ANA, amount]);
      }
      return db.query<{ total: string }>(
        "select sum(amount)::text as total from transactions where kind = 'ajuste'");
    });
    expect(r.rows[0].total).toBe("1234568.19");
  });

  it("las operaciones financieras quedan en la auditoría del usuario", async () => {
    const r = await asUser(db, ANA, () =>
      db.query<{ table_name: string }>(
        "select distinct table_name from audit_log where action = 'INSERT' order by table_name"));
    expect(r.rows.map((x) => x.table_name)).toEqual(["credit_cards", "debts", "transactions"]);
    const beto = await asUser(db, BETO, () => db.query("select id from audit_log"));
    expect(beto.rows).toEqual([]);
  });
});
