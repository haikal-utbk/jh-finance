"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatIDR } from "@/lib/format";

const PIE_COLORS = ["#2F5545", "#B5563C", "#C9A24B", "#4C7A63", "#8A8368", "#6E4A3A"];

export function MonthlyBarChart({ data }: { data: { month: string; Pemasukan: number; Pengeluaran: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#DAD5C6" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
        <Tooltip formatter={(v: number) => formatIDR(v)} />
        <Legend />
        <Bar dataKey="Pemasukan" fill="#2F5545" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Pengeluaran" fill="#B5563C" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryPieChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="text-ink/40 text-sm text-center py-16">Belum ada data pengeluaran.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label={(d) => d.name}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatIDR(v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function AssetPieChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="text-ink/40 text-sm text-center py-16">Belum ada data aset.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label={(d) => d.name}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatIDR(v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}
