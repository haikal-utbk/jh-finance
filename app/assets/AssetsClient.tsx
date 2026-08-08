"use client";

import { useState } from "react";
import Link from "next/link";
import { formatIDR } from "@/lib/format";
import AssetForm from "./AssetForm";
import DeleteButton from "./DeleteButton";
import Modal from "@/components/Modal";

type Category = { id: number; name: string };

type Asset = {
  id: string;
  name: string;
  value: number;
  category_id: number;
  acquired_date: string | null;
  notes: string | null;
  owner_id: string;
  asset_categories: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

export default function AssetsClient({
  categories,
  assets,
  currentUserId,
}: {
  categories: Category[];
  assets: Asset[];
  currentUserId: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  const editingAsset = assets.find((a) => a.id === editingId) ?? null;
  const total = assets.reduce((sum, a) => sum + Number(a.value), 0);

  const ownerIds = Array.from(new Set(assets.map((a) => a.owner_id)));
  const ownerGroups = ownerIds
    .map((ownerId) => {
      const ownerAssets = assets.filter((a) => a.owner_id === ownerId);
      const ownerName = ownerAssets[0]?.profiles?.full_name ?? "Tidak diketahui";
      const categoryGroups = categories
        .map((cat) => ({
          category: cat,
          items: ownerAssets.filter((a) => a.category_id === cat.id),
        }))
        .filter((g) => g.items.length > 0);
      const ownerTotal = ownerAssets.reduce((sum, a) => sum + Number(a.value), 0);
      return { ownerId, ownerName, categoryGroups, ownerTotal };
    })
    .sort((a, b) => (a.ownerId === currentUserId ? -1 : b.ownerId === currentUserId ? 1 : 0));

  function openAdd() {
    setEditingId(null);
    setFormVersion((v) => v + 1);
    setFormOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setFormOpen(true);
  }

  function handleDone() {
    setFormOpen(false);
    setEditingId(null);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Aset</h1>
        <div className="flex items-center gap-4">
          <Link href="/assets/categories" className="text-sm text-ink/60 hover:text-moss">
            Kelola kategori
          </Link>
          <p className="text-ink/60 text-sm">
            Total: <span className="font-medium text-moss">{formatIDR(total)}</span>
          </p>
          <button onClick={openAdd} className="btn-primary text-sm">
            + Tambah aset
          </button>
        </div>
      </div>

      {ownerGroups.length === 0 && (
        <div className="card text-center text-ink/40 py-6">Belum ada aset tercatat.</div>
      )}

      <div className="space-y-6">
        {ownerGroups.map((og) => (
          <div key={og.ownerId} className="card p-0 overflow-hidden">
            <div className="px-4 py-3 bg-moss/10 flex items-center justify-between">
              <h2 className="font-display text-lg text-moss">{og.ownerName}</h2>
              <span className="text-sm font-medium text-moss">{formatIDR(og.ownerTotal)}</span>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper text-ink/60 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium text-right">Nilai</th>
                  <th className="px-4 py-3 font-medium">Diperoleh</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              {og.categoryGroups.map((g) => {
                const subtotal = g.items.reduce((sum, a) => sum + Number(a.value), 0);
                return (
                  <tbody key={g.category.id}>
                    <tr className="border-t border-line bg-paper">
                      <td colSpan={4} className="px-4 py-2 font-medium text-ink/70">
                        {g.category.name}
                      </td>
                    </tr>
                    {g.items.map((a) => {
                      const isOwner = a.owner_id === currentUserId;
                      return (
                        <tr key={a.id} className="border-t border-line">
                          <td className="px-4 py-3">{a.name}</td>
                          <td className="px-4 py-3 text-right">{formatIDR(Number(a.value))}</td>
                          <td className="px-4 py-3 text-ink/60">
                            {a.acquired_date ? new Date(a.acquired_date).getFullYear() : "-"}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Link
                              href={`/assets/${a.id}/history`}
                              className="text-ink/60 hover:text-moss text-sm mr-3"
                            >
                              Riwayat
                            </Link>
                            {isOwner ? (
                              <>
                                <button
                                  onClick={() => openEdit(a.id)}
                                  className="text-ink/60 hover:text-moss text-sm mr-3"
                                >
                                  Edit
                                </button>
                                <DeleteButton id={a.id} />
                              </>
                            ) : (
                              <span className="text-xs text-ink/30">Read only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-line">
                      <td className="px-4 py-2 text-right text-ink/50 text-xs">
                        Subtotal {g.category.name}
                      </td>
                      <td className="px-4 py-2 text-right text-xs font-medium text-moss">
                        {formatIDR(subtotal)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                );
              })}
            </table>
            </div>
          </div>
        ))}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)}>
        <AssetForm
          key={editingAsset ? editingAsset.id : `new-${formVersion}`}
          categories={categories}
          editing={editingAsset}
          onDone={handleDone}
        />
      </Modal>
    </>
  );
}
