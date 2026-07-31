"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"create" | "join">("create");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;

      const userId = signUpData.user?.id;
      if (!userId || !signUpData.session) {
        setError(
          "Registrasi berhasil. Silakan cek email untuk konfirmasi, lalu masuk."
        );
        setLoading(false);
        return;
      }

      if (mode === "create") {
        const { error: rpcErr } = await supabase.rpc("create_household", {
          p_name: householdName,
          p_full_name: fullName,
        });
        if (rpcErr) throw rpcErr;
      } else {
        const { error: rpcErr } = await supabase.rpc("join_household", {
          p_invite_code: inviteCode.trim(),
          p_full_name: fullName,
        });
        if (rpcErr) throw rpcErr;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md card">
        <h1 className="text-2xl mb-1">Daftar</h1>
        <p className="text-ink/60 text-sm mb-6">
          Buat keluarga baru atau gabung dengan kode undangan.
        </p>

        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex-1 rounded-card px-3 py-2 text-sm border ${
              mode === "create" ? "border-moss bg-moss/10 text-moss" : "border-line text-ink/60"
            }`}
          >
            Buat keluarga baru
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`flex-1 rounded-card px-3 py-2 text-sm border ${
              mode === "join" ? "border-moss bg-moss/10 text-moss" : "border-line text-ink/60"
            }`}
          >
            Gabung keluarga
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nama lengkap</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Kata sandi</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>

          {mode === "create" ? (
            <div>
              <label className="label">Nama keluarga</label>
              <input className="input" placeholder="Contoh: Keluarga Santoso" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} required />
            </div>
          ) : (
            <div>
              <label className="label">Kode undangan</label>
              <input className="input" placeholder="Contoh: a1b2c3d4" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
            </div>
          )}

          {error && <p className="text-danger text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Memproses..." : "Daftar"}
          </button>
        </form>

        <p className="text-sm text-ink/60 mt-5 text-center">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-moss font-medium">Masuk</Link>
        </p>
      </div>
    </main>
  );
}
