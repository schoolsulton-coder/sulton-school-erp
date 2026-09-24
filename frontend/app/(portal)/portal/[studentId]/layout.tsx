'use client';

import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronDown,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  Home,
  LogOut,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { portalApi } from '@/lib/portal';
import { useAuthStore } from '@/store/auth';

const TABS: { seg: string; label: string; icon: LucideIcon }[] = [
  { seg: '', label: 'Asosiy', icon: Home },
  { seg: 'grades', label: 'Baho', icon: GraduationCap },
  { seg: 'attendance', label: 'Davomat', icon: CalendarCheck },
  { seg: 'homework', label: 'Vazifa', icon: BookOpen },
  { seg: 'schedule', label: 'Jadval', icon: CalendarDays },
  { seg: 'behavior', label: 'Ahloq', icon: Sparkles },
];

export default function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  const { studentId } = useParams<{ studentId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const { data: kids } = useQuery({ queryKey: ['portal-children'], queryFn: portalApi.children, staleTime: 5 * 60_000 });
  const child = kids?.find((k) => k.id === studentId);
  const seg = pathname.split('/').slice(3)[0] ?? '';
  const multi = (kids?.length ?? 0) > 1;
  const initials = child ? `${child.lastName[0] ?? ''}${child.firstName[0] ?? ''}`.toUpperCase() : '';

  const onLogout = () => {
    logout();
    // To'liq qayta yuklash — kesh va JS holati tozalanadi (umumiy telefonda muhim)
    window.location.replace('/login');
  };

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="bg-gradient-to-br from-brand to-brand-dark text-white">
        <div className="mx-auto max-w-3xl px-4 pb-4 pt-[calc(0.75rem_+_env(safe-area-inset-top))]">
          <div className="flex items-center justify-between gap-2">
            <Link href="/portal" className="flex items-center gap-2 font-semibold">
              🏫 <span className="text-sm">Sulton School</span>
            </Link>
            <button onClick={onLogout} aria-label="Chiqish" title="Chiqish" className="grid h-9 w-9 place-items-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white">
              <LogOut size={18} />
            </button>
          </div>

          {/* Farzand: bir nechta bo'lsa — ism ustiga bosilganda tanlov ochiladi */}
          <div className="relative mt-3 flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-lg font-bold">{initials || '👦'}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-lg font-bold">{child?.fullName ?? 'Yuklanmoqda…'}</span>
                {multi && <ChevronDown size={18} className="shrink-0 text-white/70" />}
              </div>
              <div className="truncate text-sm text-white/70">
                {[child?.className, child?.branch].filter(Boolean).join(' · ') || 'Sinf biriktirilmagan'}
                {multi && <span className="ml-1 text-white/50">· almashtirish</span>}
              </div>
            </div>
            {multi && (
              <select
                value={studentId}
                onChange={(e) => router.push(`/portal/${e.target.value}${seg ? `/${seg}` : ''}`)}
                aria-label="Farzandni tanlash"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              >
                {kids!.map((k) => (
                  <option key={k.id} value={k.id}>{k.fullName}</option>
                ))}
              </select>
            )}
          </div>

          {/* Kompyuterda — yuqoridagi bo'limlar */}
          <nav className="mt-4 hidden gap-1 sm:flex">
            {TABS.map((t) => {
              const active = seg === t.seg;
              return (
                <Link
                  key={t.seg}
                  href={`/portal/${studentId}${t.seg ? `/${t.seg}` : ''}`}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${active ? 'bg-white text-brand' : 'text-white/80 hover:bg-white/10'}`}
                >
                  <t.icon size={16} /> {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 sm:pb-10">{children}</main>

      {/* Telefonda — pastki menyu */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-6">
          {TABS.map((t) => {
            const active = seg === t.seg;
            return (
              <Link
                key={t.seg}
                href={`/portal/${studentId}${t.seg ? `/${t.seg}` : ''}`}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${active ? 'text-brand' : 'text-slate-400'}`}
              >
                <t.icon size={20} className={active ? 'scale-110' : ''} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
