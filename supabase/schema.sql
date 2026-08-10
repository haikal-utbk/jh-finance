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

-- =========================================================
-- SINKRONISASI TRANSAKSI <-> ASET (SUMBER KAS)
-- =========================================================
-- Transaksi bisa ditautkan ke satu aset (mis. rekening tabungan) sebagai
-- "sumber kas". Saat transaksi ditambah/dihapus, nilai aset itu otomatis
-- disesuaikan. Dibungkus dalam fungsi (bukan dua panggilan terpisah dari
-- client) supaya insert transaksi + update saldo aset atomik: kalau salah
-- satu gagal, semuanya batal, tidak ada state "setengah jalan".

alter table transactions add column if not exists asset_id uuid references assets(id) on delete set null;

create or replace function public.add_transaction_with_asset_sync(
  p_type text,
  p_amount numeric,
  p_category_id int,
  p_date date,
  p_description text,
  p_asset_id uuid
)
returns uuid
language plpgsql
as $$
declare
  v_household_id uuid;
  v_transaction_id uuid;
  v_delta numeric;
begin
  select household_id into v_household_id from profiles where id = auth.uid();
  if v_household_id is null then
    raise exception 'Belum tergabung dalam keluarga.';
  end if;

  insert into transactions (household_id, user_id, category_id, type, amount, date, description, asset_id)
  values (v_household_id, auth.uid(), p_category_id, p_type, p_amount, p_date, p_description, p_asset_id)
  returning id into v_transaction_id;

  if p_asset_id is not null then
    v_delta := case when p_type = 'income' then p_amount else -p_amount end;
    update assets set value = value + v_delta, updated_at = now() where id = p_asset_id;
    if not found then
      raise exception 'Aset sumber kas tidak ditemukan atau bukan milik Anda.';
    end if;
  end if;

  return v_transaction_id;
end;
$$;

create or replace function public.delete_transaction_with_asset_sync(p_id uuid)
returns void
language plpgsql
as $$
declare
  v_type text;
  v_amount numeric;
  v_asset_id uuid;
  v_delta numeric;
begin
  select type, amount, asset_id into v_type, v_amount, v_asset_id
  from transactions where id = p_id;

  if not found then
    raise exception 'Transaksi tidak ditemukan.';
  end if;

  delete from transactions where id = p_id;
  if not found then
    raise exception 'Kamu tidak punya izin menghapus transaksi ini.';
  end if;

  if v_asset_id is not null then
    v_delta := case when v_type = 'income' then -v_amount else v_amount end;
    update assets set value = value + v_delta, updated_at = now() where id = v_asset_id;
  end if;
end;
$$;

grant execute on function public.add_transaction_with_asset_sync(text, numeric, int, date, text, uuid) to authenticated;
grant execute on function public.delete_transaction_with_asset_sync(uuid) to authenticated;

-- =========================================================
-- JURNAL (mutasi antar aset: transfer kas, pelunasan piutang, dll)
-- =========================================================
-- Untuk hal yang bukan pemasukan/pengeluaran baru, tapi cuma memindahkan
-- nilai dari satu aset ke aset lain (mis. tarik tunai dari Tabungan ke
-- Kas, atau piutang yang dibayar sehingga nilainya pindah ke rekening).
-- Tidak masuk hitungan pemasukan/pengeluaran transaksi, karena bukan
-- uang baru -- cuma berpindah bentuk.

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  from_asset_id uuid not null references assets(id),
  to_asset_id uuid not null references assets(id),
  amount numeric(16,2) not null check (amount > 0),
  description text,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  check (from_asset_id <> to_asset_id)
);

create index if not exists idx_journal_household on journal_entries(household_id);

alter table journal_entries enable row level security;

create policy "lihat jurnal sehousehold"
  on journal_entries for select to authenticated
  using (household_id = my_household_id());

create policy "tambah jurnal untuk household sendiri"
  on journal_entries for insert to authenticated
  with check (household_id = my_household_id() and user_id = auth.uid());

