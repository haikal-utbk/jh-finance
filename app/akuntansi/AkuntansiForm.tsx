"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addLedgerTransaction,
  addLedgerTransfer,
  addTransactionCategory,
  deleteTransactionCategory,
} from "./actions";
import CurrencyInput from "@/components/CurrencyInput";

type Category = { id: number; name: string; type: "income" | "expense" };
type Asset = { id: string; name: string; asset_categories: { name: string } | null };

function newLineKey() {
  return Math.random().toString(36).slice(2);
}

export default function AkuntansiForm({
  categories,
  assets,
  onDone,
  onClose,
}: {
  categories: Category[];
  assets: Asset[];
  onDone?: () => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"expense" | "income" | "transfer">("expense");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineKeys, setLineKeys] = useState<string[]>([newLineKey()]);

  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

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

  const assetLabel = mode === "expense" ? "Dari kas" : mode === "income" ? "Ke kas" : "Sumber kas";

  function addLine() {
    setLineKeys((keys) => [...keys, newLineKey()]);
  }

  function removeLine(key: string) {
    setLineKeys((keys) => keys.filter((k) => k !== key));
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      if (mode === "transfer") {
        await addLedgerTransfer(formData);
      } else {
        const date = String(formData.get("date") ?? "");
        const assetId = String(formData.get("asset_id") ?? "");
        const categoryIds = formData.getAll("category_id") as string[];
        const amounts = formData.getAll("amount") as string[];
        const descriptions = formData.getAll("description") as string[];

        for (let i = 0; i < categoryIds.length; i++) {
          const lineData = new FormData();
          lineData.set("type", mode);
          lineData.set("category_id", categoryIds[i]);
          lineData.set("amount", amounts[i]);
          lineData.set("date", date);
          lineData.set("description", descriptions[i] ?? "");
          lineData.set("asset_id", assetId);
          await addLedgerTransaction(lineData);
        }
      }
      formRef.current?.reset();
      setLineKeys([newLineKey()]);
      onDone?.();
    } catch (err: any) {
      setError(err.message ?? "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCategory() {
    if (mode === "transfer") return;
    setCatLoading(true);
    setCatError(null);
    try {
      await addTransactionCategory(newCatName, mode);
      setNewCatName("");
      router.refresh();
    } catch (err: any) {
      setCatError(err.message ?? "Gagal menambah kategori.");
    } finally {
      setCatLoading(false);
    }
  }

  async function handleDeleteCategory(id: number) {
    setCatLoading(true);
    setCatError(null);
    try {
      await deleteTransactionCategory(id);
      router.refresh();
    } catch (err: any) {
      setCatError(err.message ?? "Gagal menghapus kategori.");
    } finally {
      setCatLoading(false);
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

      {mode === "transfer" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CurrencyInput name="amount" label="Jumlah (Rp)" required />
          <div>
            <label className="label">Tanggal</label>
            <input name="date" type="date" className="input" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Keterangan</label>
            <input name="description" className="input" placeholder="Opsional" />
          </div>
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
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tanggal</label>
              <input name="date" type="date" className="input" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div>
              <label className="label">{assetLabel}</label>
              <select name="asset_id" className="input" required defaultValue="">
                {assetOptions}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="label mb-0">Rincian</label>
            <button
              type="button"
              onClick={() => setCatManagerOpen((v) => !v)}
              className="text-xs text-ink/50 hover:text-moss"
            >
              {catManagerOpen ? "Tutup kelola kategori" : "Kelola kategori"}
            </button>
          </div>

          {catManagerOpen && (
            <div className="border border-line rounded-card p-3 space-y-2">
              {filteredCategories.length === 0 && (
                <p className="text-xs text-ink/40">Belum ada kategori.</p>
              )}
              {filteredCategories.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <button
                    type="button"
                    disabled={catLoading}
                    onClick={() => handleDeleteCategory(c.id)}
                    className="text-xs text-ink/40 hover:text-danger disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input
                  className="input flex-1 text-sm"
                  placeholder="Kategori baru"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <button
                  type="button"
                  disabled={catLoading || !newCatName.trim()}
                  onClick={handleAddCategory}
                  className="btn-secondary text-sm px-3 disabled:opacity-50"
                >
                  Tambah
                </button>
              </div>
              {catError && <p className="text-danger text-xs">{catError}</p>}
            </div>
          )}

          {!catManagerOpen && (
            <div className="space-y-3">
              {lineKeys.map((key, idx) => (
                <div key={key} className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_2fr_auto] gap-2 items-start">
                  <select name="category_id" className="input" required defaultValue="">
                    <option value="" disabled>Kategori</option>
                    {filteredCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <CurrencyInput name="amount" required />
                  <input name="description" className="input" placeholder="Keterangan (opsional)" />
                  {lineKeys.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(key)}
                      className="text-ink/40 hover:text-danger text-sm px-2 h-[42px]"
                      title="Hapus baris"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addLine}
                className="text-sm text-moss hover:underline"
              >
                + Tambah baris
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading || catManagerOpen} className="btn-primary flex-1">
          {loading ? "Menyimpan..." : "Simpan"}
        </button>
        <button type="button" onClick={() => onClose?.()} className="btn-secondary">
          Tutup
        </button>
      </div>
    </form>
  );
}
