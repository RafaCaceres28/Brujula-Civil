-- =========================================================
-- 20260309_001_init_schema.sql
-- Brújula Civil
-- Esquema base de datos:
-- - extensiones
-- - función updated_at
-- - enums
-- - tablas
-- - índices
-- - triggers
-- =========================================================

-- =========================================================
-- EXTENSIONES
-- =========================================================
create extension if not exists pgcrypto;

-- =========================================================
-- FUNCION AUXILIAR updated_at
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- =========================================================
-- ENUMS
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'wizard_step_key') then
    create type public.wizard_step_key as enum (
      'welcome',
      'personal_info',
      'military_background',
      'missions_achievements',
      'skills_tools',
      'education_certifications',
      'preferences',
      'civil_translation',
      'cv_customization',
      'linkedin_customization',
      'review',
      'completed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'document_kind') then
    create type public.document_kind as enum (
      'cv',
      'linkedin',
      'cover_letter',
      'profile_export'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'document_format') then
    create type public.document_format as enum (
      'json',
      'markdown',
      'html',
      'txt',
      'pdf'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'generation_status') then
    create type public.generation_status as enum (
      'draft',
      'processing',
      'ready',
      'archived',
      'failed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'publication_status') then
    create type public.publication_status as enum (
      'draft',
      'published',
      'paused',
      'archived'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'organization_role') then
    create type public.organization_role as enum (
      'owner',
      'admin',
      'recruiter',
      'viewer'
    );
  end if;
end $$;

-- =========================================================
-- TABLA: app_user_profiles
-- Perfil general del usuario dentro de la app
-- 1:1 con auth.users
-- =========================================================
create table if not exists public.app_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  locale text not null default 'es',
  timezone text not null default 'Europe/Madrid',
  onboarding_completed boolean not null default false,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_app_user_profiles_updated_at
before update on public.app_user_profiles
for each row
execute function public.set_updated_at();

-- =========================================================
-- TABLA: user_military_profiles
-- Perfil militar original del usuario
-- Guarda:
-- - campos legibles
-- - texto original
-- - json bruto de entrada
-- =========================================================
create table if not exists public.user_military_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  is_current boolean not null default true,

  branch text,
  component text,
  rank_text text,
  specialty_text text,
  service_years integer check (service_years is null or service_years >= 0),
  latest_unit text,
  latest_role_title text,

  source_text text,
  raw_profile_jsonb jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_user_military_profiles_current
  on public.user_military_profiles(user_id)
  where is_current = true;

create index if not exists ix_user_military_profiles_user_id
  on public.user_military_profiles(user_id);

create index if not exists ix_user_military_profiles_raw_profile_jsonb
  on public.user_military_profiles using gin(raw_profile_jsonb);

create trigger trg_user_military_profiles_updated_at
before update on public.user_military_profiles
for each row
execute function public.set_updated_at();

-- =========================================================
-- TABLA: user_civil_profiles
-- Perfil civil generado/versionado
-- Separado del militar para poder regenerar y versionar
-- =========================================================
create table if not exists public.user_civil_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  military_profile_id uuid not null references public.user_military_profiles(id) on delete cascade,

  version_no integer not null check (version_no > 0),
  is_current boolean not null default true,
  status public.generation_status not null default 'draft',

  target_role text,
  target_sector text,
  headline text,
  summary text,
  structured_profile_jsonb jsonb not null default '{}'::jsonb,

  generator_name text,
  generator_version text,
  prompt_version text,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint uq_user_civil_profiles_version unique (user_id, version_no)
);

create unique index if not exists uq_user_civil_profiles_current
  on public.user_civil_profiles(user_id)
  where is_current = true;

create index if not exists ix_user_civil_profiles_user_id
  on public.user_civil_profiles(user_id);

create index if not exists ix_user_civil_profiles_military_profile_id
  on public.user_civil_profiles(military_profile_id);

create index if not exists ix_user_civil_profiles_status
  on public.user_civil_profiles(status);

create index if not exists ix_user_civil_profiles_structured_jsonb
  on public.user_civil_profiles using gin(structured_profile_jsonb);

create trigger trg_user_civil_profiles_updated_at
before update on public.user_civil_profiles
for each row
execute function public.set_updated_at();

-- =========================================================
-- TABLA: user_wizard_state
-- Estado global/resumido del wizard
-- Sirve para:
-- - saber el paso actual
-- - reanudar
-- - porcentaje
-- - draft agregado
-- =========================================================
create table if not exists public.user_wizard_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_step public.wizard_step_key not null default 'welcome',
  last_completed_step public.wizard_step_key,
  completion_percent numeric(5,2) not null default 0
    check (completion_percent >= 0 and completion_percent <= 100),
  is_completed boolean not null default false,

  aggregated_draft_jsonb jsonb not null default '{}'::jsonb,

  started_at timestamptz not null default timezone('utc', now()),
  last_saved_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists ix_user_wizard_state_current_step
  on public.user_wizard_state(current_step);

create index if not exists ix_user_wizard_state_aggregated_draft_jsonb
  on public.user_wizard_state using gin(aggregated_draft_jsonb);

create trigger trg_user_wizard_state_updated_at
before update on public.user_wizard_state
for each row
execute function public.set_updated_at();

-- =========================================================
-- TABLA: wizard_step_states
-- Estado por paso del wizard
-- Guardado incremental
-- =========================================================
create table if not exists public.wizard_step_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  step_key public.wizard_step_key not null,
  step_order smallint not null check (step_order >= 0),
  is_completed boolean not null default false,
  payload_jsonb jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint uq_wizard_step_states_user_step unique (user_id, step_key)
);

