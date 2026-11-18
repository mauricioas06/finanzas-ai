-- =====================================================================
-- FINANZAS AI · Migración 0002
-- Mi dinero, ingresos, categorías, gastos recurrentes y transacciones.
-- Cada tabla personal tiene unique (id, user_id) para permitir llaves
-- foráneas compuestas: un usuario no puede ligar sus filas a las de otro.
-- =====================================================================

-- money_accounts: dónde está el dinero. Saldos capturados por el usuario.
create table public.money_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 80),
  account_type  text not null
                  check (account_type in ('efectivo', 'debito', 'ahorro', 'cartera_digital', 'otro')),
  institution   text check (char_length(institution) <= 80),
  balance       numeric(14,2) not null default 0 check (balance >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, user_id)
);

create index money_accounts_user_idx on public.money_accounts (user_id);
create trigger money_accounts_updated_at
  before update on public.money_accounts
  for each row execute function public.set_updated_at();

-- income_sources: fuentes de ingreso. Un ingreso variable no tiene monto
-- esperado: no se asume que se repetirá igual cada mes.
create table public.income_sources (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  name                text not null check (char_length(name) between 1 and 80),
  income_type         text not null
                        check (income_type in ('sueldo', 'bono', 'comision', 'trabajo_adicional',
                                               'negocio', 'extraordinario', 'otro')),
  frequency           text not null
                        check (frequency in ('unica', 'semanal', 'quincenal', 'mensual', 'variable')),
  expected_amount     numeric(14,2) check (expected_amount > 0),
  is_variable         boolean not null default false,
  pay_days            smallint[] check (
                        pay_days is null
                        or (cardinality(pay_days) between 1 and 4
                            and 1 <= all (pay_days) and 31 >= all (pay_days))),
  pay_weekday         smallint check (pay_weekday between 0 and 6),
  next_expected_date  date,
  description         text check (char_length(description) <= 300),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (id, user_id),
  check (not (is_variable and expected_amount is not null))
);

create index income_sources_user_idx on public.income_sources (user_id);
create trigger income_sources_updated_at
  before update on public.income_sources
  for each row execute function public.set_updated_at();

-- expense_categories: categorías configurables con presupuesto mensual.
create table public.expense_categories (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 60),
  icon            text check (char_length(icon) <= 40),
  color           text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  monthly_budget  numeric(14,2) check (monthly_budget >= 0),
  is_essential    boolean not null default false,
  sort_order      smallint not null default 0,
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, user_id)
);

create unique index expense_categories_user_name_uidx
  on public.expense_categories (user_id, lower(name));
create trigger expense_categories_updated_at
  before update on public.expense_categories
  for each row execute function public.set_updated_at();

-- recurring_expenses: gastos que se repiten (renta, luz, streaming...).
create table public.recurring_expenses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  category_id    uuid,
  name           text not null check (char_length(name) between 1 and 80),
  amount         numeric(14,2) not null check (amount > 0),
  frequency      text not null
                   check (frequency in ('semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'anual')),
  due_day        smallint check (due_day between 1 and 31),
  next_due_date  date,
  is_essential   boolean not null default true,
  is_active      boolean not null default true,
  notes          text check (char_length(notes) <= 300),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id)
    references public.expense_categories (id, user_id) on delete set null (category_id)
);

create index recurring_expenses_user_due_idx on public.recurring_expenses (user_id, next_due_date);
create trigger recurring_expenses_updated_at
  before update on public.recurring_expenses
  for each row execute function public.set_updated_at();

-- transactions: ingresos, gastos y ajustes. amount siempre positivo; el
-- sentido lo da "kind". debt_id se liga a deudas en la migración 0003.
create table public.transactions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  kind                  text not null check (kind in ('ingreso', 'gasto', 'ajuste')),
  amount                numeric(14,2) not null check (amount > 0),
  occurred_on           date not null,
  description           text check (char_length(description) <= 300),
  account_id            uuid,
  income_source_id      uuid,
  income_type           text check (income_type in ('sueldo', 'bono', 'comision', 'trabajo_adicional',
                                                    'negocio', 'extraordinario', 'otro')),
  category_id           uuid,
  recurring_expense_id  uuid,
  debt_id               uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, user_id),
  check (kind = 'ingreso' or (income_source_id is null and income_type is null)),
  check (kind = 'gasto' or (category_id is null and recurring_expense_id is null)),
  foreign key (account_id, user_id)
    references public.money_accounts (id, user_id) on delete set null (account_id),
  foreign key (income_source_id, user_id)
    references public.income_sources (id, user_id) on delete set null (income_source_id),
  foreign key (category_id, user_id)
    references public.expense_categories (id, user_id) on delete set null (category_id),
  foreign key (recurring_expense_id, user_id)
    references public.recurring_expenses (id, user_id) on delete set null (recurring_expense_id)
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_user_category_idx on public.transactions (user_id, category_id);
create trigger transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();
