-- ============================================================
-- GAMEFICATION CONCURSO.OS — Initial Schema
--   tables: users, subjects, topics, questions, attempts, streaks
--   features: RLS on all tables, seed of default subjects
-- ============================================================

-- ------------------------------------------------------------
-- USERS (profile + gamification stats, FK to auth.users)
-- ------------------------------------------------------------
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  xp           integer not null default 0 check (xp >= 0),
  level        integer not null default 1 check (level >= 1),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.users is
  'User profile + gamification stats. id matches auth.users.id (1:1).';

-- ------------------------------------------------------------
-- SUBJECTS (matérias do edital)
-- ------------------------------------------------------------
create table public.subjects (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  name       text not null,
  icon_key   text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- TOPICS (sub-tópicos por matéria — granularidade da geração)
-- ------------------------------------------------------------
create table public.topics (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  slug       text not null,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (subject_id, slug)
);

create index topics_subject_id_idx on public.topics(subject_id);

-- ------------------------------------------------------------
-- QUESTIONS (geradas pela IA ou manuais)
-- ------------------------------------------------------------
create table public.questions (
  id              uuid primary key default gen_random_uuid(),
  topic_id        text not null,
  question_text   text not null,
  options         jsonb not null check (
                    jsonb_typeof(options) = 'array'
                    and jsonb_array_length(options) between 2 and 5
                  ),
  correct_answer  integer not null check (correct_answer between 0 and 4),
  explanation     text,
  generated_by    text not null default 'manual',
  created_at      timestamptz not null default now()
);

create index questions_topic_id_idx   on public.questions(topic_id);
create index questions_created_at_idx on public.questions(created_at desc);

-- ------------------------------------------------------------
-- ATTEMPTS (tentativas do usuário)
-- ------------------------------------------------------------
create table public.attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  question_id     uuid not null references public.questions(id) on delete cascade,
  selected_option integer not null check (selected_option between 0 and 4),
  is_correct      boolean not null,
  time_spent_ms   integer,
  xp_awarded      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index attempts_user_id_idx       on public.attempts(user_id);
create index attempts_question_id_idx   on public.attempts(question_id);
create index attempts_user_created_idx  on public.attempts(user_id, created_at desc);

-- ------------------------------------------------------------
-- STREAKS (registro diário — streak = dias consecutivos)
-- ------------------------------------------------------------
create table public.streaks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  day             date not null,
  attempts_count  integer not null default 1 check (attempts_count >= 1),
  created_at      timestamptz not null default now(),
  unique (user_id, day)
);

create index streaks_user_day_idx on public.streaks(user_id, day desc);

-- ------------------------------------------------------------
-- TRIGGERS
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
--   service_role bypasses RLS (server-side inserts continue working).
-- ------------------------------------------------------------
alter table public.users     enable row level security;
alter table public.subjects  enable row level security;
alter table public.topics    enable row level security;
alter table public.questions enable row level security;
alter table public.attempts  enable row level security;
alter table public.streaks   enable row level security;

-- users: read/insert/update apenas o próprio perfil
create policy "users_select_own"  on public.users
  for select to authenticated using (auth.uid() = id);

create policy "users_insert_self" on public.users
  for insert to authenticated with check (auth.uid() = id);

create policy "users_update_own"  on public.users
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- subjects: leitura pública
create policy "subjects_select_all" on public.subjects
  for select to anon, authenticated using (true);

-- topics: leitura pública
create policy "topics_select_all" on public.topics
  for select to anon, authenticated using (true);

-- questions: leitura pública (insert acontece via service_role na rota /api/generate-question)
create policy "questions_select_all" on public.questions
  for select to anon, authenticated using (true);

-- attempts: cada usuário vê e insere apenas suas tentativas
create policy "attempts_select_own"  on public.attempts
  for select to authenticated using (auth.uid() = user_id);

create policy "attempts_insert_self" on public.attempts
  for insert to authenticated with check (auth.uid() = user_id);

-- streaks: cada usuário vê e insere/atualiza apenas seus dias
create policy "streaks_select_own"  on public.streaks
  for select to authenticated using (auth.uid() = user_id);

create policy "streaks_insert_self" on public.streaks
  for insert to authenticated with check (auth.uid() = user_id);

create policy "streaks_update_own"  on public.streaks
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- SEED — matérias do edital padrão
-- ------------------------------------------------------------
insert into public.subjects (code, name, icon_key) values
  ('DCO', 'Direito Constitucional', 'scale'),
  ('DAD', 'Direito Administrativo', 'shield'),
  ('POR', 'Língua Portuguesa',      'book'),
  ('RLM', 'Raciocínio Lógico',      'brain'),
  ('INF', 'Informática',            'cpu'),
  ('ATU', 'Atualidades',            'newspaper')
on conflict (code) do nothing;
