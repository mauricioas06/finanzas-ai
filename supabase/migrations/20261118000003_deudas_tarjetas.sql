-- =====================================================================
-- FINANZAS AI · Migración 0003
-- Deudas, tarjetas de crédito, ciclos de facturación y movimientos.
--   * Fecha de corte (statement_date) ≠ fecha límite de pago (payment_due_date).
--   * Pago mínimo ≠ pago para no generar intereses.
--   * Las cantidades cambian cada mes: viven en billing_cycles, no en la tarjeta.
-- =====================================================================

create table public.debts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  debt_type             text not null
                          check (debt_type in ('tarjeta_credito', 'prestamo_personal', 'financiamiento',
                                               'deuda_personal', 'credito_automotriz', 'hipotecario', 'otra')),
  institution           text not null check (char_length(institution) between 1 and 80),
  name                  text not null check (char_length(name) between 1 and 80),
  current_balance       numeric(14,2) not null default 0 check (current_balance >= 0),
  original_amount       numeric(14,2) check (original_amount > 0),
  -- Tasa anual en porcentaje (54.5 = 54.5 %). En México puede superar 100 %.
  annual_interest_rate  numeric(9,4) check (annual_interest_rate between 0 and 1000),
  minimum_payment       numeric(14,2) check (minimum_payment >= 0),
  fixed_payment         numeric(14,2) check (fixed_payment > 0),
  payment_due_day       smallint check (payment_due_day between 1 and 31),
  start_date            date,
  end_date              date,
  status                text not null default 'activa' check (status in ('activa', 'liquidada', 'en_mora')),
  notes                 text check (char_length(notes) <= 500),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, user_id),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index debts_user_status_idx on public.debts (user_id, status);
create trigger debts_updated_at
  before update on public.debts
  for each row execute function public.set_updated_at();

alter table public.transactions
  add foreign key (debt_id, user_id)
  references public.debts (id, user_id) on delete set null (debt_id);

-- credit_cards: datos fijos de la tarjeta. NUNCA número de tarjeta, CVV ni NIP.
create table public.credit_cards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  debt_id          uuid not null unique,
  credit_limit     numeric(14,2) not null check (credit_limit > 0),
  statement_day    smallint not null check (statement_day between 1 and 31),   -- día de corte
  payment_due_day  smallint not null check (payment_due_day between 1 and 31), -- día límite de pago
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, user_id),
  check (statement_day <> payment_due_day),
  foreign key (debt_id, user_id) references public.debts (id, user_id) on delete cascade
);

create trigger credit_cards_updated_at
  before update on public.credit_cards
  for each row execute function public.set_updated_at();

-- billing_cycles: un renglón por estado de cuenta.
create table public.billing_cycles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  credit_card_id       uuid not null,
  period_start         date not null,
  statement_date       date not null,               -- fecha de corte
  payment_due_date     date not null,               -- fecha límite de pago
  statement_balance    numeric(14,2) check (statement_balance >= 0),   -- saldo al corte
  minimum_payment      numeric(14,2) check (minimum_payment >= 0),     -- pago mínimo
  no_interest_payment  numeric(14,2) check (no_interest_payment >= 0), -- pago para no generar intereses
  interest_charged     numeric(14,2) not null default 0 check (interest_charged >= 0),
  fees_charged         numeric(14,2) not null default 0 check (fees_charged >= 0),
  status               text not null default 'abierto'
                         check (status in ('abierto', 'cerrado', 'pagado', 'vencido')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (id, user_id),
  unique (credit_card_id, statement_date),
  check (statement_date >= period_start),
  check (payment_due_date > statement_date),
  check (minimum_payment is null or no_interest_payment is null
         or minimum_payment <= no_interest_payment),
  foreign key (credit_card_id, user_id)
    references public.credit_cards (id, user_id) on delete cascade
);

create index billing_cycles_user_due_idx on public.billing_cycles (user_id, payment_due_date);
create trigger billing_cycles_updated_at
  before update on public.billing_cycles
  for each row execute function public.set_updated_at();

-- debt_payments: historial de movimientos de cada deuda.
-- kind: abono (reduce), compra/interes/comision (aumentan), ajuste (±).
create table public.debt_payments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  debt_id           uuid not null,
  billing_cycle_id  uuid,
  kind              text not null check (kind in ('abono', 'compra', 'interes', 'comision', 'ajuste')),
  amount            numeric(14,2) not null,
  occurred_on       date not null,
  transaction_id    uuid,
  notes             text check (char_length(notes) <= 300),
  created_at        timestamptz not null default now(),
  unique (id, user_id),
  check ((kind = 'ajuste' and amount <> 0) or (kind <> 'ajuste' and amount > 0)),
  foreign key (debt_id, user_id) references public.debts (id, user_id) on delete cascade,
  foreign key (billing_cycle_id, user_id)
    references public.billing_cycles (id, user_id) on delete set null (billing_cycle_id),
  foreign key (transaction_id, user_id)
    references public.transactions (id, user_id) on delete set null (transaction_id)
);

create index debt_payments_debt_date_idx on public.debt_payments (debt_id, occurred_on desc);
create index debt_payments_user_idx on public.debt_payments (user_id);
