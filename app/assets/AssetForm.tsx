"use client";

import { useRef, useState } from "react";
import { addAsset, updateAsset } from "./actions";
import CurrencyInput from "@/components/CurrencyInput";

type Category = { id: number; name: string };

type EditingAsset = {
  id: string;
  name: string;
  category_id: number;
  value: number;
  acquired_date: string | null;
  notes: string | null;
} | null;

export default function AssetForm({
  categories,
  editing,
  onDone,
}: {
  categories: Category[];
  editing?: EditingAsset;
  onDone?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      if (editing) {
        await updateAsset(editing.id, formData);
      } else {
        await addAsset(formData);
      }
      formRef.current?.reset();
      onDone?.();
    } catch (err: any) {
      setError(err.message ?? "Gagal menyimpan aset.");
    } finally {
      setLoading(false);
    }
  }

  const acquiredYear = editing?.acquired_date
    ? new Date(editing.acquired_date).getFullYear()
    : undefined;

  return (
    <form ref={formRef} action={handleSubmit} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">{editing ? "Edit aset" : "Tambah aset"}</h2>
        {editing && (
          <button type="button" onClick={() => onDone?.()} className="text-sm text-ink/60 hover:text-danger">
            Batal
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Nama aset</label>
          <input
            name="name"
            className="input"
            placeholder="Contoh: Rumah Bandung"
            defaultValue={editing?.name}
            required
          />
        </div>
        <div>
          <label className="label">Kategori</label>
          <select name="category_id" className="input" required defaultValue={editing?.category_id ?? ""}>
            <option value="" disabled>Pilih kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <CurrencyInput name="value" label="Nilai (Rp)" required defaultValue={editing?.value} />
        <div>
          <label className="label">Tahun perolehan</label>
          <input
            name="acquired_year"
            type="number"
            className="input"
            placeholder="Contoh: 2022"
            min={1900}
            max={2100}
            defaultValue={acquiredYear}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Catatan</label>
          <input name="notes" className="input" placeholder="Opsional" defaultValue={editing?.notes ?? ""} />
        </div>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan aset"}
      </button>
    </form>
  );
}
