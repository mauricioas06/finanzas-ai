-- =====================================================================
-- FINANZAS AI · Migración 0008 (Fase 2)
-- 1. El saldo de cada cuenta se ajusta solo con sus ingresos y gastos.
-- 2. Vistas de resumen mensual (sumas exactas en la base, respetan RLS).
-- 3. Pago de gasto recurrente en una sola operación atómica.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Saldos automáticos. Un ingreso suma, un gasto resta, borrar revierte.
--    Si el gasto deja la cuenta en negativo, la restricción balance >= 0
--    lo rechaza: no se puede gastar dinero que la cuenta no tiene.
-- ---------------------------------------------------------------------
create or replace function public.apply_transaction_to_account()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  delta numeric(14,2);
begin
  if tg_op in ('UPDATE', 'DELETE') and old.account_id is not null then
    delta := case old.kind when 'ingreso' then old.amount when 'gasto' then -old.amount else 0 end;
    update public.money_accounts
       set balance = balance - delta
     where id = old.account_id and user_id = old.user_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.account_id is not null then
    delta := case new.kind when 'ingreso' then new.amount when 'gasto' then -new.amount else 0 end;
    update public.money_accounts
       set balance = balance + delta
     where id = new.account_id and user_id = new.user_id;
  end if;

  return null;
end;
$$;

create trigger transactions_apply_balance
  after insert or update of amount, kind, account_id or delete on public.transactions
  for each row execute function public.apply_transaction_to_account();

revoke execute on function public.apply_transaction_to_account() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Resúmenes mensuales. security_invoker: cada usuario ve solo lo suyo.
-- ---------------------------------------------------------------------
create view public.v_monthly_cashflow
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', occurred_on)::date as month,
  coalesce(sum(amount) filter (where kind = 'ingreso'), 0)::numeric(14,2) as income,
  coalesce(sum(amount) filter (where kind = 'gasto'), 0)::numeric(14,2) as expense,
  count(*) filter (where kind = 'ingreso') as income_count,
  count(*) filter (where kind = 'gasto') as expense_count
from public.transactions
group by user_id, date_trunc('month', occurred_on);

create view public.v_monthly_category_spend
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', occurred_on)::date as month,
  category_id,
  sum(amount)::numeric(14,2) as total,
  count(*) as tx_count
from public.transactions
where kind = 'gasto'
group by user_id, date_trunc('month', occurred_on), category_id;

grant select on public.v_monthly_cashflow, public.v_monthly_category_spend to authenticated;

create index transactions_user_kind_date_idx on public.transactions (user_id, kind, occurred_on);

-- ---------------------------------------------------------------------
-- 3. Próxima fecha de un gasto recurrente.
--    quincenal: día 15 y último día del mes (como las quincenas en México).
--    mensual/bimestral/trimestral/anual: mismo día, ajustado al fin de mes.
-- ---------------------------------------------------------------------
create or replace function public.next_due_date(cur date, freq text, due_day smallint)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  months int;
  target date;
  wanted int := coalesce(due_day, extract(day from cur)::int);
  last_day int;
begin
  if freq = 'semanal' then
    return cur + 7;
  elsif freq = 'quincenal' then
    if extract(day from cur) < 15 then
      return make_date(extract(year from cur)::int, extract(month from cur)::int, 15);
    elsif cur < (date_trunc('month', cur) + interval '1 month - 1 day')::date then
      return (date_trunc('month', cur) + interval '1 month - 1 day')::date;
    else
      return (date_trunc('month', cur) + interval '1 month 14 days')::date;
    end if;
  end if;

  months := case freq when 'mensual' then 1 when 'bimestral' then 2 when 'trimestral' then 3 when 'anual' then 12 end;
  if months is null then
    raise exception 'Frecuencia desconocida: %', freq;
  end if;

  target := (date_trunc('month', cur) + make_interval(months => months))::date;
  last_day := extract(day from (date_trunc('month', target) + interval '1 month - 1 day'))::int;
  return make_date(extract(year from target)::int, extract(month from target)::int, least(wanted, last_day));
end;
$$;

-- Registra el pago de un gasto recurrente y mueve su próxima fecha.
-- security invoker: corre con los permisos del usuario, así que RLS aplica.
create or replace function public.pay_recurring_expense(
  p_recurring_id uuid,
  p_paid_on date,
  p_amount numeric,
  p_account_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r public.recurring_expenses%rowtype;
  tx_id uuid;
begin
  select * into r from public.recurring_expenses
   where id = p_recurring_id and user_id = auth.uid()
   for update;
  if not found then
    raise exception 'Gasto recurrente no encontrado' using errcode = 'P0002';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero' using errcode = '22023';
  end if;

  insert into public.transactions
    (user_id, kind, amount, occurred_on, description, account_id, category_id, recurring_expense_id)
  values
    (r.user_id, 'gasto', round(p_amount, 2), p_paid_on, r.name, p_account_id, r.category_id, r.id)
  returning id into tx_id;

  update public.recurring_expenses
     set next_due_date = public.next_due_date(coalesce(r.next_due_date, p_paid_on), r.frequency, r.due_day)
   where id = r.id;

  return tx_id;
end;
$$;

revoke execute on function public.pay_recurring_expense(uuid, date, numeric, uuid) from public, anon;
grant execute on function public.pay_recurring_expense(uuid, date, numeric, uuid) to authenticated;
grant execute on function public.next_due_date(date, text, smallint) to authenticated;
