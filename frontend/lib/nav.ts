import { Database, BookOpen, Settings, type LucideIcon } from 'lucide-react';

export interface NavChild {
  href: string;
  label: string;
  perm: string | null;
}
export interface NavSection {
  label: string;
  icon: LucideIcon;
  children: NavChild[];
}

// Sidebar guruhlari — endi yagona havola (sidebar) + yuqori tab'lar (SectionTabs) uchun umumiy.
export const SECTIONS: NavSection[] = [
  {
    label: "Ma'lumotlar",
    icon: Database,
    children: [
      { href: '/students', label: "O'quvchilar", perm: 'students.view' },
      { href: '/guardians', label: 'Vasiylar', perm: 'students.view' },
      { href: '/classes', label: 'Sinflar', perm: 'classes.view' },
      { href: '/schedule', label: 'Dars jadvali', perm: 'classes.view' },
    ],
  },
  {
    label: "O'quv jarayoni",
    icon: BookOpen,
    children: [
      { href: '/grades', label: 'Baholash', perm: 'grades.view' },
      { href: '/grades/statistics', label: 'Baho statistikasi', perm: 'grades.view' },
      { href: '/attendance', label: 'Davomat', perm: 'attendance.view' },
      { href: '/attendance/statistics', label: 'Davomat statistikasi', perm: 'attendance.view' },
      { href: '/homework', label: 'Vazifalar', perm: 'homework.view' },
      { href: '/behavior', label: 'Ahloqiy baho', perm: 'behavior.view' },
      { href: '/behavior/statistics', label: 'Ahloqiy statistikasi', perm: 'behavior.view' },
      { href: '/coins', label: 'Coin', perm: 'behavior.view' },
      { href: '/coins/statistics', label: 'Coin statistikasi', perm: 'behavior.view' },
    ],
  },
  {
    label: 'Sozlamalar',
    icon: Settings,
    children: [
      { href: '/users', label: 'Foydalanuvchilar', perm: 'users.view' },
      { href: '/settings/subjects', label: 'Fanlar', perm: 'classes.view' },
      { href: '/settings/categories', label: 'Xarajat kategoriyalari', perm: 'finance.view' },
      { href: '/settings/contract-templates', label: 'Shartnoma shablonlari', perm: 'contracts.view' },
      { href: '/notifications', label: 'Bildirishnomalar', perm: 'notifications.view' },
      { href: '/esmaktab', label: 'E-maktab', perm: 'reports.view' },
    ],
  },
];

/**
 * Manzilga eng aniq mos keladigan havolani tanlaydi (eng uzun mos prefiks).
 * Shu bilan `/coins/statistics` da `/coins` ham yonib turmaydi — faqat bittasi belgilanadi.
 */
export function activeHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (pathname === href || pathname.startsWith(href + '/')) {
      if (!best || href.length > best.length) best = href;
    }
  }
  return best;
}

/** Sidebar va tab'lardagi barcha havolalar (eng aniq moslikni topish uchun) */
export function allNavHrefs(extra: string[] = []): string[] {
  return [...extra, ...SECTIONS.flatMap((s) => s.children.map((c) => c.href))];
}
