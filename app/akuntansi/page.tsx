import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import AkuntansiClient from "./AkuntansiClient";

export default async function AkuntansiPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user!.id)
    .single();

  const householdId = profile?.household_id;

  const [{ data: categories }, { data: myAssets }, { data: transactions }, { data: transfers }] =
    await Promise.all([
      supabase.from("transaction_categories").select("id, name, type").order("id"),
      supabase
        .from("assets")
        .select("id, name, asset_categories(name)")
        .eq("household_id", householdId)
        .eq("owner_id", user!.id)
        .order("name"),
      supabase
        .from("transactions")
        .select("id, type, amount, date, description, user_id, transaction_categories(name), profiles(full_name), assets(name)")
        .eq("household_id", householdId)
        .order("date", { ascending: false })
        .limit(200),
      supabase
        .from("journal_entries")
        .select(
          "id, amount, description, date, user_id, from_asset:assets!journal_entries_from_asset_id_fkey(name), to_asset:assets!journal_entries_to_asset_id_fkey(name), profiles(full_name)"
        )
        .eq("household_id", householdId)
        .order("date", { ascending: false })
        .limit(200),
    ]);

  const txRows = ((transactions ?? []) as any[]).map((t) => ({
    id: t.id,
    kind: "transaction" as const,
    date: t.date,
    label: t.transaction_categories?.name ?? "-",
    description: t.description,
    assetLabel: t.assets?.name ?? "-",
    amount: Number(t.amount),
    sign: (t.type === "income" ? "+" : "-") as "+" | "-",
    userId: t.user_id,
    ownerName: t.profiles?.full_name ?? "Tidak diketahui",
  }));

  const transferRows = ((transfers ?? []) as any[]).map((j) => ({
    id: j.id,
    kind: "transfer" as const,
    date: j.date,
    label: "Transfer",
    description: j.description,
    assetLabel: `${j.from_asset?.name ?? "-"} → ${j.to_asset?.name ?? "-"}`,
    amount: Number(j.amount),
    sign: "~" as const,
    userId: j.user_id,
    ownerName: j.profiles?.full_name ?? "Tidak diketahui",
  }));

  const rows = [...txRows, ...transferRows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <AppShell>
      <AkuntansiClient
        categories={categories ?? []}
        assets={(myAssets ?? []) as any}
        rows={rows}
        currentUserId={user!.id}
      />
    </AppShell>
  );
}
