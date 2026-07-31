"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { addAssetCategory, deleteAssetCategory } from "./actions";

type Category = { id: number; name: string };

export default function CategoriesClient({ categories }: { categories: Category[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      await addAssetCategory(formData);
      formRef.current?.reset();
    } catch (err: any) {
      setError(err.message ?? "Gagal menambah kategori.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    setDeletingId(id);
    try {
      await deleteAssetCategory(id);
    } catch (err: any) {
      setError(err.message ?? "Gagal menghapus kategori.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Kategori Aset</h1>
        <Link href="/assets" className="text-sm text-moss font-medium">
          &larr; Kembali ke Aset
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper text-ink/60 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nama kategori</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-ink/40">
                    Belum ada kategori.
                  </td>
                </tr>
              )}
              {categories.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="text-ink/60 hover:text-danger text-sm disabled:opacity-50"
                    >
                      {deletingId === c.id ? "Menghapus..." : "Hapus"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form ref={formRef} action={handleSubmit} className="card space-y-4 h-fit">
          <h2 className="text-lg">Tambah kategori</h2>
          <div>
            <label className="label">Nama kategori</label>
            <input name="name" className="input" placeholder="Contoh: Piutang" required />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Menyimpan..." : "Tambah kategori"}
          </button>
        </form>
      </div>
    </>
  );
}
