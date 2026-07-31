import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { MonthlyBarChart, CategoryPieChart, AssetPieChart } from "./ReportCharts";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default async function ReportsPage() {
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

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const fromDate = sixMonthsAgo.toISOString().slice(0, 10);

  const [{ data: transactions }, { data: assets }] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, date, user_id, transaction_categories(name), profiles(full_name)")
      .eq("household_id", householdId)
      .gte("date", fromDate),
    supabase
      .from("assets")
      .select("value, owner_id, asset_categories(name), profiles(full_name)")
      .eq("household_id", householdId),
  ]);

  // Agregasi per bulan (6 bulan terakhir)
  const monthlyMap = new Map<string, { income: number; expense: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlyMap.set(key, { income: 0, expense: 0 });
  }
  for (const t of transactions ?? []) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const entry = monthlyMap.get(key);
    if (entry) {
      if (t.type === "income") entry.income += Number(t.amount);
      else entry.expense += Number(t.amount);
    }
  }
  const barData = Array.from(monthlyMap.entries()).map(([key, v]) => {
    const [, month] = key.split("-").map(Number);
    return { month: MONTH_LABELS[month], Pemasukan: v.income, Pengeluaran: v.expense };
  });

  // Agregasi pengeluaran per kategori
  const expenseByCategory = new Map<string, number>();
  for (const t of transactions ?? []) {
    if (t.type !== "expense") continue;
    const name = (t as any).transaction_categories?.name ?? "Lainnya";
    expenseByCategory.set(name, (expenseByCategory.get(name) ?? 0) + Number(t.amount));
  }
  const pieData = Array.from(expenseByCategory.entries()).map(([name, value]) => ({ name, value }));

  // Agregasi aset per kategori
  const assetByCategory = new Map<string, number>();
  for (const a of assets ?? []) {
    const name = (a as any).asset_categories?.name ?? "Lainnya";
    assetByCategory.set(name, (assetByCategory.get(name) ?? 0) + Number(a.value));
  }
  const assetPieData = Array.from(assetByCategory.entries()).map(([name, value]) => ({ name, value }));

  // Agregasi pengeluaran per anggota
  const expenseByMember = new Map<string, number>();
  for (const t of transactions ?? []) {
    if (t.type !== "expense") continue;
    const name = (t as any).profiles?.full_name ?? "Tidak diketahui";
    expenseByMember.set(name, (expenseByMember.get(name) ?? 0) + Number(t.amount));
  }
  const expenseByMemberData = Array.from(expenseByMember.entries()).map(([name, value]) => ({ name, value }));

  // Agregasi aset per anggota
  const assetByMember = new Map<string, number>();
  for (const a of assets ?? []) {
    const name = (a as any).profiles?.full_name ?? "Tidak diketahui";
    assetByMember.set(name, (assetByMember.get(name) ?? 0) + Number(a.value));
  }
  const assetByMemberData = Array.from(assetByMember.entries()).map(([name, value]) => ({ name, value }));

  return (
    <AppShell>
      <h1 className="text-2xl mb-6">Laporan</h1>

      <div className="grid grid-cols-1 gap-6">
        <div className="card">
          <h2 className="text-lg mb-4">Pemasukan vs pengeluaran (6 bulan terakhir)</h2>
          <MonthlyBarChart data={barData} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg mb-4">Pengeluaran per kategori</h2>
            <CategoryPieChart data={pieData} />
          </div>
          <div className="card">
            <h2 className="text-lg mb-4">Komposisi aset per kategori</h2>
            <AssetPieChart data={assetPieData} />
          </div>
          <div className="card">
            <h2 className="text-lg mb-4">Pengeluaran per anggota</h2>
            <CategoryPieChart data={expenseByMemberData} />
          </div>
          <div className="card">
            <h2 className="text-lg mb-4">Komposisi aset per anggota</h2>
            <AssetPieChart data={assetByMemberData} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
