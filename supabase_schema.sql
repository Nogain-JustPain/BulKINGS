-- ============================================================
-- IRON LOG — Schema Supabase
-- Cara pakai: buka Supabase Dashboard > SQL Editor > paste semua ini > Run
-- ============================================================

-- Tabel sesi latihan (1 baris = 1 hari latihan)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now()
);

-- Tabel exercise di dalam satu sesi
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null,
  position int not null default 0
);

-- Tabel set di dalam satu exercise
create table if not exists sets (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises(id) on delete cascade,
  reps int not null default 0,
  weight numeric not null default 0,
  position int not null default 0
);

-- Index biar query history & progress cepat
create index if not exists idx_sessions_user_date on sessions(user_id, date desc);
create index if not exists idx_exercises_session on exercises(session_id);
create index if not exists idx_sets_exercise on sets(exercise_id);

-- ============================================================
-- Row Level Security: tiap user HANYA bisa akses data miliknya sendiri
-- ============================================================

alter table sessions enable row level security;
alter table exercises enable row level security;
alter table sets enable row level security;

-- Sessions: user hanya boleh CRUD baris miliknya sendiri
create policy "sessions_select_own" on sessions
  for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions_update_own" on sessions
  for update using (auth.uid() = user_id);
create policy "sessions_delete_own" on sessions
  for delete using (auth.uid() = user_id);

-- Exercises: akses diturunkan dari kepemilikan sessions induknya
create policy "exercises_select_own" on exercises
  for select using (
    exists (select 1 from sessions where sessions.id = exercises.session_id and sessions.user_id = auth.uid())
  );
create policy "exercises_insert_own" on exercises
  for insert with check (
    exists (select 1 from sessions where sessions.id = exercises.session_id and sessions.user_id = auth.uid())
  );
create policy "exercises_update_own" on exercises
  for update using (
    exists (select 1 from sessions where sessions.id = exercises.session_id and sessions.user_id = auth.uid())
  );
create policy "exercises_delete_own" on exercises
  for delete using (
    exists (select 1 from sessions where sessions.id = exercises.session_id and sessions.user_id = auth.uid())
  );

-- Sets: akses diturunkan dari kepemilikan exercises -> sessions
create policy "sets_select_own" on sets
  for select using (
    exists (
      select 1 from exercises
      join sessions on sessions.id = exercises.session_id
      where exercises.id = sets.exercise_id and sessions.user_id = auth.uid()
    )
  );
create policy "sets_insert_own" on sets
  for insert with check (
    exists (
      select 1 from exercises
      join sessions on sessions.id = exercises.session_id
      where exercises.id = sets.exercise_id and sessions.user_id = auth.uid()
    )
  );
create policy "sets_update_own" on sets
  for update using (
    exists (
      select 1 from exercises
      join sessions on sessions.id = exercises.session_id
      where exercises.id = sets.exercise_id and sessions.user_id = auth.uid()
    )
  );
create policy "sets_delete_own" on sets
  for delete using (
    exists (
      select 1 from exercises
      join sessions on sessions.id = exercises.session_id
      where exercises.id = sets.exercise_id and sessions.user_id = auth.uid()
    )
  );