create policy "hapus jurnal milik sendiri"
  on journal_entries for delete to authenticated
  using (household_id = my_household_id() and user_id = auth.uid());

create or replace function public.add_journal_entry(
  p_from_asset_id uuid,
  p_to_asset_id uuid,
  p_amount numeric,
  p_description text,
  p_date date
)
returns uuid
language plpgsql
as $$
declare
  v_household_id uuid;
  v_entry_id uuid;
begin
  select household_id into v_household_id from profiles where id = auth.uid();
  if v_household_id is null then
    raise exception 'Belum tergabung dalam keluarga.';
  end if;

  if p_from_asset_id = p_to_asset_id then
    raise exception 'Aset asal dan tujuan tidak boleh sama.';
  end if;

  insert into journal_entries (household_id, user_id, from_asset_id, to_asset_id, amount, description, date)
  values (v_household_id, auth.uid(), p_from_asset_id, p_to_asset_id, p_amount, p_description, p_date)
  returning id into v_entry_id;

  update assets set value = value - p_amount, updated_at = now() where id = p_from_asset_id;
  if not found then
    raise exception 'Aset asal tidak ditemukan atau bukan milik Anda.';
  end if;

  update assets set value = value + p_amount, updated_at = now() where id = p_to_asset_id;
  if not found then
    raise exception 'Aset tujuan tidak ditemukan atau bukan milik Anda.';
  end if;

  return v_entry_id;
end;
$$;

create or replace function public.delete_journal_entry(p_id uuid)
returns void
language plpgsql
as $$
declare
  v_from_asset_id uuid;
  v_to_asset_id uuid;
  v_amount numeric;
begin
  select from_asset_id, to_asset_id, amount into v_from_asset_id, v_to_asset_id, v_amount
  from journal_entries where id = p_id;

  if not found then
    raise exception 'Entri jurnal tidak ditemukan.';
  end if;

  delete from journal_entries where id = p_id;
  if not found then
    raise exception 'Kamu tidak punya izin menghapus entri ini.';
  end if;

  update assets set value = value + v_amount, updated_at = now() where id = v_from_asset_id;
  update assets set value = value - v_amount, updated_at = now() where id = v_to_asset_id;
end;
$$;

grant execute on function public.add_journal_entry(uuid, uuid, numeric, text, date) to authenticated;
grant execute on function public.delete_journal_entry(uuid) to authenticated;

-- =========================================================
-- RIWAYAT NILAI ASET
-- =========================================================
-- Mencatat setiap perubahan nilai aset (edit manual, transaksi, transfer)
-- supaya bisa dilihat histori "sebelum -> sesudah" per periode.

create table if not exists asset_value_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  changed_by uuid references profiles(id) on delete set null,
  value_before numeric(16,2) not null,
  value_after numeric(16,2) not null,
  source text not null check (source in ('initial','manual_edit','transaction','transfer_out','transfer_in')),
  reference_id uuid,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_asset_value_history_asset on asset_value_history(asset_id, date desc);

alter table asset_value_history enable row level security;

create policy "lihat riwayat nilai aset sehousehold"
  on asset_value_history for select to authenticated
  using (household_id = my_household_id());

create policy "tambah riwayat nilai aset household sendiri"
  on asset_value_history for insert to authenticated
  with check (household_id = my_household_id());

create policy "hapus riwayat nilai aset household sendiri"
  on asset_value_history for delete to authenticated
  using (household_id = my_household_id());

-- Edit manual aset sekarang lewat fungsi ini (supaya tercatat di riwayat)
create or replace function public.update_asset_with_history(
  p_id uuid,
  p_name text,
  p_value numeric,
  p_category_id int,
  p_acquired_date date,
  p_notes text
)
returns void
language plpgsql
as $$
declare
  v_household_id uuid;
  v_value_before numeric;
