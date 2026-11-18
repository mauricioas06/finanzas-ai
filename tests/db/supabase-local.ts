/**
 * Base de datos de prueba: PostgreSQL real (PGlite) que imita lo mínimo de
 * Supabase (roles anon/authenticated/service_role, esquema auth, auth.uid()).
 * Aplica las migraciones de supabase/migrations en orden.
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

const SUPABASE_STUB = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  -- Supabase da estos permisos por defecto; las migraciones los restringen.
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    } catch (err) {
      throw new Error(`Falló la migración ${file}: ${(err as Error).message}`);
    }
  }
  return db;
}

export async function createUser(db: PGlite, id: string, fullName: string) {
  await db.query(
    "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)",
    [id, `${id.slice(0, 8)}@prueba.test`, JSON.stringify({ full_name: fullName })],
  );
}

/** Ejecuta fn como un usuario autenticado (o anónimo si userId es null). */
export async function asUser<T>(db: PGlite, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.exec(userId ? "set role authenticated" : "set role anon");
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}
