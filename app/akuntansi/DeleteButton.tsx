"use client";

import { useTransition } from "react";
import { deleteLedgerTransaction, deleteLedgerTransfer } from "./actions";

export default function DeleteButton({ id, kind }: { id: string; kind: "transaction" | "transfer" }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        const msg =
          kind === "transfer"
            ? "Hapus transfer ini? Nilai aset terkait akan dikembalikan."
            : "Hapus catatan ini?";
        if (confirm(msg)) {
          startTransition(() =>
            kind === "transfer" ? deleteLedgerTransfer(id) : deleteLedgerTransaction(id)
          );
        }
      }}
      disabled={isPending}
      className="text-xs text-ink/40 hover:text-danger"
    >
      Hapus
    </button>
  );
}
