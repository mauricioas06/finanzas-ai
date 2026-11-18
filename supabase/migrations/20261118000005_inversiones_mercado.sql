-- =====================================================================
-- FINANZAS AI · Migración 0005
-- Portafolio personal (registro manual) y datos de mercado globales.
-- Las tablas de mercado son compartidas: los usuarios solo las leen y
-- el servidor las llena con la llave de servicio.
-- Precios y cantidades: numeric(24,8).
-- =====================================================================

-- ------------------------- Datos de mercado (globales) ----------------
create table public.market_assets (
  id           uuid primary key default gen_random_uuid(),
  symbol       text not null check (char_length(symbol) between 1 and 30),
  name         text not null check (char_length(name) between 1 and 160),
  asset_class  text not null
                 check (asset_class in ('accion_us', 'accion_mx', 'etf', 'fibra', 'fondo', 'renta_fija',
                                        'cetes', 'sofipo', 'cripto', 'indice', 'otro')),
  exchange     text,
  currency     text not null check (currency in ('MXN', 'USD')),
  sector       text,
  country      text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create unique index market_assets_symbol_uidx
  on public.market_assets (upper(symbol), coalesce(exchange, ''));

create table public.market_prices (
  id          bigint generated always as identity primary key,
  asset_id    uuid not null references public.market_assets (id) on delete cascade,
  price_date  date not null,
  open        numeric(24,8),
  high        numeric(24,8),
  low         numeric(24,8),
  close       numeric(24,8) not null check (close >= 0),
  volume      numeric(24,2),
  source      text not null,
  fetched_at  timestamptz not null default now(),
  unique (asset_id, price_date, source)
);

create index market_prices_asset_date_idx on public.market_prices (asset_id, price_date desc);

-- Noticias: texto externo NO confiable. Nunca se usa como instrucción.
create table public.financial_news (
  id                   uuid primary key default gen_random_uuid(),
  headline             text not null check (char_length(headline) <= 500),
  source               text not null,
  url                  text not null unique check (url ~ '^https?://'),
  published_at         timestamptz not null,
  event_date           date,
  summary              text,
  sentiment            text check (sentiment in ('positivo', 'negativo', 'neutral', 'mixto')),
  impact               text,
  risks                text,
  topics               text[] not null default '{}',
  related_symbols      text[] not null default '{}',
  verification_status  text not null default 'sin_verificar'
                         check (verification_status in ('sin_verificar', 'corroborada', 'contradictoria', 'rumor')),
  provider             text,
  fetched_at           timestamptz not null default now()
);

create index financial_news_published_idx on public.financial_news (published_at desc);
create index financial_news_symbols_idx on public.financial_news using gin (related_symbols);

create table public.investment_analyses (
  id               uuid primary key default gen_random_uuid(),
  asset_id         uuid not null references public.market_assets (id) on delete cascade,
  analysis_date    date not null,
  data_as_of       timestamptz not null,
  fundamentals     jsonb not null default '{}'::jsonb,
  technicals       jsonb not null default '{}'::jsonb,
  score_breakdown  jsonb not null default '{}'::jsonb,
  total_score      smallint not null check (total_score between 0 and 100),
  risk_level       text not null check (risk_level in ('bajo', 'medio', 'alto', 'muy_alto')),
  horizon          text not null check (horizon in ('corto', 'mediano', 'largo')),
  catalysts        text[] not null default '{}',
  risks            text[] not null default '{}',
  rationale        text not null,
  model            text,
  prompt_version   text not null,
  created_at       timestamptz not null default now(),
  unique (asset_id, analysis_date, prompt_version)
);

create index investment_analyses_score_idx on public.investment_analyses (analysis_date desc, total_score desc);

-- ------------------------- Portafolio personal ------------------------
create table public.investment_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  institution   text not null check (char_length(institution) between 1 and 80),
  name          text not null check (char_length(name) between 1 and 80),
  account_type  text not null check (account_type in ('bursatil', 'cetes', 'sofipo', 'fondos', 'cripto', 'otro')),
  currency      text not null default 'MXN' check (currency in ('MXN', 'USD')),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, user_id)
);

create index investment_accounts_user_idx on public.investment_accounts (user_id);
create trigger investment_accounts_updated_at
  before update on public.investment_accounts
  for each row execute function public.set_updated_at();

create table public.investment_positions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  account_id            uuid not null,
  asset_id              uuid references public.market_assets (id) on delete set null,
  instrument_name       text not null check (char_length(instrument_name) between 1 and 120),
  instrument_type       text not null
                          check (instrument_type in ('accion_us', 'accion_mx', 'etf', 'fibra', 'fondo', 'renta_fija',
                                                     'cetes', 'sofipo', 'cripto', 'otro')),
  quantity              numeric(24,8) not null default 0 check (quantity >= 0),
  average_cost          numeric(24,8) not null default 0 check (average_cost >= 0),
  currency              text not null default 'MXN' check (currency in ('MXN', 'USD')),
  manual_current_value  numeric(14,2) check (manual_current_value >= 0),
  manual_value_date     date,
  annual_rate           numeric(9,4) check (annual_rate between 0 and 1000),
  maturity_date         date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id)
    references public.investment_accounts (id, user_id) on delete cascade
);

create index investment_positions_user_idx on public.investment_positions (user_id);
create trigger investment_positions_updated_at
  before update on public.investment_positions
  for each row execute function public.set_updated_at();

create table public.investment_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  account_id      uuid not null,
  position_id     uuid,
  tx_type         text not null
                    check (tx_type in ('compra', 'venta', 'dividendo', 'interes', 'comision', 'deposito', 'retiro')),
  trade_date      date not null,
  quantity        numeric(24,8) check (quantity > 0),
  price           numeric(24,8) check (price >= 0),
  fees            numeric(14,2) not null default 0 check (fees >= 0),
  total_amount    numeric(14,2) not null check (total_amount >= 0),
  currency        text not null default 'MXN' check (currency in ('MXN', 'USD')),
  fx_rate_to_mxn  numeric(18,8) check (fx_rate_to_mxn > 0),
  notes           text check (char_length(notes) <= 300),
  created_at      timestamptz not null default now(),
  unique (id, user_id),
  check (tx_type not in ('compra', 'venta') or (quantity is not null and price is not null)),
  check (currency = 'MXN' or fx_rate_to_mxn is not null),
  foreign key (account_id, user_id)
    references public.investment_accounts (id, user_id) on delete cascade,
  foreign key (position_id, user_id)
    references public.investment_positions (id, user_id) on delete set null (position_id)
);

create index investment_transactions_user_date_idx on public.investment_transactions (user_id, trade_date desc);

-- Recomendaciones personalizadas: propuestas, nunca órdenes de compra.
create table public.investment_recommendations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  amount_available    numeric(14,2) not null check (amount_available >= 0),
  risk_profile        text not null check (risk_profile in ('conservador', 'moderado', 'agresivo')),
  status              text not null default 'generada' check (status in ('generada', 'aceptada', 'descartada')),
  recommendation      jsonb not null,
  analysis_ids        uuid[] not null default '{}',
  data_as_of          timestamptz not null,
  model               text,
  disclaimer_version  text not null,
  created_at          timestamptz not null default now(),
  unique (id, user_id)
);

create index investment_recommendations_user_idx on public.investment_recommendations (user_id, created_at desc);
