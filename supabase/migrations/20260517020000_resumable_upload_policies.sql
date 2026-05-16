-- ============================================================
-- GAMEFICATION CONCURSO.OS — Resumable upload (TUS) policies
--   Habilita uploads resumable pro bucket 'editais'.
--
--   Por baixo dos panos, o endpoint /storage/v1/upload/resumable
--   mapeia TUS pra S3 multipart, persistindo o estado em:
--     - storage.s3_multipart_uploads        (1 row por upload)
--     - storage.s3_multipart_uploads_parts  (1 row por chunk)
--
--   Sem policies nessas tabelas, o INSERT inicial falha com
--   "new row violates row-level security policy" e o cliente
--   nunca chega a mandar nenhum chunk.
--
--   Mesma convenção das policies de storage.objects:
--   pasta raiz do objectName == auth.uid().
-- ============================================================

-- ------------------------------------------------------------
-- storage.s3_multipart_uploads
-- ------------------------------------------------------------
drop policy if exists "editais_multipart_select_own" on storage.s3_multipart_uploads;
drop policy if exists "editais_multipart_insert_own" on storage.s3_multipart_uploads;
drop policy if exists "editais_multipart_update_own" on storage.s3_multipart_uploads;
drop policy if exists "editais_multipart_delete_own" on storage.s3_multipart_uploads;

create policy "editais_multipart_select_own"
  on storage.s3_multipart_uploads for select to authenticated
  using (
    bucket_id = 'editais'
    and (storage.foldername(key))[1] = auth.uid()::text
  );

create policy "editais_multipart_insert_own"
  on storage.s3_multipart_uploads for insert to authenticated
  with check (
    bucket_id = 'editais'
    and (storage.foldername(key))[1] = auth.uid()::text
  );

create policy "editais_multipart_update_own"
  on storage.s3_multipart_uploads for update to authenticated
  using (
    bucket_id = 'editais'
    and (storage.foldername(key))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'editais'
    and (storage.foldername(key))[1] = auth.uid()::text
  );

create policy "editais_multipart_delete_own"
  on storage.s3_multipart_uploads for delete to authenticated
  using (
    bucket_id = 'editais'
    and (storage.foldername(key))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- storage.s3_multipart_uploads_parts
-- ------------------------------------------------------------
drop policy if exists "editais_multipart_parts_select_own" on storage.s3_multipart_uploads_parts;
drop policy if exists "editais_multipart_parts_insert_own" on storage.s3_multipart_uploads_parts;
drop policy if exists "editais_multipart_parts_update_own" on storage.s3_multipart_uploads_parts;
drop policy if exists "editais_multipart_parts_delete_own" on storage.s3_multipart_uploads_parts;

create policy "editais_multipart_parts_select_own"
  on storage.s3_multipart_uploads_parts for select to authenticated
  using (
    bucket_id = 'editais'
    and (storage.foldername(key))[1] = auth.uid()::text
  );

create policy "editais_multipart_parts_insert_own"
  on storage.s3_multipart_uploads_parts for insert to authenticated
  with check (
    bucket_id = 'editais'
    and (storage.foldername(key))[1] = auth.uid()::text
  );

create policy "editais_multipart_parts_update_own"
  on storage.s3_multipart_uploads_parts for update to authenticated
  using (
    bucket_id = 'editais'
    and (storage.foldername(key))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'editais'
    and (storage.foldername(key))[1] = auth.uid()::text
  );

create policy "editais_multipart_parts_delete_own"
  on storage.s3_multipart_uploads_parts for delete to authenticated
  using (
    bucket_id = 'editais'
    and (storage.foldername(key))[1] = auth.uid()::text
  );
