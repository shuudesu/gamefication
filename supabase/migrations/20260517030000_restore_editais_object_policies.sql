-- ============================================================
-- GAMEFICATION CONCURSO.OS — Restaura policies do storage.objects
--   A migration 20260517000000_auth_scoping.sql adicionou as
--   policies editais_select_own e editais_insert_own, mas a
--   inspeção do banco remoto (pg_policies) mostrou que elas não
--   existem mais — provavelmente nunca foram aplicadas ou foram
--   dropadas em algum reset.
--
--   Sem essas policies, qualquer upload (standard OU TUS) bate
--   em "new row violates row-level security policy", porque o
--   storage-api precisa inserir em storage.objects pra criar o
--   arquivo final E o placeholder do upload em andamento.
--
--   Adicionei UPDATE e DELETE também porque o TUS atualiza o row
--   de storage.objects ao longo do upload (mudando metadata,
--   last_modified) e pode precisar limpar entries órfãos.
-- ============================================================

drop policy if exists "editais_select_own" on storage.objects;
drop policy if exists "editais_insert_own" on storage.objects;
drop policy if exists "editais_update_own" on storage.objects;
drop policy if exists "editais_delete_own" on storage.objects;

create policy "editais_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'editais'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "editais_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'editais'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "editais_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'editais'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'editais'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "editais_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'editais'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
