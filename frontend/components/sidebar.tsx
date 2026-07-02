'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PhoneCall,
  GraduationCap,
  FileText,
  Wallet,
  Banknote,
  Users,
  Building2,
  CalendarCheck,
  BookOpen,
  ClipboardList,
  ShieldCheck,
  Heart,
  Bell,
  Landmark,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  perm: string | null;
}

// Tayyor (ulangan) sahifalar
const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Boshqaruv paneli', icon: LayoutDashboard, perm: null },
  { href: '/crm', label: 'CRM — Qabul', icon: PhoneCall, perm: 'crm.view' },
  { href: '/students', label: "O'quvchilar", icon: Users, perm: 'students.view' },
  { href: '/classes', label: 'Sinflar', icon: GraduationCap, perm: 'classes.view' },
  { href: '/contracts', label: 'Shartnomalar', icon: FileText, perm: 'contracts.view' },
  { href: '/finance', label: "G'azna & Moliya", icon: Wallet, perm: 'finance.view' },
  { href: '/hr', label: 'HR — Xodimlar', icon: Building2, perm: 'hr.view' },
  { href: '/payroll', label: 'Oylik hisob-kitob', icon: Banknote, perm: 'payroll.view' },
  { href: '/homework', label: 'Vazifalar', icon: ClipboardList, perm: 'homework.view' },
  { href: '/grades', label: 'Baholash', icon: BookOpen, perm: 'grades.view' },
  { href: '/attendance', label: 'Davomat', icon: CalendarCheck, perm: 'attendance.view' },
  { href: '/behavior', label: 'Ahloqiy baho', icon: Heart, perm: 'behavior.view' },
  { href: '/notifications', label: 'Bildirishnomalar', icon: Bell, perm: 'notifications.view' },
  { href: '/esmaktab', label: 'E-maktab', icon: Landmark, perm: 'reports.view' },
  { href: '/users', label: 'Foydalanuvchilar', icon: ShieldCheck, perm: 'users.view' },
];

// Barcha modullar ulandi — "Tez orada" bo'limi bo'sh
const SOON: { label: string; icon: LucideIcon }[] = [];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const can = useAuthStore((s) => s.can);

  return (
    <aside className="flex h-full w-64 flex-col bg-brand-dark text-white">
      <div className="flex items-center gap-2 px-5 py-5 text-lg font-bold">
        🏫 <span>Sulton School</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.filter((i) => !i.perm || can(i.perm)).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active ? 'bg-white/15 font-semibold' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}

        {SOON.length > 0 && (
          <>
            <div className="px-3 pb-1 pt-4 text-xs uppercase tracking-wide text-white/40">
              Tez orada
            </div>
            {SOON.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/40"
                >
                  <Icon size={18} />
                  {item.label}
                </div>
              );
            })}
          </>
        )}
      </nav>

      <div className="px-5 py-4 text-xs text-white/40">ERP & LMS · v0.1</div>
    </aside>
  );
}
