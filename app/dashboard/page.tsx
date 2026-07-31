import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/format";

export default async function DashboardPage() {
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

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [{ data: assets }, { data: liabilities }, { data: txThisMonth }] = await Promise.all([
    supabase
      .from("assets")
      .select("value, owner_id, profiles(full_name)")
      .eq("household_id", householdId),
    supabase
      .from("liabilities")
      .select("value, owner_id, profiles(full_name)")
      .eq("household_id", householdId),
    supabase
      .from("transactions")
      .select("type, amount, user_id, profiles(full_name)")
      .eq("household_id", householdId)
      .gte("date", monthStart),
  ]);

  const assetList = (assets ?? []) as any[];
  const liabilityList = (liabilities ?? []) as any[];
  const txList = (txThisMonth ?? []) as any[];

  const totalAssets = assetList.reduce((sum, a) => sum + Number(a.value), 0);
  const totalLiabilities = liabilityList.reduce((sum, l) => sum + Number(l.value), 0);
  const netWorth = totalAssets - totalLiabilities;
  const income = txList
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = txList
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const cards = [
    { label: "Total nilai aset", value: totalAssets, accent: "text-moss" },
    { label: "Total kewajiban", value: totalLiabilities, accent: "text-clay" },
    { label: "Kekayaan bersih", value: netWorth, accent: netWorth >= 0 ? "text-moss" : "text-danger" },
    { label: "Pemasukan bulan ini", value: income, accent: "text-moss" },
    { label: "Pengeluaran bulan ini", value: expense, accent: "text-clay" },
    { label: "Selisih bulan ini", value: income - expense, accent: income - expense >= 0 ? "text-moss" : "text-danger" },
  ];

  const memberIds = Array.from(
    new Set([
      ...assetList.map((a) => a.owner_id),
      ...liabilityList.map((l) => l.owner_id),
      ...txList.map((t) => t.user_id),
    ])
  );

  const memberRows = memberIds
    .map((id) => {
      const memberAssets = assetList.filter((a) => a.owner_id === id);
      const memberLiabilities = liabilityList.filter((l) => l.owner_id === id);
      const memberTx = txList.filter((t) => t.user_id === id);
      const name =
        memberAssets[0]?.profiles?.full_name ??
        memberLiabilities[0]?.profiles?.full_name ??
        memberTx[0]?.profiles?.full_name ??
        "Tidak diketahui";
      const mAssets = memberAssets.reduce((s, a) => s + Number(a.value), 0);
      const mLiabilities = memberLiabilities.reduce((s, l) => s + Number(l.value), 0);
      const mIncome = memberTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const mExpense = memberTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      return {
        id,
        name,
        assets: mAssets,
        liabilities: mLiabilities,
        netWorth: mAssets - mLiabilities,
        income: mIncome,
        expense: mExpense,
      };
    })
    .sort((a, b) => (a.id === user!.id ? -1 : b.id === user!.id ? 1 : 0));

  if (!householdId) {
    return (
      <AppShell>
        <p className="text-ink/60">
          Akun Anda belum tergabung dalam keluarga. Silakan hubungi admin.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-2xl mb-6">Ringkasan</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <p className="text-sm text-ink/60 mb-2">{c.label}</p>
            <p className={`text-2xl font-display ${c.accent}`}>{formatIDR(c.value)}</p>
          </div>
        ))}
      </div>

      {memberRows.length > 0 && (
        <div className="card p-0 overflow-hidden mt-8">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="text-lg">Rincian per anggota</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-paper text-ink/60 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium text-right">Aset</th>
                <th className="px-4 py-3 font-medium text-right">Kewajiban</th>
                <th className="px-4 py-3 font-medium text-right">Kekayaan bersih</th>
                <th className="px-4 py-3 font-medium text-right">Pemasukan bln ini</th>
                <th className="px-4 py-3 font-medium text-right">Pengeluaran bln ini</th>
              </tr>
            </thead>
            <tbody>
              {memberRows.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="px-4 py-3">{m.name}</td>
                  <td className="px-4 py-3 text-right text-moss">{formatIDR(m.assets)}</td>
                  <td className="px-4 py-3 text-right text-clay">{formatIDR(m.liabilities)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${m.netWorth >= 0 ? "text-moss" : "text-danger"}`}>
                    {formatIDR(m.netWorth)}
                  </td>
                  <td className="px-4 py-3 text-right text-moss">{formatIDR(m.income)}</td>
                  <td className="px-4 py-3 text-right text-clay">{formatIDR(m.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-ink/50 mt-8">
        Lihat rincian di halaman Aset, Transaksi, dan Laporan pada menu sebelah kiri.
      </p>
    </AppShell>
  );
}
