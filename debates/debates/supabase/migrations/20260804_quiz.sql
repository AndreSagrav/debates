-- Migración para el juego de Quiz / Kahoot Multijugador

create table if not exists quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  pin text not null,
  status text not null default 'lobby',
  current_question int not null default 0,
  questions jsonb not null default '[]'::jsonb,
  players jsonb not null default '[]'::jsonb,
  question_start timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists quiz_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references quiz_sessions(id) on delete cascade,
  player_name text not null,
  question_index int not null,
  chosen_option int not null,
  response_time_ms int not null,
  correct boolean not null default false,
  created_at timestamptz default now()
);

-- Habilitar Row Level Security (RLS)
alter table quiz_sessions enable row level security;
alter table quiz_responses enable row level security;

-- Políticas RLS de acceso público
drop policy if exists "Allow public read quiz_sessions" on quiz_sessions;
create policy "Allow public read quiz_sessions" on quiz_sessions for select using (true);

drop policy if exists "Allow public insert quiz_sessions" on quiz_sessions;
create policy "Allow public insert quiz_sessions" on quiz_sessions for insert with check (true);

drop policy if exists "Allow public update quiz_sessions" on quiz_sessions;
create policy "Allow public update quiz_sessions" on quiz_sessions for update using (true);

drop policy if exists "Allow public read quiz_responses" on quiz_responses;
create policy "Allow public read quiz_responses" on quiz_responses for select using (true);

drop policy if exists "Allow public insert quiz_responses" on quiz_responses;
create policy "Allow public insert quiz_responses" on quiz_responses for insert with check (true);
