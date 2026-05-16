-- ============================================================
-- GAMEFICATION CONCURSO.OS — Auth Scoping
--   - Scope exams + study_plan_blocks por user_id
--   - Trigger auto-cria public.users quando auth.users é criado
--   - Tighten RLS: leitura pública → escopo por auth.uid()
--   - Storage policies para o bucket 'editais'
-- ============================================================

-- ------------------------------------------------------------
-- EXAMS — scope por user_id
-- ------------------------------------------------------------
alter table public.exams
  add column user_id uuid references public.users(id) on delete cascade;

create index exams_user_id_idx on public.exams (user_id);

-- O índice "unique(is_active) where is_active=true" precisa virar
-- "unique por usuário": cada usuário pode ter 1 exam ativo.
drop index if exists public.exams_single_active_idx;

create unique index exams_user_single_active_idx
  on public.exams (user_id, is_active)
  where is_active = true;

-- ------------------------------------------------------------
-- STUDY_PLAN_BLOCKS — scope por user_id
-- ------------------------------------------------------------
alter table public.study_plan_blocks
  add column user_id uuid references public.users(id) on delete cascade;

create index plan_blocks_user_id_idx on public.study_plan_blocks (user_id);

-- ------------------------------------------------------------
-- TRIGGER: criar public.users automaticamente no signup
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- RLS — substituir leitura pública por escopo do usuário
-- ------------------------------------------------------------

-- EXAMS
drop policy if exists "exams_select_all" on public.exams;

create policy "exams_select_own" on public.exams
  for select to authenticated using (auth.uid() = user_id);

create policy "exams_insert_own" on public.exams
  for insert to authenticated with check (auth.uid() = user_id);

create policy "exams_update_own" on public.exams
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "exams_delete_own" on public.exams
  for delete to authenticated using (auth.uid() = user_id);

-- EXAM_SUBJECTS — escopo via exam ownership
drop policy if exists "exam_subjects_select_all" on public.exam_subjects;

create policy "exam_subjects_select_own" on public.exam_subjects
  for select to authenticated using (
    exists (
      select 1 from public.exams
      where id = exam_id and user_id = auth.uid()
    )
  );

create policy "exam_subjects_insert_own" on public.exam_subjects
  for insert to authenticated with check (
    exists (
      select 1 from public.exams
      where id = exam_id and user_id = auth.uid()
    )
  );

-- EXAM_TOPICS — escopo via exam_subject → exam ownership
drop policy if exists "exam_topics_select_all" on public.exam_topics;

create policy "exam_topics_select_own" on public.exam_topics
  for select to authenticated using (
    exists (
      select 1 from public.exam_subjects s
      join public.exams e on e.id = s.exam_id
      where s.id = exam_subject_id and e.user_id = auth.uid()
    )
  );

create policy "exam_topics_insert_own" on public.exam_topics
  for insert to authenticated with check (
    exists (
      select 1 from public.exam_subjects s
      join public.exams e on e.id = s.exam_id
      where s.id = exam_subject_id and e.user_id = auth.uid()
    )
  );

-- STUDY_PLAN_BLOCKS
drop policy if exists "study_plan_blocks_select_all" on public.study_plan_blocks;

create policy "study_plan_blocks_select_own" on public.study_plan_blocks
  for select to authenticated using (auth.uid() = user_id);

create policy "study_plan_blocks_insert_own" on public.study_plan_blocks
  for insert to authenticated with check (auth.uid() = user_id);

create policy "study_plan_blocks_update_own" on public.study_plan_blocks
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- STORAGE — policies para o bucket 'editais'
--   path convention: <user_id>/<timestamp>_<filename>.pdf
-- ------------------------------------------------------------
drop policy if exists "editais_select_own" on storage.objects;
drop policy if exists "editais_insert_own" on storage.objects;

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
