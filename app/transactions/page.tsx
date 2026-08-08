import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/format";
import TransactionForm from "./TransactionForm";
import DeleteButton from "./DeleteButton";

export default async function TransactionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user!.id)
    .single();

  const [{ data: categories }, { data: transactions }, { data: myAssets }] = await Promise.all([
    supabase.from("transaction_categories").select("id, name, type").order("id"),
    supabase
      .from("transactions")
      .select("id, type, amount, date, description, user_id, transaction_categories(name), profiles(full_name), assets(name)")
      .eq("household_id", profile?.household_id)
      .order("date", { ascending: false })
      .limit(100),
    supabase
      .from("assets")
      .select("id, name")
      .eq("household_id", profile?.household_id)
      .eq("owner_id", user!.id)
      .order("name"),
  ]);

  const list = (transactions ?? []) as any[];
  const userIds = Array.from(new Set(list.map((t) => t.user_id)));
  const ownerGroups = userIds
    .map((uid) => {
      const items = list.filter((t) => t.user_id === uid);
      const ownerName = items[0]?.profiles?.full_name ?? "Tidak diketahui";
      const income = items.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const expense = items.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      return { uid, ownerName, items, income, expense };
    })
    .sort((a, b) => (a.uid === user!.id ? -1 : b.uid === user!.id ? 1 : 0));

  return (
    <AppShell>
      <h1 className="text-2xl mb-6">Transaksi</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {ownerGroups.length === 0 && (
            <div className="card text-center text-ink/40 py-6">Belum ada transaksi tercatat.</div>
          )}
          {ownerGroups.map((og) => (
            <div key={og.uid} className="card p-0 overflow-hidden">
              <div className="px-4 py-3 bg-moss/10 flex items-center justify-between">
                <h2 className="font-display text-lg text-moss">{og.ownerName}</h2>
                <span className="text-sm text-ink/60">
                  <span className="text-moss font-medium">+{formatIDR(og.income)}</span>{" "}
                  <span className="text-clay font-medium">-{formatIDR(og.expense)}</span>
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-paper text-ink/60 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tanggal</th>
                    <th className="px-4 py-3 font-medium">Kategori</th>
                    <th className="px-4 py-3 font-medium">Keterangan</th>
                    <th className="px-4 py-3 font-medium">Kas</th>
                    <th className="px-4 py-3 font-medium text-right">Jumlah</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {og.items.map((t) => (
                    <tr key={t.id} className="border-t border-line">
                      <td className="px-4 py-3 text-ink/60">{t.date}</td>
                      <td className="px-4 py-3">{t.transaction_categories?.name}</td>
                      <td className="px-4 py-3 text-ink/60">{t.description ?? "-"}</td>
                      <td className="px-4 py-3 text-ink/50 text-xs">{t.assets?.name ?? "-"}</td>
                      <td className={`px-4 py-3 text-right font-medium ${t.type === "income" ? "text-moss" : "text-clay"}`}>
                        {t.type === "income" ? "+" : "-"}{formatIDR(Number(t.amount))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.user_id === user!.id ? (
                          <DeleteButton id={t.id} />
                        ) : (
                          <span className="text-xs text-ink/30">Read only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <TransactionForm categories={categories ?? []} assets={myAssets ?? []} />
      </div>
    </AppShell>
  );
}
