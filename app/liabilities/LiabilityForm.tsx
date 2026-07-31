"use client";

import { useRef, useState } from "react";
import { addLiability, updateLiability } from "./actions";
import CurrencyInput from "@/components/CurrencyInput";

type Category = { id: number; name: string };

type EditingLiability = {
  id: string;
  name: string;
  category_id: number;
  value: number;
  started_date: string | null;
  notes: string | null;
} | null;

export default function LiabilityForm({
  categories,
  editing,
  onDone,
}: {
  categories: Category[];
  editing?: EditingLiability;
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
        await updateLiability(editing.id, formData);
      } else {
        await addLiability(formData);
      }
      formRef.current?.reset();
      onDone?.();
    } catch (err: any) {
      setError(err.message ?? "Gagal menyimpan kewajiban.");
    } finally {
      setLoading(false);
    }
  }

  const startedYear = editing?.started_date
    ? new Date(editing.started_date).getFullYear()
    : undefined;

  return (
    <form ref={formRef} action={handleSubmit} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">{editing ? "Edit kewajiban" : "Tambah kewajiban"}</h2>
        {editing && (
          <button type="button" onClick={() => onDone?.()} className="text-sm text-ink/60 hover:text-danger">
            Batal
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Nama kewajiban</label>
          <input
            name="name"
            className="input"
            placeholder="Contoh: Cicilan KPR BCA"
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
        <CurrencyInput name="value" label="Sisa nilai (Rp)" required defaultValue={editing?.value} />
        <div>
          <label className="label">Tahun mulai</label>
          <input
            name="started_year"
            type="number"
            className="input"
            placeholder="Contoh: 2022"
            min={1900}
            max={2100}
            defaultValue={startedYear}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Catatan</label>
          <input name="notes" className="input" placeholder="Opsional" defaultValue={editing?.notes ?? ""} />
        </div>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan kewajiban"}
      </button>
    </form>
  );
}
