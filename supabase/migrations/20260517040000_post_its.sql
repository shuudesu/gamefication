-- ============================================================
-- GAMEFICATION CONCURSO.OS — Post-its (mural da matéria)
--   Cada vez que o usuário clica "PUXAR NOVO" na página da
--   matéria, a IA gera um post-it com uma dica/insight/conceito
--   sobre o conteúdo programático daquela matéria. O usuário
--   pode salvar (vira permanente) ou descartar (some no próximo
--   reload).
--
--   Schema:
--     - id, user_id, exam_subject_id
--     - content (texto curto, ≤ 280 chars no enforcement)
--     - kind (tip | mnemonic | concept | pitfall | strategy)
--     - is_saved (false = efêmero ainda visível na sessão; true = no mural)
--     - created_at
--
--   RLS: scoped por user_id (mesma convenção das outras tabelas).
-- ============================================================

create type post_it_kind as enum (
  'tip',
  'mnemonic',
  'concept',
  'pitfall',
  'strategy'
);

create table public.post_its (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  exam_subject_id uuid not null references public.exam_subjects(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 320),
  kind post_it_kind not null default 'tip',
  is_saved boolean not null default false,
  created_at timestamptz not null default now()
);

create index post_its_user_subject_idx on public.post_its (user_id, exam_subject_id);
create index post_its_saved_idx on public.post_its (user_id, is_saved) where is_saved = true;

alter table public.post_its enable row level security;

-- Owner-scoped: usuário só vê/edita seus próprios post-its.
create policy "post_its_select_own" on public.post_its
  for select to authenticated using (auth.uid() = user_id);

create policy "post_its_insert_own" on public.post_its
  for insert to authenticated with check (auth.uid() = user_id);

create policy "post_its_update_own" on public.post_its
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "post_its_delete_own" on public.post_its
  for delete to authenticated using (auth.uid() = user_id);

-- Force PostgREST a recarregar o schema cache pra a tabela
-- nova aparecer imediatamente sem warm-up.
notify pgrst, 'reload schema';
