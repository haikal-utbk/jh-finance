"use client";

import { useTransition } from "react";
import { deleteJournalEntry } from "./actions";

export default function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm("Hapus entri jurnal ini? Nilai aset terkait akan dikembalikan.")) {
          startTransition(() => deleteJournalEntry(id));
        }
      }}
      disabled={isPending}
      className="text-xs text-ink/40 hover:text-danger"
    >
      Hapus
    </button>
  );
}
