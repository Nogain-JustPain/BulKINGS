-- ============================================================
-- TAMBAHAN: Tabel exercise_categories untuk muscle group
-- Paste dan Run di Supabase SQL Editor
-- ============================================================

create table if not exists exercise_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  muscle_group text not null,
  updated_at timestamptz default now(),
  unique(user_id, exercise_name)
);

create index if not exists idx_exercise_categories_user on exercise_categories(user_id);

alter table exercise_categories enable row level security;

create policy "ec_select_own" on exercise_categories for select using (auth.uid() = user_id);
create policy "ec_insert_own" on exercise_categories for insert with check (auth.uid() = user_id);
create policy "ec_update_own" on exercise_categories for update using (auth.uid() = user_id);
create policy "ec_delete_own" on exercise_categories for delete using (auth.uid() = user_id);
