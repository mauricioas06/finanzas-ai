-- =====================================================================
-- FINANZAS AI · Migración 0009 (Fase 3)
-- 1. Nuevo tipo de movimiento "pago_deuda": sale dinero de una cuenta para
--    pagar una deuda. NO es un gasto (el gasto se contó al comprar), así que
--    no aparece en los totales de gastos y no se cuenta dos veces.
-- 2. El saldo de cada deuda se ajusta solo con sus movimientos.
-- 3. Operaciones atómicas: pagar deuda y comprar con tarjeta.
-- 4. Alertas de pago 7, 3 y 1 día antes y el día del vencimiento.
-- =====================================================================

-- 1. ------------------------------------------------------------------
alter table public.transactions drop constraint transactions_kind_check;
alter table public.transactions
  add constraint transactions_kind_check check (kind in ('ingreso', 'gasto', 'ajuste', 'pago_deuda'));

create or replace function public.apply_transaction_to_account()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  delta numeric(14,2);
begin
  if tg_op in ('UPDATE', 'DELETE') and old.account_id is not null then
    delta := case old.kind when 'ingreso' then old.amount when 'gasto' then -old.amount
                           when 'pago_deuda' then -old.amount else 0 end;
    update public.money_accounts set balance = balance - delta
     where id = old.account_id and user_id = old.user_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.account_id is not null then
    delta := case new.kind when 'ingreso' then new.amount when 'gasto' then -new.amount
                           when 'pago_deuda' then -new.amount else 0 end;
    update public.money_accounts set balance = balance + delta
     where id = new.account_id and user_id = new.user_id;
  end if;
  return null;
end;
$$;

-- Si se borra el ingreso/gasto/pago, se borra también su movimiento de deuda
-- (y el saldo de la deuda se revierte). Antes quedaba huérfano.
alter table public.debt_payments drop constraint debt_payments_transaction_id_user_id_fkey;
alter table public.debt_payments
  add constraint debt_payments_transaction_id_user_id_fkey
  foreign key (transaction_id, user_id) references public.transactions (id, user_id) on delete cascade;

-- La vista mensual ahora informa también lo pagado a deudas (aparte).
create or replace view public.v_monthly_cashflow
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', occurred_on)::date as month,
  coalesce(sum(amount) filter (where kind = 'ingreso'), 0)::numeric(14,2) as income,
  coalesce(sum(amount) filter (where kind = 'gasto'), 0)::numeric(14,2) as expense,
  count(*) filter (where kind = 'ingreso') as income_count,
  count(*) filter (where kind = 'gasto') as expense_count,
  coalesce(sum(amount) filter (where kind = 'pago_deuda'), 0)::numeric(14,2) as debt_paid
from public.transactions
group by user_id, date_trunc('month', occurred_on);

