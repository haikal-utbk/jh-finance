"use client";

import { useTransition } from "react";
import { deleteLiability } from "./actions";

export default function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm("Hapus kewajiban ini?")) {
          startTransition(() => deleteLiability(id));
        }
      }}
      disabled={isPending}
      className="text-xs text-ink/40 hover:text-danger"
    >
      Hapus
    </button>
  );
}
