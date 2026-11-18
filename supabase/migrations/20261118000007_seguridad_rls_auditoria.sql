-- =====================================================================
-- FINANZAS AI · Migración 0007
-- Seguridad: Row Level Security, permisos, auditoría y alta de usuarios.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Auditoría de operaciones financieras. Sin FK a auth.users para que el
-- registro sobreviva al borrado en cascada (se depura en la Fase 8).
-- ---------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid,
  table_name  text not null,
  record_id   uuid,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  actor       uuid,
  created_at  timestamptz not null default now()
);

create index audit_log_user_idx on public.audit_log (user_id, created_at desc);

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
begin
  if tg_op = 'DELETE' then r := to_jsonb(old); else r := to_jsonb(new); end if;
  insert into public.audit_log (user_id, table_name, record_id, action, old_data, new_data, actor)
  values (
    (r ->> 'user_id')::uuid,
    tg_table_name,
    (r ->> 'id')::uuid,
    tg_op,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end,
    auth.uid()
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'money_accounts', 'transactions', 'debts', 'credit_cards', 'billing_cycles', 'debt_payments',
    'financial_buckets', 'bucket_movements', 'financial_goals', 'income_allocations',
    'income_allocation_items', 'investment_accounts', 'investment_positions', 'investment_transactions'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_trigger()',
      t || '_audit', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS en TODAS las tablas de public. Nadie anónimo entra a nada.
-- ---------------------------------------------------------------------
grant usage on schema public to authenticated;

do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- Tablas personales: el usuario lee y escribe solo sus filas.
do $$
declare
  t text;
begin
  foreach t in array array[
    'money_accounts', 'income_sources', 'expense_categories', 'recurring_expenses', 'transactions',
    'debts', 'credit_cards', 'billing_cycles', 'debt_payments',
    'financial_buckets', 'bucket_movements', 'financial_goals', 'income_allocations', 'income_allocation_items',
    'investment_accounts', 'investment_positions', 'investment_transactions', 'investment_recommendations',
    'ai_conversations', 'ai_messages', 'financial_snapshots'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
                   t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
                   t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
                   t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
                   t || '_delete_own', t);
  end loop;
end;
$$;

-- profiles: leer y editar el propio perfil (lo crea el trigger de alta).
grant select on public.profiles to authenticated;
grant update (full_name, pay_frequency, risk_profile, emergency_fund_months,
              onboarding_completed, privacy_accepted_at)
  on public.profiles to authenticated;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Solo lectura de lo propio: plan, consumo y auditoría.
grant select on public.subscriptions, public.usage_events, public.audit_log to authenticated;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy usage_events_select_own on public.usage_events
  for select to authenticated using (user_id = (select auth.uid()));
create policy audit_log_select_own on public.audit_log
  for select to authenticated using (user_id = (select auth.uid()));

-- Notificaciones: leer y marcar como leídas.
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Tablas globales: lectura para usuarios con sesión.
do $$
declare
  t text;
begin
  foreach t in array array['plan_limits', 'market_assets', 'market_prices', 'financial_news', 'investment_analyses'] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select_all', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Alta de usuario: perfil, plan gratuito y categorías iniciales.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, privacy_accepted_at)
  values (
    new.id,
    left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 120),
    case when new.raw_user_meta_data ->> 'privacy_accepted' = 'true' then now() end
  );

  insert into public.subscriptions (user_id) values (new.id);

  insert into public.expense_categories (user_id, name, icon, color, is_essential, sort_order) values
    (new.id, 'Vivienda',        'home',         '#60A5FA', true,  1),
    (new.id, 'Alimentación',    'utensils',     '#34D399', true,  2),
    (new.id, 'Transporte',      'bus',          '#FBBF24', true,  3),
    (new.id, 'Servicios',       'zap',          '#A78BFA', true,  4),
    (new.id, 'Salud',           'heart-pulse',  '#F87171', true,  5),
    (new.id, 'Entretenimiento', 'film',         '#F472B6', false, 6),
    (new.id, 'Compras',         'shopping-bag', '#FB923C', false, 7),
    (new.id, 'Suscripciones',   'repeat',       '#22D3EE', false, 8),
    (new.id, 'Otros',           'circle',       '#94A3B8', false, 9);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Las funciones internas no se pueden llamar desde la API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.audit_trigger() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
