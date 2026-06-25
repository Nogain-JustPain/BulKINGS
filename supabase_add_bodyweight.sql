-- ============================================================
-- TAMBAHAN: Tabel body_weight + kolom target_weight
-- Paste dan Run di Supabase SQL Editor
-- ============================================================

-- Tambah kolom target_weight ke profiles (kalau belum ada)
alter table profiles add column if not exists target_weight numeric;

-- Tabel catatan berat badan harian
create table if not exists body_weight (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight numeric not null,
  created_at timestamptz default now(),
  unique(user_id, date)
);

create index if not exists idx_body_weight_user_date on body_weight(user_id, date desc);

alter table body_weight enable row level security;

create policy "bw_select_own" on body_weight for select using (auth.uid() = user_id);
create policy "bw_insert_own" on body_weight for insert with check (auth.uid() = user_id);
create policy "bw_update_own" on body_weight for update using (auth.uid() = user_id);
create policy "bw_delete_own" on body_weight for delete using (auth.uid() = user_id);
