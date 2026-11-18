-- =====================================================================
-- FINANZAS AI · Migración 0006
-- Conversaciones con IA, notificaciones y fotos del patrimonio.
-- =====================================================================

create table public.ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  agent       text not null
                check (agent in ('cfo', 'deudas', 'distribucion', 'inversiones', 'noticias', 'planificacion')),
  title       text check (char_length(title) <= 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id)
);

create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);
create trigger ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create table public.ai_messages (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  conversation_id  uuid not null,
  role             text not null check (role in ('user', 'assistant', 'tool')),
  content          text not null check (char_length(content) <= 20000),
  tool_calls       jsonb,
  model            text,
  input_tokens     integer check (input_tokens >= 0),
  output_tokens    integer check (output_tokens >= 0),
  cost_usd         numeric(12,6) check (cost_usd >= 0),
  created_at       timestamptz not null default now(),
  foreign key (conversation_id, user_id)
    references public.ai_conversations (id, user_id) on delete cascade
);

create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

create table public.notifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  type           text not null
                   check (type in ('pago_proximo', 'vencimiento', 'gasto_excesivo', 'meta', 'ingreso',
                                   'noticia', 'portafolio', 'sistema')),
  severity       text not null default 'info' check (severity in ('info', 'aviso', 'urgente')),
  title          text not null check (char_length(title) <= 160),
  body           text check (char_length(body) <= 1000),
  related_table  text,
  related_id     uuid,
  scheduled_for  timestamptz,
  sent_at        timestamptz,
  read_at        timestamptz,
  dedupe_key     text,
  created_at     timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;

create table public.financial_snapshots (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  snapshot_date    date not null,
  cash_total       numeric(14,2) not null,
  committed_total  numeric(14,2) not null,
  allocated_total  numeric(14,2) not null,
  debt_total       numeric(14,2) not null,
  invested_total   numeric(14,2) not null,
  net_worth        numeric(14,2) not null,
  income_month     numeric(14,2) not null,
  expense_month    numeric(14,2) not null,
  details          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  unique (user_id, snapshot_date)
);
