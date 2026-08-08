import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Ringkasan" },
  { href: "/assets", label: "Aset" },
  { href: "/liabilities", label: "Kewajiban" },
  { href: "/akuntansi", label: "Akuntansi" },
  { href: "/reports", label: "Laporan" },
];

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string | null } | null = null;
  let household: { name: string; invite_code: string } | null = null;

  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("full_name, household_id")
      .eq("id", user.id)
      .single();
    profile = p;

    if (p?.household_id) {
      const { data: h } = await supabase
        .from("households")
        .select("name, invite_code")
        .eq("id", p.household_id)
        .single();
      household = h;
    }
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-line bg-white flex flex-col">
        <div className="p-5 border-b border-line">
          <p className="font-display text-lg leading-tight">{household?.name ?? "Keluarga"}</p>
          {household && (
            <p className="text-xs text-ink/50 mt-1">Kode undangan: {household.invite_code}</p>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-card px-3 py-2 text-sm text-ink/80 hover:bg-moss/10 hover:text-moss"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-line flex items-center justify-between">
          <span className="text-sm text-ink/70 truncate">{profile?.full_name ?? user?.email}</span>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
