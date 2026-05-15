-- ============================================================
-- GAMEFICATION CONCURSO.OS — Exam Intake & Storage
--   Adds: exams, exam_subjects, exam_topics, study_plan_blocks
--   Adds: 'editais' storage bucket (private, 50MB, PDF only)
--   Links: questions.exam_topic_id (optional FK)
--
-- NOTE: Tables here are NOT yet scoped by user_id (auth is not
--       wired). RLS allows anon/auth SELECT; service_role
--       inserts (bypasses RLS). When auth lands, follow-up
--       migration adds user_id FKs and tightens policies.
-- ============================================================

-- ------------------------------------------------------------
-- EXAMS (1 row per concurso the candidate is studying for)
-- ------------------------------------------------------------
create type exam_processing_status as enum (
  'pending',
  'extracting',
  'ready',
  'failed'
);

create table public.exams (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  banca              text,
  cargo              text,
  exam_date          date,
  vacancies          integer check (vacancies is null or vacancies >= 0),
  edital_pdf_path    text,
  edital_url         text,
  source_metadata    jsonb not null default '{}'::jsonb,
  processing_status  exam_processing_status not null default 'pending',
  processing_error   text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index exams_single_active_idx
  on public.exams (is_active)
  where is_active = true;

create index exams_created_at_idx on public.exams (created_at desc);

-- ------------------------------------------------------------
-- EXAM_SUBJECTS (matérias específicas deste edital, com peso)
-- ------------------------------------------------------------
create table public.exam_subjects (
  id           uuid primary key default gen_random_uuid(),
  exam_id      uuid not null references public.exams(id) on delete cascade,
  name         text not null,
  weight       numeric(5,4) not null default 0 check (weight >= 0 and weight <= 1),
  order_index  integer not null default 0,
  icon_key     text,
  created_at   timestamptz not null default now()
);

create index exam_subjects_exam_id_idx on public.exam_subjects (exam_id, order_index);

-- ------------------------------------------------------------
-- EXAM_TOPICS (sub-tópicos por matéria — alvo da IA)
-- ------------------------------------------------------------
create type topic_priority as enum ('high', 'medium', 'low');

create table public.exam_topics (
  id                uuid primary key default gen_random_uuid(),
  exam_subject_id   uuid not null references public.exam_subjects(id) on delete cascade,
  name              text not null,
  priority          topic_priority not null default 'medium',
  estimated_hours   numeric(6,2),
  content_raw       text,
  order_index       integer not null default 0,
  created_at        timestamptz not null default now()
);

create index exam_topics_subject_idx on public.exam_topics (exam_subject_id, order_index);

-- ------------------------------------------------------------
-- STUDY_PLAN_BLOCKS (cronograma — preenchido pelo planejador)
-- ------------------------------------------------------------
create type plan_block_type as enum ('study', 'review', 'quiz');

create table public.study_plan_blocks (
  id                uuid primary key default gen_random_uuid(),
  exam_id           uuid not null references public.exams(id) on delete cascade,
  exam_topic_id     uuid not null references public.exam_topics(id) on delete cascade,
  scheduled_for     date not null,
  block_type        plan_block_type not null default 'study',
  duration_minutes  integer not null check (duration_minutes > 0),
  completed_at      timestamptz,
  created_at        timestamptz not null default now()
);

create index plan_blocks_exam_date_idx on public.study_plan_blocks (exam_id, scheduled_for);

-- ------------------------------------------------------------
-- QUESTIONS link to exam topic (optional)
-- ------------------------------------------------------------
alter table public.questions
  add column exam_topic_id uuid references public.exam_topics(id) on delete set null;

create index questions_exam_topic_idx on public.questions (exam_topic_id);

-- ------------------------------------------------------------
-- updated_at trigger on exams
-- ------------------------------------------------------------
create trigger exams_set_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- RLS — leitura pública (pré-auth); writes via service_role
-- ------------------------------------------------------------
alter table public.exams              enable row level security;
alter table public.exam_subjects      enable row level security;
alter table public.exam_topics        enable row level security;
alter table public.study_plan_blocks  enable row level security;

create policy "exams_select_all" on public.exams
  for select to anon, authenticated using (true);

create policy "exam_subjects_select_all" on public.exam_subjects
  for select to anon, authenticated using (true);

create policy "exam_topics_select_all" on public.exam_topics
  for select to anon, authenticated using (true);

create policy "study_plan_blocks_select_all" on public.study_plan_blocks
  for select to anon, authenticated using (true);

-- ------------------------------------------------------------
-- STORAGE BUCKET — editais
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'editais',
  'editais',
  false,
  52428800, -- 50 MB
  array['application/pdf']::text[]
)
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  public             = excluded.public;

-- Service role já tem acesso completo. Demais roles ficam sem
-- policies (sem acesso) até o módulo de auth ser adicionado.
