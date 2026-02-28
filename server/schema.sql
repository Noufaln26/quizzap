-- QuizZap Database Schema
-- Run this in your Supabase SQL editor

-- Quizzes
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_image_url text,
  created_at timestamptz default now()
);

-- Questions
create table questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  question_text text not null,
  image_url text,
  timer_seconds int default 20,
  order_index int default 0
);

-- Answer options
create table answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  text text not null,
  color text not null,
  is_correct boolean default false
);

-- Game sessions (for history)
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete set null,
  pin_code text,
  status text default 'ended',
  created_at timestamptz default now()
);

-- Players (for history)
create table players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references game_sessions(id) on delete cascade,
  nickname text,
  total_score int default 0,
  final_rank int
);

-- Indexes
create index on questions(quiz_id);
create index on answer_options(question_id);
create index on players(session_id);

-- Storage bucket (run separately or via dashboard)
-- insert into storage.buckets (id, name, public) values ('quiz-images', 'quiz-images', true);

-- Row Level Security
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table answer_options enable row level security;
alter table game_sessions enable row level security;
alter table players enable row level security;

-- Public read access
create policy "Public read quizzes" on quizzes for select using (true);
create policy "Public read questions" on questions for select using (true);
create policy "Public read options" on answer_options for select using (true);
create policy "Public read sessions" on game_sessions for select using (true);
create policy "Public read players" on players for select using (true);

-- Service role has full access (used by server with service key)
