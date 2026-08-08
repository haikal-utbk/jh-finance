import Link from "next/link";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/format";

const SOURCE_LABELS: Record<string, string> = {
  initial: "Nilai awal",
  manual_edit: "Edit manual",
  transaction: "Transaksi",
  transfer_out: "Transfer keluar",
  transfer_in: "Transfer masuk",
};

export default async function AssetHistoryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string; to?: string };
}) {
  const supabase = createClient();

  const { data: asset } = await supabase
    .from("assets")
    .select("id, name, value")
    .eq("id", params.id)
    .single();

  let query = supabase
    .from("asset_value_history")
    .select("id, value_before, value_after, source, date, created_at, profiles(full_name)")
    .eq("asset_id", params.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (searchParams.from) query = query.gte("date", searchParams.from);
  if (searchParams.to) query = query.lte("date", searchParams.to);

  const { data: history } = await query;

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/assets" className="text-sm text-moss font-medium">
            &larr; Kembali ke Aset
          </Link>
          <h1 className="text-2xl mt-1">Riwayat: {asset?.name ?? "-"}</h1>
        </div>
        <p className="text-ink/60 text-sm">
          Nilai sekarang:{" "}
          <span className="font-medium text-moss">{formatIDR(Number(asset?.value ?? 0))}</span>
        </p>
      </div>

      <form className="card flex flex-wrap items-end gap-4 mb-6" method="get">
        <div>
          <label className="label">Dari tanggal</label>
          <input type="date" name="from" className="input" defaultValue={searchParams.from ?? ""} />
        </div>
        <div>
          <label className="label">Sampai tanggal</label>
          <input type="date" name="to" className="input" defaultValue={searchParams.to ?? ""} />
        </div>
        <button type="submit" className="btn-primary">Filter</button>
        {(searchParams.from || searchParams.to) && (
          <Link href={`/assets/${params.id}/history`} className="text-sm text-ink/60 hover:text-danger">
            Reset filter
          </Link>
        )}
      </form>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-paper text-ink/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">Sumber</th>
              <th className="px-4 py-3 font-medium text-right">Sebelum</th>
              <th className="px-4 py-3 font-medium text-right">Sesudah</th>
              <th className="px-4 py-3 font-medium text-right">Perubahan</th>
              <th className="px-4 py-3 font-medium">Oleh</th>
            </tr>
          </thead>
          <tbody>
            {(!history || history.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                  Belum ada riwayat perubahan pada periode ini.
                </td>
              </tr>
            )}
            {(history ?? []).map((h: any) => {
              const delta = Number(h.value_after) - Number(h.value_before);
              return (
                <tr key={h.id} className="border-t border-line">
                  <td className="px-4 py-3 text-ink/60">{h.date}</td>
                  <td className="px-4 py-3">{SOURCE_LABELS[h.source] ?? h.source}</td>
                  <td className="px-4 py-3 text-right text-ink/60">{formatIDR(Number(h.value_before))}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatIDR(Number(h.value_after))}</td>
                  <td className={`px-4 py-3 text-right font-medium ${delta >= 0 ? "text-moss" : "text-clay"}`}>
                    {delta >= 0 ? "+" : ""}{formatIDR(delta)}
                  </td>
                  <td className="px-4 py-3 text-ink/50 text-xs">{h.profiles?.full_name ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </AppShell>
  );
}
