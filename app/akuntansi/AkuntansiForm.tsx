"use client";

import { useRef, useState } from "react";
import { addLedgerTransaction, addLedgerTransfer } from "./actions";
import CurrencyInput from "@/components/CurrencyInput";

type Category = { id: number; name: string; type: "income" | "expense" };
type Asset = { id: string; name: string; asset_categories: { name: string } | null };

export default function AkuntansiForm({
  categories,
  assets,
  onDone,
}: {
  categories: Category[];
  assets: Asset[];
  onDone?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"expense" | "income" | "transfer">("expense");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  const filteredCategories = categories.filter((c) => c.type === mode);

  const assetGroups = Array.from(
    new Set(assets.map((a) => a.asset_categories?.name ?? "Lainnya"))
  ).map((catName) => ({
    catName,
    items: assets.filter((a) => (a.asset_categories?.name ?? "Lainnya") === catName),
  }));

  const assetOptions = (
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

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      if (mode === "transfer") {
        await addLedgerTransfer(formData);
      } else {
        formData.set("type", mode);
        await addLedgerTransaction(formData);
      }
      formRef.current?.reset();
      setFormVersion((v) => v + 1);
      onDone?.();
    } catch (err: any) {
      setError(err.message ?? "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="card space-y-4">
      <h2 className="text-lg">Tambah catatan</h2>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("expense")}
          className={`flex-1 rounded-card px-3 py-2 text-sm border ${
            mode === "expense" ? "border-clay bg-clay/10 text-clay" : "border-line text-ink/60"
          }`}
        >
          Pengeluaran
        </button>
        <button
          type="button"
          onClick={() => setMode("income")}
          className={`flex-1 rounded-card px-3 py-2 text-sm border ${
            mode === "income" ? "border-moss bg-moss/10 text-moss" : "border-line text-ink/60"
          }`}
        >
          Pemasukan
        </button>
        <button
          type="button"
          onClick={() => setMode("transfer")}
          className={`flex-1 rounded-card px-3 py-2 text-sm border ${
            mode === "transfer" ? "border-gold bg-gold/10 text-gold" : "border-line text-ink/60"
          }`}
        >
          Transfer
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {mode !== "transfer" && (
          <div>
            <label className="label">Kategori</label>
            <select name="category_id" className="input" required defaultValue="">
              <option value="" disabled>Pilih kategori</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <CurrencyInput key={formVersion} name="amount" label="Jumlah (Rp)" required />

        <div>
          <label className="label">Tanggal</label>
          <input name="date" type="date" className="input" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>

        <div>
          <label className="label">Keterangan</label>
          <input name="description" className="input" placeholder="Opsional" />
        </div>

        {mode === "transfer" ? (
          <>
            <div>
              <label className="label">Dari aset</label>
              <select name="from_asset_id" className="input" required defaultValue="">
                {assetOptions}
              </select>
            </div>
            <div>
              <label className="label">Ke aset</label>
              <select name="to_asset_id" className="input" required defaultValue="">
                {assetOptions}
              </select>
            </div>
          </>
        ) : (
          <div className="sm:col-span-2">
            <label className="label">Sumber kas</label>
            <select name="asset_id" className="input" required defaultValue="">
              {assetOptions}
            </select>
          </div>
        )}
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}
