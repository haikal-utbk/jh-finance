import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl md:text-5xl font-display text-ink mb-3">
        Aset & Keuangan Keluarga
      </h1>
      <p className="text-ink/70 max-w-md mb-8">
        Catat aset, pemasukan, dan pengeluaran keluarga dalam satu tempat yang rapi.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="btn-primary">Masuk</Link>
        <Link href="/register" className="btn-secondary">Daftar</Link>
      </div>
    </main>
  );
}