begin
  select household_id, value into v_household_id, v_value_before from assets where id = p_id;
  if not found then
    raise exception 'Aset tidak ditemukan.';
  end if;

  update assets
  set name = p_name, value = p_value, category_id = p_category_id,
      acquired_date = p_acquired_date, notes = p_notes, updated_at = now()
  where id = p_id;
  if not found then
    raise exception 'Kamu tidak punya izin mengubah aset ini.';
  end if;

  if v_value_before <> p_value then
    insert into asset_value_history (asset_id, household_id, changed_by, value_before, value_after, source, date)
    values (p_id, v_household_id, auth.uid(), v_value_before, p_value, 'manual_edit', current_date);
  end if;
end;
$$;

grant execute on function public.update_asset_with_history(uuid, text, numeric, int, date, text) to authenticated;

-- Perbarui add/delete_transaction_with_asset_sync supaya mencatat riwayat
create or replace function public.add_transaction_with_asset_sync(
  p_type text,
  p_amount numeric,
  p_category_id int,
  p_date date,
  p_description text,
  p_asset_id uuid
)
returns uuid
language plpgsql
as $$
declare
  v_household_id uuid;
  v_transaction_id uuid;
  v_delta numeric;
  v_value_before numeric;
  v_value_after numeric;
begin
  select household_id into v_household_id from profiles where id = auth.uid();
  if v_household_id is null then
    raise exception 'Belum tergabung dalam keluarga.';
  end if;

  insert into transactions (household_id, user_id, category_id, type, amount, date, description, asset_id)
  values (v_household_id, auth.uid(), p_category_id, p_type, p_amount, p_date, p_description, p_asset_id)
  returning id into v_transaction_id;

  if p_asset_id is not null then
    v_delta := case when p_type = 'income' then p_amount else -p_amount end;

    select value into v_value_before from assets where id = p_asset_id;

    update assets set value = value + v_delta, updated_at = now() where id = p_asset_id
    returning value into v_value_after;
    if not found then
      raise exception 'Aset sumber kas tidak ditemukan atau bukan milik Anda.';
    end if;

    insert into asset_value_history (asset_id, household_id, changed_by, value_before, value_after, source, reference_id, date)
    values (p_asset_id, v_household_id, auth.uid(), v_value_before, v_value_after, 'transaction', v_transaction_id, p_date);
  end if;

  return v_transaction_id;
end;
$$;

create or replace function public.delete_transaction_with_asset_sync(p_id uuid)
returns void
language plpgsql
as $$
declare
  v_type text;
  v_amount numeric;
  v_asset_id uuid;
  v_delta numeric;
begin
  select type, amount, asset_id into v_type, v_amount, v_asset_id
  from transactions where id = p_id;

  if not found then
    raise exception 'Transaksi tidak ditemukan.';
  end if;

  delete from transactions where id = p_id;
  if not found then
    raise exception 'Kamu tidak punya izin menghapus transaksi ini.';
  end if;

  if v_asset_id is not null then
    v_delta := case when v_type = 'income' then -v_amount else v_amount end;
    update assets set value = value + v_delta, updated_at = now() where id = v_asset_id;
    delete from asset_value_history where reference_id = p_id and source = 'transaction';
  end if;
end;
$$;

-- Perbarui add/delete_journal_entry supaya mencatat riwayat (2 baris: keluar & masuk)
create or replace function public.add_journal_entry(
  p_from_asset_id uuid,
  p_to_asset_id uuid,
  p_amount numeric,
  p_description text,
  p_date date
)
returns uuid
language plpgsql
as $$
declare
  v_household_id uuid;
  v_entry_id uuid;
  v_from_before numeric;
  v_from_after numeric;
  v_to_before numeric;
  v_to_after numeric;
