-- =====================================================================
-- FINANZAS AI · Migración 0001
-- Base: utilidades, perfiles, suscripciones, límites de plan y consumo.
-- "users" es auth.users (administrada por Supabase Auth).
-- Convención de dinero: numeric(14,2) en MXN. Nunca float.
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles: datos del usuario y preferencias financieras
create table public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  full_name              text check (char_length(full_name) <= 120),
  currency               text not null default 'MXN' check (currency = 'MXN'),
  locale                 text not null default 'es-MX' check (locale = 'es-MX'),
  timezone               text not null default 'America/Mexico_City',
  pay_frequency          text not null default 'quincenal'
                           check (pay_frequency in ('semanal', 'quincenal', 'mensual', 'variable')),
  risk_profile           text check (risk_profile in ('conservador', 'moderado', 'agresivo')),
  emergency_fund_months  numeric(4,1) not null default 3
                           check (emergency_fund_months between 0 and 24),
  onboarding_completed   boolean not null default false,
  privacy_accepted_at    timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- subscriptions: plan del usuario. Solo el servidor (service_role) la
-- modifica; el usuario solo la lee. Sin cobros reales en el MVP.
create table public.subscriptions (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  plan                  text not null default 'free' check (plan in ('free', 'premium')),
  status                text not null default 'activa' check (status in ('activa', 'cancelada', 'vencida')),
  provider              text,
  provider_customer_id  text,
  current_period_end    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- plan_limits: tope mensual por función y plan (tabla global).
-- monthly_limit nulo = sin límite; 0 = función no incluida en el plan.
create table public.plan_limits (
  plan           text not null check (plan in ('free', 'premium')),
  feature        text not null,
  monthly_limit  integer check (monthly_limit >= 0),
  description    text,
  primary key (plan, feature)
);

insert into public.plan_limits (plan, feature, monthly_limit, description) values
  ('free',    'ia_cfo_mensajes',    0,    'Mensajes al CFO con IA'),
  ('free',    'ia_distribucion',    0,    'Distribuciones explicadas por IA'),
  ('free',    'radar_analisis',     0,    'Análisis del Investment Radar'),
  ('free',    'recomendaciones',    0,    'Recomendaciones de inversión personalizadas'),
  ('free',    'reportes_avanzados', 0,    'Reportes avanzados y exportación'),
  ('premium', 'ia_cfo_mensajes',    300,  'Mensajes al CFO con IA'),
  ('premium', 'ia_distribucion',    60,   'Distribuciones explicadas por IA'),
  ('premium', 'radar_analisis',     100,  'Análisis del Investment Radar'),
  ('premium', 'recomendaciones',    20,   'Recomendaciones de inversión personalizadas'),
  ('premium', 'reportes_avanzados', null, 'Reportes avanzados y exportación');

-- usage_events: consumo de IA y datos de mercado por usuario.
-- Lo escribe el servidor; el usuario solo lo lee.
create table public.usage_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  feature     text not null,
  units       integer not null default 1 check (units > 0),
  cost_usd    numeric(12,6) not null default 0 check (cost_usd >= 0),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index usage_events_user_feature_idx
  on public.usage_events (user_id, feature, created_at desc);
