-- =========================================================
-- SKEMA: Aplikasi Aset & Keuangan Keluarga
-- Jalankan di Supabase SQL Editor (Project > SQL Editor > New query)
-- =========================================================

-- 1) HOUSEHOLDS (unit keluarga)
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

-- 2) PROFILES (1:1 dengan auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  full_name text,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

-- 3) KATEGORI ASET
create table if not exists asset_categories (
  id serial primary key,
  name text not null unique,
  icon text
);

insert into asset_categories (name, icon) values
  ('Properti', 'home'), ('Kendaraan', 'car'), ('Tabungan', 'piggy-bank'),
  ('Investasi', 'trending-up'), ('Lainnya', 'box')
on conflict (name) do nothing;

-- 4) ASET
create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  category_id int not null references asset_categories(id),
  name text not null,
  value numeric(16,2) not null default 0,
  acquired_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) KATEGORI TRANSAKSI
create table if not exists transaction_categories (
  id serial primary key,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  unique(name, type)
);

insert into transaction_categories (name, type) values
  ('Gaji', 'income'), ('Bonus', 'income'), ('Investasi', 'income'), ('Lainnya', 'income'),
  ('Makanan', 'expense'), ('Transportasi', 'expense'), ('Tagihan', 'expense'),
  ('Pendidikan', 'expense'), ('Kesehatan', 'expense'), ('Hiburan', 'expense'), ('Lainnya', 'expense')
on conflict (name, type) do nothing;

-- 6) TRANSAKSI (pemasukan/pengeluaran)
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  category_id int not null references transaction_categories(id),
  type text not null check (type in ('income', 'expense')),
  amount numeric(16,2) not null check (amount > 0),
  description text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_assets_household on assets(household_id);
create index if not exists idx_transactions_household_date on transactions(household_id, date desc);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table households enable row level security;
alter table profiles enable row level security;
alter table assets enable row level security;
alter table transactions enable row level security;
alter table asset_categories enable row level security;
alter table transaction_categories enable row level security;

-- Kategori bersifat publik-baca (referensi), tidak ada household_id
create policy "kategori aset bisa dibaca semua user login"
  on asset_categories for select to authenticated using (true);
create policy "kategori transaksi bisa dibaca semua user login"
  on transaction_categories for select to authenticated using (true);

-- Kategori aset bisa dikelola (tambah/hapus) oleh user manapun yang login,
-- karena daftar kategori bersifat referensi bersama, bukan milik household tertentu.
create policy "kategori aset bisa ditambah user login"
  on asset_categories for insert to authenticated with check (true);
create policy "kategori aset bisa dihapus user login"
  on asset_categories for delete to authenticated using (true);

-- Helper: household_id milik user yang sedang login
create or replace function my_household_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select household_id from profiles where id = auth.uid();
$$;

-- PROFILES: user bisa lihat profil sendiri & anggota household yang sama
create policy "lihat profil sendiri dan sehousehold"
  on profiles for select to authenticated
  using (id = auth.uid() or household_id = my_household_id());

create policy "update profil sendiri"
  on profiles for update to authenticated
  using (id = auth.uid());

create policy "insert profil sendiri saat signup"
  on profiles for insert to authenticated
  with check (id = auth.uid());

-- HOUSEHOLDS: hanya anggota household bisa lihat
create policy "lihat household sendiri"
  on households for select to authenticated
  using (id = my_household_id());

create policy "user bisa membuat household baru"
  on households for insert to authenticated
  with check (true);

-- ASSETS: hanya sehousehold yang boleh CRUD
create policy "lihat aset sehousehold"
  on assets for select to authenticated
  using (household_id = my_household_id());

create policy "tambah aset untuk household sendiri"
  on assets for insert to authenticated
  with check (household_id = my_household_id() and owner_id = auth.uid());

create policy "ubah aset milik sendiri"
  on assets for update to authenticated
  using (household_id = my_household_id() and owner_id = auth.uid());

create policy "hapus aset milik sendiri"
  on assets for delete to authenticated
  using (household_id = my_household_id() and owner_id = auth.uid());

-- TRANSACTIONS: hanya sehousehold yang boleh CRUD
create policy "lihat transaksi sehousehold"
  on transactions for select to authenticated
  using (household_id = my_household_id());

create policy "tambah transaksi untuk household sendiri"
  on transactions for insert to authenticated
  with check (household_id = my_household_id() and user_id = auth.uid());

create policy "ubah transaksi milik sendiri"
  on transactions for update to authenticated
  using (household_id = my_household_id() and user_id = auth.uid());

create policy "hapus transaksi milik sendiri"
  on transactions for delete to authenticated
  using (household_id = my_household_id() and user_id = auth.uid());

-- =========================================================
-- FUNGSI PENDAFTARAN (bypass RLS secara aman via security definer)
-- =========================================================
-- Dibutuhkan karena saat household baru dibuat, profil user belum
-- tertaut ke household itu, sehingga SELECT policy "lihat household
-- sendiri" akan menolak baca-balik (RETURNING) row yang baru saja
-- di-insert. Fungsi ini menjalankan insert household + profil dalam
-- satu transaksi atomik dengan hak akses elevated, tapi tetap aman
-- karena hanya boleh membuat profil untuk auth.uid() milik pemanggil.

create or replace function public.create_household(p_name text, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  insert into households (name) values (p_name) returning id into v_household_id;

  insert into profiles (id, household_id, full_name, role)
  values (auth.uid(), v_household_id, p_full_name, 'owner');

  return v_household_id;
end;
$$;

create or replace function public.join_household(p_invite_code text, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  select id into v_household_id from households where invite_code = p_invite_code;

  if v_household_id is null then
    raise exception 'Kode undangan tidak ditemukan.';
  end if;

  insert into profiles (id, household_id, full_name, role)
  values (auth.uid(), v_household_id, p_full_name, 'member');

  return v_household_id;
end;
$$;

grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;

-- =========================================================
-- KEWAJIBAN / HUTANG
-- =========================================================
create table if not exists liability_categories (
  id serial primary key,
  name text not null unique,
  icon text
);

insert into liability_categories (name, icon) values
  ('KPR/Cicilan Rumah', 'home'), ('Cicilan Kendaraan', 'car'),
  ('Kartu Kredit', 'credit-card'), ('Pinjaman Pribadi', 'hand-coins'),
  ('Lainnya', 'box')
on conflict (name) do nothing;

create table if not exists liabilities (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  category_id int not null references liability_categories(id),
  name text not null,
  value numeric(16,2) not null default 0,
  started_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_liabilities_household on liabilities(household_id);

alter table liability_categories enable row level security;
alter table liabilities enable row level security;

create policy "kategori kewajiban bisa dibaca semua user login"
  on liability_categories for select to authenticated using (true);
create policy "kategori kewajiban bisa ditambah user login"
  on liability_categories for insert to authenticated with check (true);
create policy "kategori kewajiban bisa dihapus user login"
  on liability_categories for delete to authenticated using (true);

create policy "lihat kewajiban sehousehold"
  on liabilities for select to authenticated
  using (household_id = my_household_id());

create policy "tambah kewajiban untuk household sendiri"
  on liabilities for insert to authenticated
  with check (household_id = my_household_id() and owner_id = auth.uid());

create policy "ubah kewajiban milik sendiri"
  on liabilities for update to authenticated
  using (household_id = my_household_id() and owner_id = auth.uid());

create policy "hapus kewajiban milik sendiri"
  on liabilities for delete to authenticated
  using (household_id = my_household_id() and owner_id = auth.uid());