begin
  select household_id into v_household_id from profiles where id = auth.uid();
  if v_household_id is null then
    raise exception 'Belum tergabung dalam keluarga.';
  end if;

  if p_from_asset_id = p_to_asset_id then
    raise exception 'Aset asal dan tujuan tidak boleh sama.';
  end if;

  insert into journal_entries (household_id, user_id, from_asset_id, to_asset_id, amount, description, date)
  values (v_household_id, auth.uid(), p_from_asset_id, p_to_asset_id, p_amount, p_description, p_date)
  returning id into v_entry_id;

  select value into v_from_before from assets where id = p_from_asset_id;
  update assets set value = value - p_amount, updated_at = now() where id = p_from_asset_id
  returning value into v_from_after;
  if not found then
    raise exception 'Aset asal tidak ditemukan atau bukan milik Anda.';
  end if;

  select value into v_to_before from assets where id = p_to_asset_id;
  update assets set value = value + p_amount, updated_at = now() where id = p_to_asset_id
  returning value into v_to_after;
  if not found then
    raise exception 'Aset tujuan tidak ditemukan atau bukan milik Anda.';
  end if;

  insert into asset_value_history (asset_id, household_id, changed_by, value_before, value_after, source, reference_id, date)
  values (p_from_asset_id, v_household_id, auth.uid(), v_from_before, v_from_after, 'transfer_out', v_entry_id, p_date);
  insert into asset_value_history (asset_id, household_id, changed_by, value_before, value_after, source, reference_id, date)
  values (p_to_asset_id, v_household_id, auth.uid(), v_to_before, v_to_after, 'transfer_in', v_entry_id, p_date);

  return v_entry_id;
end;
$$;

create or replace function public.delete_journal_entry(p_id uuid)
returns void
language plpgsql
as $$
declare
  v_from_asset_id uuid;
  v_to_asset_id uuid;
  v_amount numeric;
begin
  select from_asset_id, to_asset_id, amount into v_from_asset_id, v_to_asset_id, v_amount
  from journal_entries where id = p_id;

  if not found then
    raise exception 'Entri jurnal tidak ditemukan.';
  end if;

  delete from journal_entries where id = p_id;
  if not found then
    raise exception 'Kamu tidak punya izin menghapus entri ini.';
  end if;

  update assets set value = value + v_amount, updated_at = now() where id = v_from_asset_id;
  update assets set value = value - v_amount, updated_at = now() where id = v_to_asset_id;

  delete from asset_value_history where reference_id = p_id and source in ('transfer_out','transfer_in');
end;
$$;

-- Izin kelola kategori transaksi (tambah/hapus), sama seperti kategori aset
create policy "kategori transaksi bisa ditambah user login"
  on transaction_categories for insert to authenticated with check (true);
create policy "kategori transaksi bisa dihapus user login"
  on transaction_categories for delete to authenticated using (true);

-- =========================================================
-- EDIT TRANSAKSI & TRANSFER (dengan sinkronisasi ulang ke aset)
-- =========================================================
-- Membalik efek lama ke aset lama, lalu menerapkan efek baru ke aset
-- baru -- dalam satu transaksi atomik, supaya nilai aset & riwayat
-- tetap konsisten walau kategori/jumlah/aset-nya diubah.

create or replace function public.update_transaction_with_asset_sync(
  p_id uuid,
  p_type text,
  p_amount numeric,
  p_category_id int,
  p_date date,
  p_description text,
  p_asset_id uuid
)
returns void
language plpgsql
as $$
declare
  v_old_type text;
  v_old_amount numeric;
  v_old_asset_id uuid;
  v_household_id uuid;
  v_old_delta numeric;
  v_new_delta numeric;
  v_value_before numeric;
  v_value_after numeric;
