"use client";

import { useTransition } from "react";
import { deleteAsset } from "./actions";

export default function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm("Hapus aset ini?")) {
          startTransition(() => deleteAsset(id));
        }
      }}
      disabled={isPending}
      className="text-xs text-ink/40 hover:text-danger"
    >
      Hapus
    </button>
  );
}
