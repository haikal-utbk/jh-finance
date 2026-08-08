"use client";

import { useState } from "react";
import Link from "next/link";
import { formatIDR } from "@/lib/format";
import LiabilityForm from "./LiabilityForm";
import DeleteButton from "./DeleteButton";
import Modal from "@/components/Modal";

type Category = { id: number; name: string };

type Liability = {
  id: string;
  name: string;
  value: number;
  category_id: number;
  started_date: string | null;
  notes: string | null;
  owner_id: string;
  liability_categories: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

export default function LiabilitiesClient({
  categories,
  liabilities,
  currentUserId,
}: {
  categories: Category[];
  liabilities: Liability[];
  currentUserId: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  const editingLiability = liabilities.find((l) => l.id === editingId) ?? null;
  const total = liabilities.reduce((sum, l) => sum + Number(l.value), 0);

  const ownerIds = Array.from(new Set(liabilities.map((l) => l.owner_id)));
  const ownerGroups = ownerIds
    .map((ownerId) => {
      const ownerLiabilities = liabilities.filter((l) => l.owner_id === ownerId);
      const ownerName = ownerLiabilities[0]?.profiles?.full_name ?? "Tidak diketahui";
      const categoryGroups = categories
        .map((cat) => ({
          category: cat,
          items: ownerLiabilities.filter((l) => l.category_id === cat.id),
        }))
        .filter((g) => g.items.length > 0);
      const ownerTotal = ownerLiabilities.reduce((sum, l) => sum + Number(l.value), 0);
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
        <h1 className="text-2xl">Kewajiban</h1>
        <div className="flex items-center gap-4">
          <Link href="/liabilities/categories" className="text-sm text-ink/60 hover:text-moss">
            Kelola kategori
          </Link>
          <p className="text-ink/60 text-sm">
            Total: <span className="font-medium text-clay">{formatIDR(total)}</span>
          </p>
          <button onClick={openAdd} className="btn-primary text-sm">
            + Tambah kewajiban
          </button>
        </div>
      </div>

      {ownerGroups.length === 0 && (
        <div className="card text-center text-ink/40 py-6">Belum ada kewajiban tercatat.</div>
      )}

      <div className="space-y-6">
        {ownerGroups.map((og) => (
          <div key={og.ownerId} className="card p-0 overflow-hidden">
            <div className="px-4 py-3 bg-clay/10 flex items-center justify-between">
              <h2 className="font-display text-lg text-clay">{og.ownerName}</h2>
              <span className="text-sm font-medium text-clay">{formatIDR(og.ownerTotal)}</span>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper text-ink/60 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium text-right">Sisa nilai</th>
                  <th className="px-4 py-3 font-medium">Mulai</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              {og.categoryGroups.map((g) => {
                const subtotal = g.items.reduce((sum, l) => sum + Number(l.value), 0);
                return (
                  <tbody key={g.category.id}>
                    <tr className="border-t border-line bg-paper">
                      <td colSpan={4} className="px-4 py-2 font-medium text-ink/70">
                        {g.category.name}
                      </td>
                    </tr>
                    {g.items.map((l) => {
                      const isOwner = l.owner_id === currentUserId;
                      return (
                        <tr key={l.id} className="border-t border-line">
                          <td className="px-4 py-3">{l.name}</td>
                          <td className="px-4 py-3 text-right">{formatIDR(Number(l.value))}</td>
                          <td className="px-4 py-3 text-ink/60">
                            {l.started_date ? new Date(l.started_date).getFullYear() : "-"}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {isOwner ? (
                              <>
                                <button
                                  onClick={() => openEdit(l.id)}
                                  className="text-ink/60 hover:text-moss text-sm mr-3"
                                >
                                  Edit
                                </button>
                                <DeleteButton id={l.id} />
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
                      <td className="px-4 py-2 text-right text-xs font-medium text-clay">
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
        <LiabilityForm
          key={editingLiability ? editingLiability.id : `new-${formVersion}`}
          categories={categories}
          editing={editingLiability}
          onDone={handleDone}
        />
      </Modal>
    </>
  );
}
