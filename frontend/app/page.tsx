import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-brand">
        🏫 Sulton School
      </span>
      <h1 className="text-4xl font-bold">
        ERP <span className="text-brand">&</span> LMS Platformasi
      </h1>
      <p className="max-w-md text-slate-500">
        Zamonaviy xususiy maktab uchun to&apos;liq raqamli boshqaruv ekotizimi.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
      >
        Tizimga kirish →
      </Link>
    </main>
  );
}
