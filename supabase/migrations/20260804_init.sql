-- Migración inicial para almacenar el estado del debate en Supabase
create table if not exists debate_state (
  id text primary key default 'default',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Habilitar Row Level Security (RLS)
alter table debate_state enable row level security;

-- Políticas de acceso público (Lectura y Escritura para sincronización entre dispositivos)
drop policy if exists "Allow public read" on debate_state;
create policy "Allow public read" on debate_state for select using (true);

drop policy if exists "Allow public insert" on debate_state;
create policy "Allow public insert" on debate_state for insert with check (true);

drop policy if exists "Allow public update" on debate_state;
create policy "Allow public update" on debate_state for update using (true);
