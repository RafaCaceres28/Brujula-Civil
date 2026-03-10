-- =========================================================
-- 20260309_002_rls.sql
-- Brújula Civil
-- Seguridad RLS por tabla
-- =========================================================

-- =========================================================
-- ACTIVAR RLS
-- =========================================================
alter table public.app_user_profiles enable row level security;
alter table public.user_military_profiles enable row level security;
alter table public.user_civil_profiles enable row level security;
alter table public.user_wizard_state enable row level security;
alter table public.wizard_step_states enable row level security;
alter table public.user_documents enable row level security;
alter table public.user_document_versions enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.talent_profile_publications enable row level security;

-- =========================================================
-- app_user_profiles
-- Cada usuario solo puede gestionar su propia fila
-- =========================================================
create policy "app_user_profiles_select_own"
on public.app_user_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "app_user_profiles_insert_own"
on public.app_user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "app_user_profiles_update_own"
on public.app_user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "app_user_profiles_delete_own"
on public.app_user_profiles
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================================================
-- user_military_profiles
-- =========================================================
create policy "user_military_profiles_select_own"
on public.user_military_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_military_profiles_insert_own"
on public.user_military_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_military_profiles_update_own"
on public.user_military_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_military_profiles_delete_own"
on public.user_military_profiles
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================================================
-- user_civil_profiles
-- =========================================================
create policy "user_civil_profiles_select_own"
on public.user_civil_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_civil_profiles_insert_own"
on public.user_civil_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_civil_profiles_update_own"
on public.user_civil_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_civil_profiles_delete_own"
on public.user_civil_profiles
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================================================
-- user_wizard_state
-- =========================================================
create policy "user_wizard_state_select_own"
on public.user_wizard_state
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_wizard_state_insert_own"
on public.user_wizard_state
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_wizard_state_update_own"
on public.user_wizard_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_wizard_state_delete_own"
on public.user_wizard_state
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================================================
-- wizard_step_states
-- =========================================================
create policy "wizard_step_states_select_own"
on public.wizard_step_states
for select
to authenticated
using (auth.uid() = user_id);

create policy "wizard_step_states_insert_own"
on public.wizard_step_states
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "wizard_step_states_update_own"
on public.wizard_step_states
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "wizard_step_states_delete_own"
on public.wizard_step_states
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================================================
-- user_documents
-- =========================================================
create policy "user_documents_select_own"
on public.user_documents
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_documents_insert_own"
on public.user_documents
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_documents_update_own"
on public.user_documents
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_documents_delete_own"
on public.user_documents
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================================================
-- user_document_versions
-- =========================================================
create policy "user_document_versions_select_own"
on public.user_document_versions
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_document_versions_insert_own"
on public.user_document_versions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_document_versions_update_own"
on public.user_document_versions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_document_versions_delete_own"
on public.user_document_versions
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================================================
-- organizations
-- Solo visible por miembros de la organización
-- Escritura cerrada por ahora
-- =========================================================
create policy "organizations_select_if_member"
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organizations.id
      and om.user_id = auth.uid()
  )
);

-- =========================================================
-- organization_members
-- Cada usuario solo ve sus membresías
-- Escritura cerrada por ahora
-- =========================================================
create policy "organization_members_select_own_memberships"
on public.organization_members
for select
to authenticated
using (auth.uid() = user_id);

-- =========================================================
-- talent_profile_publications
-- El usuario gestiona sus propias publicaciones
-- =========================================================
create policy "talent_profile_publications_select_own"
on public.talent_profile_publications
for select
to authenticated
using (auth.uid() = user_id);

create policy "talent_profile_publications_insert_own"
on public.talent_profile_publications
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "talent_profile_publications_update_own"
on public.talent_profile_publications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "talent_profile_publications_delete_own"
on public.talent_profile_publications
for delete
to authenticated
using (auth.uid() = user_id);
