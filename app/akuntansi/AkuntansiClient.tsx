"use client";

import { useState } from "react";
import Link from "next/link";
import { formatIDR } from "@/lib/format";
import AkuntansiForm from "./AkuntansiForm";
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

  const ownerIds = Array.from(new Set(rows.map((r) => r.userId)));
  const ownerGroups = ownerIds
    .map((uid) => {
      const items = rows.filter((r) => r.userId === uid);
      const ownerName = items[0]?.ownerName ?? "Tidak diketahui";
      const income = items.filter((r) => r.sign === "+").reduce((s, r) => s + r.amount, 0);
      const expense = items.filter((r) => r.sign === "-").reduce((s, r) => s + r.amount, 0);
      return { uid, ownerName, items, income, expense };
    })
    .sort((a, b) => (a.uid === currentUserId ? -1 : b.uid === currentUserId ? 1 : 0));

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Akuntansi</h1>
        <div className="flex items-center gap-4">
          <Link href="/assets/categories" className="text-sm text-ink/60 hover:text-moss">
            Kelola kategori aset
          </Link>
          <button onClick={() => setFormOpen(true)} className="btn-primary text-sm">
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
            <table className="w-full text-sm">
              <thead className="bg-paper text-ink/60 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Jenis</th>
                  <th className="px-4 py-3 font-medium">Keterangan</th>
                  <th className="px-4 py-3 font-medium">Aset</th>
                  <th className="px-4 py-3 font-medium text-right">Jumlah</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {og.items.map((r) => (
                  <tr key={`${r.kind}-${r.id}`} className="border-t border-line">
                    <td className="px-4 py-3 text-ink/60">{r.date}</td>
                    <td className="px-4 py-3">{r.label}</td>
                    <td className="px-4 py-3 text-ink/60">{r.description ?? "-"}</td>
                    <td className="px-4 py-3 text-ink/50 text-xs">{r.assetLabel}</td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        r.sign === "+" ? "text-moss" : r.sign === "-" ? "text-clay" : "text-gold"
                      }`}
                    >
                      {r.sign === "+" ? "+" : r.sign === "-" ? "-" : ""}
                      {formatIDR(r.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.userId === currentUserId ? (
                        <DeleteButton id={r.id} kind={r.kind} />
                      ) : (
                        <span className="text-xs text-ink/30">Read only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)}>
        <AkuntansiForm
          categories={categories}
          assets={assets}
          onDone={() => setFormOpen(false)}
          onClose={() => setFormOpen(false)}
        />
      </Modal>
    </>
  );
}
