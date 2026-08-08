"use client";

import { useState } from "react";
import { formatIDR } from "@/lib/format";
import JournalForm from "./JournalForm";
import DeleteButton from "./DeleteButton";
import Modal from "@/components/Modal";

type Asset = { id: string; name: string; asset_categories: { name: string } | null };

type Entry = {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  user_id: string;
  from_asset: { name: string } | null;
  to_asset: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

export default function JournalClient({
  assets,
  entries,
  currentUserId,
}: {
  assets: Asset[];
  entries: Entry[];
  currentUserId: string;
}) {
  const [formOpen, setFormOpen] = useState(false);

  function handleDone() {
    setFormOpen(false);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Jurnal</h1>
        <button onClick={() => setFormOpen(true)} className="btn-primary text-sm">
          + Tambah jurnal
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper text-ink/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">Dari</th>
              <th className="px-4 py-3 font-medium">Ke</th>
              <th className="px-4 py-3 font-medium">Keterangan</th>
              <th className="px-4 py-3 font-medium">Oleh</th>
              <th className="px-4 py-3 font-medium text-right">Jumlah</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink/40">
                  Belum ada entri jurnal.
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <td className="px-4 py-3 text-ink/60">{e.date}</td>
                <td className="px-4 py-3">{e.from_asset?.name ?? "-"}</td>
                <td className="px-4 py-3">{e.to_asset?.name ?? "-"}</td>
                <td className="px-4 py-3 text-ink/60">{e.description ?? "-"}</td>
                <td className="px-4 py-3 text-ink/50 text-xs">{e.profiles?.full_name ?? "-"}</td>
                <td className="px-4 py-3 text-right font-medium text-ink">{formatIDR(Number(e.amount))}</td>
                <td className="px-4 py-3 text-right">
                  {e.user_id === currentUserId ? (
                    <DeleteButton id={e.id} />
                  ) : (
                    <span className="text-xs text-ink/30">Read only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)}>
        <JournalForm assets={assets} onDone={handleDone} />
      </Modal>
    </>
  );
}
