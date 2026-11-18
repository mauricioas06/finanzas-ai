-- =====================================================================
-- FINANZAS AI · Migración 0004
-- Apartados (asignaciones virtuales, no cuentas bancarias), metas y
-- distribución de ingresos. La regla "no comprometer dos veces el mismo
-- dinero" se implementa en la Fase 4 sobre bucket_movements.
-- =====================================================================

create table public.financial_buckets (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  name                    text not null check (char_length(name) between 1 and 60),
  bucket_type             text not null
                            check (bucket_type in ('gastos', 'deudas', 'emergencia', 'inversiones',
                                                   'viajes', 'automovil', 'compras', 'otro')),
  target_amount           numeric(14,2) check (target_amount > 0),
  balance                 numeric(14,2) not null default 0 check (balance >= 0),
  priority                smallint not null default 3 check (priority between 1 and 5),
  target_date             date,
  contribution_frequency  text check (contribution_frequency in ('semanal', 'quincenal', 'mensual')),
  linked_debt_id          uuid,
  color                   text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon                    text check (char_length(icon) <= 40),
  is_archived             boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (id, user_id),
  foreign key (linked_debt_id, user_id)
    references public.debts (id, user_id) on delete set null (linked_debt_id)
);

create unique index financial_buckets_user_name_uidx
  on public.financial_buckets (user_id, lower(name)) where not is_archived;
create trigger financial_buckets_updated_at
  before update on public.financial_buckets
  for each row execute function public.set_updated_at();

create table public.financial_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  bucket_id      uuid,
  name           text not null check (char_length(name) between 1 and 80),
  target_amount  numeric(14,2) not null check (target_amount > 0),
  target_date    date,
  priority       smallint not null default 3 check (priority between 1 and 5),
  status         text not null default 'activa'
                   check (status in ('activa', 'cumplida', 'pausada', 'cancelada')),
  notes          text check (char_length(notes) <= 500),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, user_id),
  foreign key (bucket_id, user_id)
    references public.financial_buckets (id, user_id) on delete set null (bucket_id)
);

create index financial_goals_user_idx on public.financial_goals (user_id, status);
create trigger financial_goals_updated_at
  before update on public.financial_goals
  for each row execute function public.set_updated_at();

-- income_allocations: una propuesta de distribución por cada ingreso.
create table public.income_allocations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  transaction_id   uuid not null,
  received_amount  numeric(14,2) not null check (received_amount > 0),
  received_on      date not null,
  status           text not null default 'propuesta'
                     check (status in ('propuesta', 'aceptada', 'parcial', 'rechazada')),
  engine_version   text not null,
  summary          text check (char_length(summary) <= 2000),
  created_at       timestamptz not null default now(),
  decided_at       timestamptz,
  unique (id, user_id),
  foreign key (transaction_id, user_id)
    references public.transactions (id, user_id) on delete cascade
);

create index income_allocations_user_idx on public.income_allocations (user_id, received_on desc);

create table public.income_allocation_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  allocation_id       uuid not null,
  bucket_id           uuid,
  debt_id             uuid,
  label               text not null check (char_length(label) between 1 and 80),
  recommended_amount  numeric(14,2) not null check (recommended_amount >= 0),
  accepted_amount     numeric(14,2) check (accepted_amount >= 0),
  percentage          numeric(7,4) not null check (percentage between 0 and 100),
  contribution_date   date,
  use_date            date,
  priority            smallint not null check (priority between 1 and 5),
  explanation         text not null check (char_length(explanation) <= 1000),
  status              text not null default 'propuesta'
                        check (status in ('propuesta', 'aceptada', 'modificada', 'rechazada')),
  sort_order          smallint not null default 0,
  unique (id, user_id),
  foreign key (allocation_id, user_id)
    references public.income_allocations (id, user_id) on delete cascade,
  foreign key (bucket_id, user_id)
    references public.financial_buckets (id, user_id) on delete set null (bucket_id),
  foreign key (debt_id, user_id)
    references public.debts (id, user_id) on delete set null (debt_id)
);

create index income_allocation_items_alloc_idx on public.income_allocation_items (allocation_id);

-- bucket_movements: historial de aportaciones y retiros de cada apartado.
create table public.bucket_movements (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  bucket_id           uuid not null,
  kind                text not null check (kind in ('aportacion', 'retiro', 'ajuste')),
  amount              numeric(14,2) not null,
  occurred_on         date not null,
  allocation_item_id  uuid,
  note                text check (char_length(note) <= 300),
  created_at          timestamptz not null default now(),
  unique (id, user_id),
  check ((kind = 'ajuste' and amount <> 0) or (kind <> 'ajuste' and amount > 0)),
  foreign key (bucket_id, user_id)
    references public.financial_buckets (id, user_id) on delete cascade,
  foreign key (allocation_item_id, user_id)
    references public.income_allocation_items (id, user_id) on delete set null (allocation_item_id)
);

create index bucket_movements_bucket_idx on public.bucket_movements (bucket_id, occurred_on desc);
create index bucket_movements_user_idx on public.bucket_movements (user_id);