begin
  select type, amount, asset_id, household_id into v_old_type, v_old_amount, v_old_asset_id, v_household_id
  from transactions where id = p_id;

  if not found then
    raise exception 'Catatan tidak ditemukan.';
  end if;

  update transactions
  set type = p_type, amount = p_amount, category_id = p_category_id,
      date = p_date, description = p_description, asset_id = p_asset_id
  where id = p_id;
  if not found then
    raise exception 'Kamu tidak punya izin mengubah catatan ini.';
  end if;

  if v_old_asset_id is not null then
    v_old_delta := case when v_old_type = 'income' then -v_old_amount else v_old_amount end;
    update assets set value = value + v_old_delta, updated_at = now() where id = v_old_asset_id;
    delete from asset_value_history where reference_id = p_id and source = 'transaction';
  end if;

  if p_asset_id is not null then
    v_new_delta := case when p_type = 'income' then p_amount else -p_amount end;
    select value into v_value_before from assets where id = p_asset_id;
    update assets set value = value + v_new_delta, updated_at = now() where id = p_asset_id
    returning value into v_value_after;
    if not found then
      raise exception 'Aset tidak ditemukan atau bukan milik Anda.';
    end if;
    insert into asset_value_history (asset_id, household_id, changed_by, value_before, value_after, source, reference_id, date)
    values (p_asset_id, v_household_id, auth.uid(), v_value_before, v_value_after, 'transaction', p_id, p_date);
  end if;
end;
$$;

create or replace function public.update_journal_entry(
  p_id uuid,
  p_from_asset_id uuid,
  p_to_asset_id uuid,
  p_amount numeric,
  p_description text,
  p_date date
)
returns void
language plpgsql
as $$
declare
  v_old_from uuid;
  v_old_to uuid;
  v_old_amount numeric;
  v_household_id uuid;
  v_from_before numeric;
  v_from_after numeric;
  v_to_before numeric;
  v_to_after numeric;
begin
  select from_asset_id, to_asset_id, amount, household_id into v_old_from, v_old_to, v_old_amount, v_household_id
  from journal_entries where id = p_id;

  if not found then
    raise exception 'Entri jurnal tidak ditemukan.';
  end if;

  if p_from_asset_id = p_to_asset_id then
    raise exception 'Aset asal dan tujuan tidak boleh sama.';
  end if;

  update journal_entries
  set from_asset_id = p_from_asset_id, to_asset_id = p_to_asset_id,
      amount = p_amount, description = p_description, date = p_date
  where id = p_id;
  if not found then
    raise exception 'Kamu tidak punya izin mengubah entri ini.';
  end if;

  update assets set value = value + v_old_amount, updated_at = now() where id = v_old_from;
  update assets set value = value - v_old_amount, updated_at = now() where id = v_old_to;
  delete from asset_value_history where reference_id = p_id and source in ('transfer_out','transfer_in');

  select value into v_from_before from assets where id = p_from_asset_id;
  update assets set value = value - p_amount, updated_at = now() where id = p_from_asset_id
  returning value into v_from_after;
  if not found then
    raise exception 'Aset asal tidak ditemukan atau bukan milik Anda.';
  end if;

  select value into v_to_before from assets where id = p_to_asset_id;
  update assets set value = value + p_amount, updated_at = now() where id = p_to_asset_id
  returning value into v_to_after;
  if not found then
    raise exception 'Aset tujuan tidak ditemukan atau bukan milik Anda.';
  end if;

  insert into asset_value_history (asset_id, household_id, changed_by, value_before, value_after, source, reference_id, date)
  values (p_from_asset_id, v_household_id, auth.uid(), v_from_before, v_from_after, 'transfer_out', p_id, p_date);
  insert into asset_value_history (asset_id, household_id, changed_by, value_before, value_after, source, reference_id, date)
  values (p_to_asset_id, v_household_id, auth.uid(), v_to_before, v_to_after, 'transfer_in', p_id, p_date);
end;
$$;

grant execute on function public.update_transaction_with_asset_sync(uuid, text, numeric, int, date, text, uuid) to authenticated;
grant execute on function public.update_journal_entry(uuid, uuid, uuid, numeric, text, date) to authenticated;

