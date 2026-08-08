"use client";

import { useState } from "react";
import Link from "next/link";
import SignOutButton from "./SignOutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Ringkasan" },
  { href: "/assets", label: "Aset" },
  { href: "/liabilities", label: "Kewajiban" },
  { href: "/akuntansi", label: "Akuntansi" },
  { href: "/reports", label: "Laporan" },
];

export default function AppShellClient({
  household,
  displayName,
  children,
}: {
  household: { name: string; invite_code: string } | null;
  displayName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen sm:flex">
      <div className="sm:hidden flex items-center justify-between px-4 py-3 border-b border-line bg-white sticky top-0 z-30">
        <p className="font-display text-lg">{household?.name ?? "Keluarga"}</p>
        <button
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="text-ink/70 text-2xl leading-none px-2"
        >
          ☰
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-ink/40 z-40 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-white flex flex-col transform transition-transform duration-200 sm:static sm:z-auto sm:w-60 sm:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-line flex items-center justify-between">
          <div>
            <p className="font-display text-lg leading-tight">{household?.name ?? "Keluarga"}</p>
            {household && (
              <p className="text-xs text-ink/50 mt-1">Kode undangan: {household.invite_code}</p>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="sm:hidden text-ink/50 text-xl leading-none px-2"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-card px-3 py-2 text-sm text-ink/80 hover:bg-moss/10 hover:text-moss"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-line flex items-center justify-between">
          <span className="text-sm text-ink/70 truncate">{displayName}</span>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-10">{children}</main>
    </div>
  );
}
