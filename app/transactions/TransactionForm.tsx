"use client";

import { useRef, useState } from "react";
import { addTransaction } from "./actions";
import CurrencyInput from "@/components/CurrencyInput";

type Category = { id: number; name: string; type: "income" | "expense" };
type Asset = { id: string; name: string; asset_categories: { name: string } | null };

export default function TransactionForm({
  categories,
  assets,
}: {
  categories: Category[];
  assets: Asset[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  const filtered = categories.filter((c) => c.type === type);

  const assetGroups = Array.from(
    new Set(assets.map((a) => a.asset_categories?.name ?? "Lainnya"))
  ).map((catName) => ({
    catName,
    items: assets.filter((a) => (a.asset_categories?.name ?? "Lainnya") === catName),
  }));

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      await addTransaction(formData);
      formRef.current?.reset();
      setFormVersion((v) => v + 1);
    } catch (err: any) {
      setError(err.message ?? "Gagal menyimpan transaksi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="card space-y-4">
      <h2 className="text-lg">Tambah transaksi</h2>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("expense")}
          className={`flex-1 rounded-card px-3 py-2 text-sm border ${
            type === "expense" ? "border-clay bg-clay/10 text-clay" : "border-line text-ink/60"
          }`}
        >
          Pengeluaran
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className={`flex-1 rounded-card px-3 py-2 text-sm border ${
            type === "income" ? "border-moss bg-moss/10 text-moss" : "border-line text-ink/60"
          }`}
        >
          Pemasukan
        </button>
      </div>
      <input type="hidden" name="type" value={type} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Kategori</label>
          <select name="category_id" className="input" required defaultValue="">
            <option value="" disabled>Pilih kategori</option>
            {filtered.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <CurrencyInput key={formVersion} name="amount" label="Jumlah (Rp)" required />

        <div>
          <label className="label">Tanggal</label>
          <input name="date" type="date" className="input" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className="label">Keterangan</label>
          <input name="description" className="input" placeholder="Opsional" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Sumber kas</label>
          <select name="asset_id" className="input" defaultValue="">
            <option value="">Tidak terhubung ke aset</option>
            {assetGroups.map((g) => (
              <optgroup key={g.catName} label={g.catName}>
                {g.items.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-xs text-ink/40 mt-1">
            Kalau dipilih, nilai aset itu otomatis bertambah/berkurang sesuai transaksi ini.
          </p>
        </div>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Menyimpan..." : "Simpan transaksi"}
      </button>
    </form>
  );
}
