"use client";

import { useState } from "react";
import Link from "next/link";
import { formatIDR } from "@/lib/format";
import AkuntansiForm, { EditingRow } from "./AkuntansiForm";
import DeleteButton from "./DeleteButton";
import Modal from "@/components/Modal";

type Category = { id: number; name: string; type: "income" | "expense" };
type Asset = { id: string; name: string; asset_categories: { name: string } | null };

type LedgerRow = {
  id: string;
  kind: "transaction" | "transfer";
  date: string;
  label: string;
  description: string | null;
  assetLabel: string;
  amount: number;
  sign: "+" | "-" | "~";
  userId: string;
  ownerName: string;
  type?: "income" | "expense";
  categoryId?: number;
  assetId?: string;
  fromAssetId?: string;
  toAssetId?: string;
  batchSize?: number;
};

export default function AkuntansiClient({
  categories,
  assets,
  rows,
  currentUserId,
}: {
  categories: Category[];
  assets: Asset[];
  rows: LedgerRow[];
  currentUserId: string;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<LedgerRow | null>(null);

  const ownerIds = Array.from(new Set(rows.map((r) => r.userId)));
  const ownerGroups = ownerIds
    .map((uid) => {
      const items = rows.filter((r) => r.userId === uid);
      const ownerName = items[0]?.ownerName ?? "Tidak diketahui";
      const income = items.filter((r) => r.sign === "+").reduce((s, r) => s + r.amount, 0);
      const expense = items.filter((r) => r.sign === "-").reduce((s, r) => s + r.amount, 0);

      const assetLabels = Array.from(new Set(items.map((r) => r.assetLabel)));
      const assetGroups = assetLabels.map((label) => ({
        label,
        items: items.filter((r) => r.assetLabel === label),
      }));

      return { uid, ownerName, assetGroups, income, expense };
    })
    .sort((a, b) => (a.uid === currentUserId ? -1 : b.uid === currentUserId ? 1 : 0));

  function openAdd() {
    setEditingRow(null);
    setFormOpen(true);
  }

  function openEdit(row: LedgerRow) {
    setEditingRow(row);
    setFormOpen(true);
  }

  function handleDone() {
    setFormOpen(false);
    setEditingRow(null);
  }

  const editing: EditingRow = editingRow
    ? {
        id: editingRow.id,
        kind: editingRow.kind,
        type: editingRow.type,
        categoryId: editingRow.categoryId,
        amount: editingRow.amount,
        date: editingRow.date,
        description: editingRow.description,
        assetId: editingRow.assetId,
        fromAssetId: editingRow.fromAssetId,
        toAssetId: editingRow.toAssetId,
        batchSize: editingRow.batchSize,
      }
    : null;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Akuntansi</h1>
        <div className="flex items-center gap-4">
          <Link href="/assets/categories" className="text-sm text-ink/60 hover:text-moss">
            Kelola kategori aset
          </Link>
          <button onClick={openAdd} className="btn-primary text-sm">
            + Tambah catatan
          </button>
        </div>
      </div>

      {ownerGroups.length === 0 && (
        <div className="card text-center text-ink/40 py-6">Belum ada catatan.</div>
      )}

      <div className="space-y-6">
        {ownerGroups.map((og) => (
          <div key={og.uid} className="card p-0 overflow-hidden">
            <div className="px-4 py-3 bg-moss/10 flex items-center justify-between">
              <h2 className="font-display text-lg text-moss">{og.ownerName}</h2>
              <span className="text-sm text-ink/60">
                <span className="text-moss font-medium">+{formatIDR(og.income)}</span>{" "}
                <span className="text-clay font-medium">-{formatIDR(og.expense)}</span>
              </span>
            </div>

            {og.assetGroups.map((ag) => (
              <div key={ag.label}>
                <div className="px-4 py-2 bg-paper text-sm font-medium text-ink/70 border-t border-line">
                  {ag.label}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-paper text-ink/60 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Tanggal</th>
                        <th className="px-4 py-3 font-medium">Jenis</th>
                        <th className="px-4 py-3 font-medium">Keterangan</th>
                        <th className="px-4 py-3 font-medium text-right">Jumlah</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ag.items.map((r) => (
                        <tr key={`${r.kind}-${r.id}`} className="border-t border-line">
                          <td className="px-4 py-3 text-ink/60">{r.date}</td>
                          <td className="px-4 py-3">{r.label}</td>
                          <td className="px-4 py-3 text-ink/60">{r.description ?? "-"}</td>
                          <td
                            className={`px-4 py-3 text-right font-medium ${
                              r.sign === "+" ? "text-moss" : r.sign === "-" ? "text-clay" : "text-gold"
                            }`}
                          >
                            {r.sign === "+" ? "+" : r.sign === "-" ? "-" : ""}
                            {formatIDR(r.amount)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {r.userId === currentUserId ? (
                              <>
                                <button
                                  onClick={() => openEdit(r)}
                                  className="text-ink/60 hover:text-moss text-sm mr-3"
                                >
                                  Edit
                                </button>
                                <DeleteButton id={r.id} kind={r.kind} />
                              </>
                            ) : (
                              <span className="text-xs text-ink/30">Read only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)}>
        <AkuntansiForm
          key={editingRow ? `${editingRow.kind}-${editingRow.id}` : "new"}
          categories={categories}
          assets={assets}
          editing={editing}
          onDone={handleDone}
          onClose={() => setFormOpen(false)}
        />
      </Modal>
    </>
  );
}
