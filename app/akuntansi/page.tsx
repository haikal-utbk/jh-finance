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
        .select("id, seq_no, type, amount, date, description, user_id, category_id, asset_id, batch_id, transaction_categories(name), profiles(full_name), assets(name)")
        .eq("household_id", householdId)
        .order("date", { ascending: false })
        .limit(200),
      supabase
        .from("journal_entries")
        .select(
          "id, seq_no, amount, description, date, user_id, from_asset_id, to_asset_id, from_asset:assets!journal_entries_from_asset_id_fkey(name), to_asset:assets!journal_entries_to_asset_id_fkey(name), profiles(full_name)"
        )
        .eq("household_id", householdId)
        .order("date", { ascending: false })
        .limit(200),
    ]);

  const txList = (transactions ?? []) as any[];
  const batchCounts = new Map<string, number>();
  for (const t of txList) {
    if (t.batch_id) batchCounts.set(t.batch_id, (batchCounts.get(t.batch_id) ?? 0) + 1);
  }

  const txRows = txList.map((t) => ({
    id: t.id,
    seqNo: t.seq_no,
    kind: "transaction" as const,
    date: t.date,
    label: t.transaction_categories?.name ?? "-",
    description: t.description,
    assetLabel: t.assets?.name ?? "-",
    amount: Number(t.amount),
    sign: (t.type === "income" ? "+" : "-") as "+" | "-",
    userId: t.user_id,
    ownerName: t.profiles?.full_name ?? "Tidak diketahui",
    type: t.type as "income" | "expense",
    categoryId: t.category_id,
    assetId: t.asset_id,
    batchSize: t.batch_id ? batchCounts.get(t.batch_id) ?? 1 : 1,
  }));

  const transferRows = ((transfers ?? []) as any[]).map((j) => ({
    id: j.id,
    seqNo: j.seq_no,
    kind: "transfer" as const,
    date: j.date,
    label: "Transfer",
    description: j.description,
    assetLabel: `${j.from_asset?.name ?? "-"} → ${j.to_asset?.name ?? "-"}`,
    amount: Number(j.amount),
    sign: "~" as const,
    userId: j.user_id,
    ownerName: j.profiles?.full_name ?? "Tidak diketahui",
    fromAssetId: j.from_asset_id,
    toAssetId: j.to_asset_id,
  }));

  const combined = [...txRows, ...transferRows];

  // Nomor kelompok: AM/AK/AT + urutan per bulan, dikelompokkan per
  // tanggal + jenis + aset (kas) yang sama -- bukan per baris.
  function groupKeyOf(r: (typeof combined)[number]) {
    if (r.kind === "transfer") {
      return { prefix: "AT", key: `${r.date}|${(r as any).fromAssetId}|${(r as any).toAssetId}` };
    }
    const prefix = r.sign === "+" ? "AM" : "AK";
    return { prefix, key: `${r.date}|${(r as any).assetId}` };
  }

  const groupFirstDate = new Map<string, string>();
  for (const r of combined) {
    const { prefix, key } = groupKeyOf(r);
    const fullKey = `${prefix}|${key}`;
    if (!groupFirstDate.has(fullKey)) groupFirstDate.set(fullKey, r.date);
  }

  const sortedGroups = Array.from(groupFirstDate.entries()).sort((a, b) =>
    a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0
  );

  const counters = new Map<string, number>();
  const codeForGroup = new Map<string, string>();
  for (const [fullKey, date] of sortedGroups) {
    const prefix = fullKey.split("|")[0];
    const [yyyy, mm] = date.split("-");
    const monthKey = `${prefix}|${yyyy}-${mm}`;
    const next = (counters.get(monthKey) ?? 0) + 1;
    counters.set(monthKey, next);
    codeForGroup.set(fullKey, `${prefix}/${String(next).padStart(2, "0")}/${mm}${yyyy.slice(2)}`);
  }

  const rows = combined
    .map((r) => {
      const { prefix, key } = groupKeyOf(r);
      return { ...r, code: codeForGroup.get(`${prefix}|${key}`) ?? "-" };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

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