-- =========================================================
-- BATCH TRANSAKSI (input multi-baris yang saling tertaut)
-- =========================================================
-- Baris-baris yang di-input bersamaan lewat "+ Tambah baris" berbagi
-- batch_id yang sama. Mengubah tanggal/sumber kas salah satu anggota
-- batch akan ikut mengubah semua anggota lainnya (kategori & jumlah
-- masing-masing tetap independen).

alter table transactions add column if not exists batch_id uuid;
create index if not exists idx_transactions_batch on transactions(batch_id) where batch_id is not null;

-- Signature berubah (tambah p_batch_id) -- drop versi lama dulu supaya
-- tidak ada dua fungsi dengan nama sama yang ambigu.
drop function if exists public.add_transaction_with_asset_sync(text, numeric, int, date, text, uuid);

create or replace function public.add_transaction_with_asset_sync(
  p_type text,
  p_amount numeric,
  p_category_id int,
  p_date date,
  p_description text,
  p_asset_id uuid,
  p_batch_id uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_household_id uuid;
  v_transaction_id uuid;
  v_delta numeric;
  v_value_before numeric;
  v_value_after numeric;
begin
  select household_id into v_household_id from profiles where id = auth.uid();
  if v_household_id is null then
    raise exception 'Belum tergabung dalam keluarga.';
  end if;

  insert into transactions (household_id, user_id, category_id, type, amount, date, description, asset_id, batch_id)
  values (v_household_id, auth.uid(), p_category_id, p_type, p_amount, p_date, p_description, p_asset_id, p_batch_id)
  returning id into v_transaction_id;

  if p_asset_id is not null then
    v_delta := case when p_type = 'income' then p_amount else -p_amount end;

    select value into v_value_before from assets where id = p_asset_id;

    update assets set value = value + v_delta, updated_at = now() where id = p_asset_id
    returning value into v_value_after;
    if not found then
      raise exception 'Aset sumber kas tidak ditemukan atau bukan milik Anda.';
    end if;

    insert into asset_value_history (asset_id, household_id, changed_by, value_before, value_after, source, reference_id, date)
    values (p_asset_id, v_household_id, auth.uid(), v_value_before, v_value_after, 'transaction', v_transaction_id, p_date);
  end if;

  return v_transaction_id;
end;
$$;

create or replace function public.update_transaction_with_asset_sync_batch(
  p_id uuid,
  p_type text,
  p_amount numeric,
  p_category_id int,
  p_date date,
  p_description text,
  p_asset_id uuid
)
returns void
language plpgsql
as $$
declare
  v_batch_id uuid;
  r record;
begin
  perform public.update_transaction_with_asset_sync(p_id, p_type, p_amount, p_category_id, p_date, p_description, p_asset_id);

  select batch_id into v_batch_id from transactions where id = p_id;

  if v_batch_id is not null then
    for r in
      select id, type, amount, category_id, description
      from transactions
      where batch_id = v_batch_id and id <> p_id
    loop
      perform public.update_transaction_with_asset_sync(r.id, r.type, r.amount, r.category_id, p_date, r.description, p_asset_id);
    end loop;
  end if;
end;
$$;

grant execute on function public.add_transaction_with_asset_sync(text, numeric, int, date, text, uuid, uuid) to authenticated;
grant execute on function public.update_transaction_with_asset_sync_batch(uuid, text, numeric, int, date, text, uuid) to authenticated;

-- =========================================================
-- NOMOR URUT CATATAN (otomatis, permanen)
-- =========================================================
-- Satu sequence dipakai bersama untuk transaksi & transfer supaya
-- nomornya tidak bentrok saat ditampilkan gabungan di Akuntansi.
-- Nomor diberikan otomatis oleh database saat baris dibuat, dan
-- tidak berubah walau catatan lain dihapus.

create sequence if not exists ledger_seq;

alter table transactions add column if not exists seq_no bigint default nextval('ledger_seq');
alter table journal_entries add column if not exists seq_no bigint default nextval('ledger_seq');