-- 2. ------------------------------------------------------------------
create or replace function public.debt_movement_delta(kind text, amount numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case kind when 'abono' then -amount when 'ajuste' then amount else amount end
$$;

create or replace function public.apply_debt_movement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.debts
       set current_balance = current_balance - public.debt_movement_delta(old.kind, old.amount)
     where id = old.debt_id and user_id = old.user_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.debts
       set current_balance = current_balance + public.debt_movement_delta(new.kind, new.amount)
     where id = new.debt_id and user_id = new.user_id;
  end if;
  -- Liquidada cuando llega a cero; vuelve a activa si sube otra vez.
  update public.debts
     set status = case when current_balance = 0 then 'liquidada'
                       when status = 'liquidada' then 'activa' else status end
   where id = coalesce(new.debt_id, old.debt_id) and user_id = coalesce(new.user_id, old.user_id);
  return null;
end;
$$;

create trigger debt_payments_apply_balance
  after insert or update of kind, amount, debt_id or delete on public.debt_payments
  for each row execute function public.apply_debt_movement();

revoke execute on function public.apply_debt_movement() from public, anon, authenticated;

-- 3. ------------------------------------------------------------------
-- Pagar una deuda. Con cuenta: sale el dinero de la cuenta. Sin cuenta: solo
-- se registra el abono. Si se indica el estado de cuenta y ya se cubrió el
-- pago para no generar intereses, el ciclo queda como pagado.
create or replace function public.pay_debt(
  p_debt_id uuid,
  p_amount numeric,
  p_paid_on date,
  p_account_id uuid default null,
  p_billing_cycle_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  d public.debts%rowtype;
  tx_id uuid;
  mov_id uuid;
  paid numeric(14,2);
  target numeric(14,2);
begin
  select * into d from public.debts where id = p_debt_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Deuda no encontrada' using errcode = 'P0002';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero' using errcode = '22023';
  end if;

  if p_account_id is not null then
    insert into public.transactions (user_id, kind, amount, occurred_on, description, account_id, debt_id)
    values (d.user_id, 'pago_deuda', round(p_amount, 2), p_paid_on, 'Pago a ' || d.name, p_account_id, d.id)
    returning id into tx_id;
  end if;

  insert into public.debt_payments (user_id, debt_id, billing_cycle_id, kind, amount, occurred_on, transaction_id)
  values (d.user_id, d.id, p_billing_cycle_id, 'abono', round(p_amount, 2), p_paid_on, tx_id)
  returning id into mov_id;

  if p_billing_cycle_id is not null then
    select coalesce(sum(amount), 0) into paid from public.debt_payments
     where billing_cycle_id = p_billing_cycle_id and kind = 'abono' and user_id = d.user_id;
    select coalesce(no_interest_payment, statement_balance, minimum_payment) into target
      from public.billing_cycles where id = p_billing_cycle_id and user_id = d.user_id;
    if target is not null and paid >= target then
      update public.billing_cycles set status = 'pagado' where id = p_billing_cycle_id and user_id = d.user_id;
    end if;
  end if;

  return mov_id;
end;
$$;

-- Compra con tarjeta de crédito: cuenta como gasto (con su categoría) y
-- aumenta la deuda de la tarjeta, en una sola operación.
create or replace function public.card_purchase(
  p_debt_id uuid,
  p_amount numeric,
  p_occurred_on date,
  p_category_id uuid,
  p_description text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  d public.debts%rowtype;
  tx_id uuid;
begin
  select * into d from public.debts
   where id = p_debt_id and user_id = auth.uid() and debt_type = 'tarjeta_credito' for update;
  if not found then
    raise exception 'Tarjeta no encontrada' using errcode = 'P0002';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero' using errcode = '22023';
  end if;

  insert into public.transactions (user_id, kind, amount, occurred_on, description, category_id, debt_id)
  values (d.user_id, 'gasto', round(p_amount, 2), p_occurred_on, p_description, p_category_id, d.id)
  returning id into tx_id;

  insert into public.debt_payments (user_id, debt_id, kind, amount, occurred_on, transaction_id, notes)
  values (d.user_id, d.id, 'compra', round(p_amount, 2), p_occurred_on, tx_id, p_description);

  return tx_id;
end;
$$;

revoke execute on function public.pay_debt(uuid, numeric, date, uuid, uuid) from public, anon;
revoke execute on function public.card_purchase(uuid, numeric, date, uuid, text) from public, anon;
grant execute on function public.pay_debt(uuid, numeric, date, uuid, uuid) to authenticated;
grant execute on function public.card_purchase(uuid, numeric, date, uuid, text) to authenticated;

-- 4. ------------------------------------------------------------------
-- Fecha de hoy en la Ciudad de México.
create or replace function public.today_mx()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'America/Mexico_City')::date $$;

-- Próxima fecha con un día fijo de mes (ajustado al fin de mes), desde una fecha.
create or replace function public.next_day_of_month(from_date date, day_of_month smallint)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  this_month date := date_trunc('month', from_date)::date;
  candidate date;
begin
  candidate := make_date(extract(year from this_month)::int, extract(month from this_month)::int,
                 least(day_of_month, extract(day from (this_month + interval '1 month - 1 day'))::int));
  if candidate >= from_date then
    return candidate;
  end if;
  this_month := (this_month + interval '1 month')::date;
  return make_date(extract(year from this_month)::int, extract(month from this_month)::int,
           least(day_of_month, extract(day from (this_month + interval '1 month - 1 day'))::int));
end;
$$;

-- Crea las alertas que correspondan hoy para el usuario que la llama.
-- security definer porque los usuarios no pueden insertar notificaciones
-- directamente; solo genera alertas para auth.uid() y a partir de sus datos.
create or replace function public.sync_payment_alerts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := public.today_mx();
  created integer;
begin
  if uid is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;

  with items as (
    -- Estados de cuenta de tarjetas sin pagar
    select 'tarjeta'::text as src, bc.id, bc.payment_due_date as due,
           d.name, d.institution,
           coalesce(bc.no_interest_payment, bc.minimum_payment) as amount,
           'billing_cycles'::text as rel
      from public.billing_cycles bc
      join public.credit_cards cc on cc.id = bc.credit_card_id
      join public.debts d on d.id = cc.debt_id
     where bc.user_id = uid and bc.status <> 'pagado' and d.status <> 'liquidada'
    union all
    -- Préstamos con día de pago (sin abono en los últimos 25 días)
    select 'prestamo', d.id, public.next_day_of_month(today - 3, d.payment_due_day),
           d.name, d.institution, coalesce(d.fixed_payment, d.minimum_payment), 'debts'
      from public.debts d
     where d.user_id = uid and d.debt_type <> 'tarjeta_credito' and d.status = 'activa'
       and d.payment_due_day is not null
       and not exists (select 1 from public.debt_payments p
                        where p.debt_id = d.id and p.kind = 'abono' and p.occurred_on > today - 25)
    union all
    -- Gastos recurrentes
    select 'recurrente', r.id, r.next_due_date, r.name, null, r.amount, 'recurring_expenses'
      from public.recurring_expenses r
     where r.user_id = uid and r.is_active and r.next_due_date is not null
  ),
  staged as (
    select i.*, (i.due - today) as days,
           case when i.due < today then -1 when i.due = today then 0 when i.due - today = 1 then 1
                when i.due - today <= 3 then 3 when i.due - today <= 7 then 7 end as bucket
      from items i
     where i.due between today - 30 and today + 7
  ),
  inserted as (
    insert into public.notifications
      (user_id, type, severity, title, body, related_table, related_id, scheduled_for, dedupe_key)
    select uid,
           case when s.bucket < 0 then 'vencimiento' else 'pago_proximo' end,
           case when s.bucket <= 1 then 'urgente' when s.bucket = 3 then 'aviso' else 'info' end,
           case when s.bucket < 0 then 'Pago vencido: ' || s.name
                when s.bucket = 0 then 'Hoy vence: ' || s.name
                when s.bucket = 1 then 'Mañana vence: ' || s.name
                else 'En ' || s.days || ' días vence: ' || s.name end,
           concat_ws(' · ', s.institution, 'Fecha límite ' || to_char(s.due, 'DD/MM/YYYY'),
                     case when s.amount is not null then 'Monto $' || to_char(s.amount, 'FM999,999,990.00') end),
           s.rel, s.id, now(),
           s.src || ':' || s.id || ':' || s.due || ':' || s.bucket
      from staged s
     where s.bucket is not null
    on conflict (user_id, dedupe_key) do nothing
    returning 1
  )
  select count(*) into created from inserted;
  return created;
end;
$$;

revoke execute on function public.sync_payment_alerts() from public, anon;
grant execute on function public.sync_payment_alerts() to authenticated;
grant execute on function public.today_mx() to authenticated;
grant execute on function public.next_day_of_month(date, smallint) to authenticated;
