"use client";

import { useTransition } from "react";
import { deleteTransaction } from "./actions";

export default function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm("Hapus transaksi ini?")) {
          startTransition(() => deleteTransaction(id));
        }
      }}
      disabled={isPending}
      className="text-xs text-ink/40 hover:text-danger"
    >
      Hapus
    </button>
  );
}
