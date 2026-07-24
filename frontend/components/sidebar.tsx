'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from './logo';
import {
  ShieldCheck,
  FileText,
  CircleDollarSign,
  AlertTriangle,
  TrendingDown,
  ArrowUpDown,
  ArrowLeftRight,
  Users,
  Briefcase,
  BarChart3,
  Database,
  BookOpen,
  Settings,
  ChevronsLeft,
  ChevronDown,
  KeyRound,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';

interface Item {
  href: string;
  label: string;
  icon?: LucideIcon;
  perm: string | null;
}
interface Group {
  label: string;
  icon: LucideIcon;
  perm: string | null;
  children: Item[];
}

// Asosiy menyu (rasmga mos tartib)
const MENU: Item[] = [
  { href: '/crm', label: 'Qabulxona', icon: ShieldCheck, perm: 'crm.view' },
  { href: '/contracts', label: 'Shartnomalar', icon: FileText, perm: 'contracts.view' },
  { href: '/payments', label: "To'lovlar", icon: CircleDollarSign, perm: 'contracts.view' },
  { href: '/debtors', label: 'Qarzdorlar', icon: AlertTriangle, perm: 'contracts.view' },
  { href: '/expenses', label: 'Xarajatlar', icon: TrendingDown, perm: 'finance.view' },
  { href: '/cashflow', label: 'Tashqi pul oqimi', icon: ArrowUpDown, perm: 'finance.view' },
  { href: '/transfers', label: 'Ichki pul oqimi', icon: ArrowLeftRight, perm: 'finance.view' },
  { href: '/payroll', label: 'Maoshlar', icon: Users, perm: 'payroll.view' },
  { href: '/accounts', label: 'Hisoblar', icon: Briefcase, perm: 'finance.view' },
  { href: '/reports', label: 'Hisobotlar', icon: BarChart3, perm: 'reports.view' },
];

const DATA: Group = {
  label: "Ma'lumotlar",
  icon: Database,
  perm: null,
  children: [
    { href: '/students', label: "O'quvchilar", perm: 'students.view' },
    { href: '/guardians', label: 'Vasiylar', perm: 'students.view' },
    { href: '/classes', label: 'Sinflar', perm: 'classes.view' },
    { href: '/schedule', label: 'Dars jadvali', perm: 'classes.view' },
  ],
};

const STUDY: Group = {
  label: "O'quv jarayoni",
  icon: BookOpen,
  perm: null,
  children: [
    { href: '/grades', label: 'Baholash', perm: 'grades.view' },
    { href: '/attendance', label: 'Davomat', perm: 'attendance.view' },
    { href: '/homework', label: 'Vazifalar', perm: 'homework.view' },
    { href: '/behavior', label: 'Ahloqiy baho', perm: 'behavior.view' },
  ],
};

const SETTINGS: Group = {
  label: 'Sozlamalar',
  icon: Settings,
  perm: null,
  children: [
    { href: '/users', label: 'Foydalanuvchilar', perm: 'users.view' },
    { href: '/settings/subjects', label: 'Fanlar', perm: 'classes.view' },
    { href: '/settings/categories', label: 'Xarajat kategoriyalari', perm: 'finance.view' },
    { href: '/notifications', label: 'Bildirishnomalar', perm: 'notifications.view' },
    { href: '/esmaktab', label: 'E-maktab', perm: 'reports.view' },
  ],
};

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const can = useAuthStore((s) => s.can);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const visibleChildren = (g: Group) => g.children.filter((c) => !c.perm || can(c.perm));

  const onLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside
      className={`flex h-full flex-col bg-brand-dark text-white transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <Logo className="h-8 w-8 shrink-0 text-white" />
          {!collapsed && <span className="truncate text-lg font-bold">Sulton School ERP</span>}
        </div>
        <button
          onClick={onToggleCollapse}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"
          title={collapsed ? 'Yoyish' : 'Yig\'ish'}
        >
          <ChevronsLeft size={18} className={collapsed ? 'rotate-180' : ''} />
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {MENU.filter((i) => !i.perm || can(i.perm)).map((item) => {
          const Icon = item.icon!;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active ? 'bg-white/15 font-semibold' : 'text-white/75 hover:bg-white/10'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Guruhlar (submenu) */}
        {[DATA, STUDY, SETTINGS].map((g) => {
          const kids = visibleChildren(g);
          if (!kids.length) return null;
          const Icon = g.icon;
          const groupActive = kids.some((c) => isActive(c.href));
          const open = openGroup === g.label || (groupActive && openGroup === null);
          return (
            <div key={g.label}>
              <button
                onClick={() => (collapsed ? undefined : setOpenGroup(open ? '' : g.label))}
                title={collapsed ? g.label : undefined}
                aria-expanded={!collapsed && open}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  groupActive ? 'text-white' : 'text-white/75'
                } hover:bg-white/10 ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate text-left">{g.label}</span>
                    <ChevronDown size={16} className={`transition ${open ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
              {!collapsed && open && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                  {kids.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={onNavigate}
                      className={`block rounded-lg px-3 py-2 text-sm transition ${
                        isActive(c.href) ? 'bg-white/15 font-medium text-white' : 'text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User block */}
      <div className="border-t border-white/10 px-3 py-3">
        {!collapsed && (
          <div className="mb-2 px-1">
            <div className="truncate text-sm font-semibold">{user?.fullName}</div>
            <div className="truncate text-xs text-white/50">{user?.email ?? user?.phone}</div>
          </div>
        )}
        <Link
          href="/settings/password"
          onClick={onNavigate}
          title="Parolni o'zgartirish"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 ${collapsed ? 'justify-center' : ''}`}
        >
          <KeyRound size={16} className="shrink-0" />
          {!collapsed && 'Parolni o\'zgartirish'}
        </Link>
        <button
          onClick={onLogout}
          title="Chiqish"
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-red-300 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && 'Chiqish'}
        </button>
        {!collapsed && <div className="px-3 pt-2 text-[11px] text-white/30">v0.1.0</div>}
      </div>
    </aside>
  );
}