create index if not exists ix_wizard_step_states_user_id
  on public.wizard_step_states(user_id);

create index if not exists ix_wizard_step_states_user_step_order
  on public.wizard_step_states(user_id, step_order);

create index if not exists ix_wizard_step_states_payload_jsonb
  on public.wizard_step_states using gin(payload_jsonb);

create trigger trg_wizard_step_states_updated_at
before update on public.wizard_step_states
for each row
execute function public.set_updated_at();

-- =========================================================
-- TABLA: user_documents
-- Documento lógico del usuario
-- Ejemplo:
-- - "CV principal"
-- - "LinkedIn logística"
-- =========================================================
create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  civil_profile_id uuid references public.user_civil_profiles(id) on delete set null,

  kind public.document_kind not null,
  title text not null,
  slug text,

  current_version_no integer,
  status public.generation_status not null default 'draft',

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint uq_user_documents_slug unique (user_id, slug)
);

create index if not exists ix_user_documents_user_id
  on public.user_documents(user_id);

create index if not exists ix_user_documents_civil_profile_id
  on public.user_documents(civil_profile_id);

create index if not exists ix_user_documents_kind
  on public.user_documents(kind);

create trigger trg_user_documents_updated_at
before update on public.user_documents
for each row
execute function public.set_updated_at();

-- =========================================================
-- TABLA: user_document_versions
-- Versiones concretas del documento
-- Puede guardar:
-- - texto
-- - json
-- - referencia a archivo en storage
-- =========================================================
create table if not exists public.user_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.user_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  version_no integer not null check (version_no > 0),
  format public.document_format not null,
  status public.generation_status not null default 'draft',

  content_text text,
  content_jsonb jsonb,

  storage_bucket text,
  storage_path text,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  sha256_hex text,

  source_civil_profile_id uuid references public.user_civil_profiles(id) on delete set null,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint uq_user_document_versions unique (document_id, version_no),
  constraint chk_document_version_payload
    check (
      content_text is not null
      or content_jsonb is not null
      or storage_path is not null
    )
);

create index if not exists ix_user_document_versions_document_id
  on public.user_document_versions(document_id);

create index if not exists ix_user_document_versions_user_id
  on public.user_document_versions(user_id);

create index if not exists ix_user_document_versions_source_civil_profile_id
  on public.user_document_versions(source_civil_profile_id);

create index if not exists ix_user_document_versions_bucket_path
  on public.user_document_versions(storage_bucket, storage_path);

create trigger trg_user_document_versions_updated_at
before update on public.user_document_versions
for each row
execute function public.set_updated_at();

-- =========================================================
-- TABLA: organizations
-- Preparación futura para fase B (empresas / recruiters)
-- =========================================================
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_organizations_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

-- =========================================================
-- TABLA: organization_members
-- Miembros de organizaciones
-- =========================================================
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null,
  created_at timestamptz not null default timezone('utc', now()),

  constraint uq_organization_members unique (organization_id, user_id)
);

create index if not exists ix_organization_members_user_id
  on public.organization_members(user_id);

create index if not exists ix_organization_members_organization_id
  on public.organization_members(organization_id);

-- =========================================================
-- TABLA: talent_profile_publications
-- Capa publicable del perfil civil para talent pool
-- No toca el perfil interno del usuario
-- =========================================================
create table if not exists public.talent_profile_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  civil_profile_id uuid not null references public.user_civil_profiles(id) on delete cascade,

  status public.publication_status not null default 'draft',
  visibility_scope text not null default 'private'
    check (visibility_scope in ('private', 'invite_only', 'marketplace')),
  title text,
  public_summary text,
  publication_jsonb jsonb not null default '{}'::jsonb,

  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint uq_talent_profile_publications_civil_profile unique (civil_profile_id)
);

create index if not exists ix_talent_profile_publications_user_id
  on public.talent_profile_publications(user_id);

create index if not exists ix_talent_profile_publications_status_visibility
  on public.talent_profile_publications(status, visibility_scope);

create index if not exists ix_talent_profile_publications_publication_jsonb
  on public.talent_profile_publications using gin(publication_jsonb);

create trigger trg_talent_profile_publications_updated_at
before update on public.talent_profile_publications
for each row
execute function public.set_updated_at();
