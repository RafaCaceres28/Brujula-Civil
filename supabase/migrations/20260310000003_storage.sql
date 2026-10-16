-- =========================================================
-- 20260309_003_storage.sql
-- Brújula Civil
-- Policies de Storage sobre storage.objects
--
-- IMPORTANTE:
-- Antes de ejecutar esto, crea manualmente estos buckets
-- en el panel de Supabase Storage y márcalos como privados:
--
-- 1) user-documents
-- 2) user-exports
-- 3) user-assets
-- =========================================================

-- =========================================================
-- SELECT
-- El usuario solo puede leer objetos en su carpeta:
-- bucket/{user_id}/...
-- =========================================================
create policy "storage_select_own_objects"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('user-documents', 'user-exports', 'user-assets')
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================================================
-- INSERT
-- El usuario solo puede subir a su carpeta:
-- bucket/{user_id}/...
-- =========================================================
create policy "storage_insert_own_objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('user-documents', 'user-exports', 'user-assets')
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================================================
-- UPDATE
-- El usuario solo puede modificar objetos de su carpeta
-- =========================================================
create policy "storage_update_own_objects"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('user-documents', 'user-exports', 'user-assets')
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id in ('user-documents', 'user-exports', 'user-assets')
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================================================
-- DELETE
-- El usuario solo puede borrar objetos de su carpeta
-- =========================================================
create policy "storage_delete_own_objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('user-documents', 'user-exports', 'user-assets')
  and (storage.foldername(name))[1] = auth.uid()::text
);
