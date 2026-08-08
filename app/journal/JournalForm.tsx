"use client";

import { useRef, useState } from "react";
import { addJournalEntry } from "./actions";
import CurrencyInput from "@/components/CurrencyInput";

type Asset = { id: string; name: string; asset_categories: { name: string } | null };

export default function JournalForm({
  assets,
  onDone,
}: {
  assets: Asset[];
  onDone?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await addJournalEntry(formData);
      formRef.current?.reset();
      onDone?.();
    } catch (err: any) {
      setError(err.message ?? "Gagal menyimpan jurnal.");
    } finally {
      setLoading(false);
    }
  }

  const options = (
    <>
      <option value="" disabled>Pilih aset</option>
      {assetGroups.map((g) => (
        <optgroup key={g.catName} label={g.catName}>
          {g.items.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </optgroup>
      ))}
    </>
  );

  return (
    <form ref={formRef} action={handleSubmit} className="card space-y-4">
      <h2 className="text-lg">Tambah jurnal</h2>
      <p className="text-xs text-ink/50">
        Untuk mutasi antar aset yang bukan pemasukan/pengeluaran baru — misal transfer
        antar rekening, tarik tunai, atau pelunasan piutang.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Dari aset</label>
          <select name="from_asset_id" className="input" required defaultValue="">
            {options}
          </select>
        </div>
        <div>
          <label className="label">Ke aset</label>
          <select name="to_asset_id" className="input" required defaultValue="">
            {options}
          </select>
        </div>
        <CurrencyInput name="amount" label="Jumlah (Rp)" required />
        <div>
          <label className="label">Tanggal</label>
          <input name="date" type="date" className="input" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Keterangan</label>
          <input name="description" className="input" placeholder="Contoh: Pelunasan piutang Aris" />
        </div>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Menyimpan..." : "Simpan jurnal"}
      </button>
    </form>
  );
}
