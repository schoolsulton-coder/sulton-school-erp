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
      { href: '/homework', label: 'Vazifalar', perm: 'homework.view' },
      { href: '/behavior', label: 'Ahloqiy baho', perm: 'behavior.view' },
    ],
  },
  {
    label: 'Sozlamalar',
    icon: Settings,
    children: [
      { href: '/users', label: 'Foydalanuvchilar', perm: 'users.view' },
      { href: '/settings/subjects', label: 'Fanlar', perm: 'classes.view' },
      { href: '/settings/categories', label: 'Xarajat kategoriyalari', perm: 'finance.view' },
      { href: '/notifications', label: 'Bildirishnomalar', perm: 'notifications.view' },
      { href: '/esmaktab', label: 'E-maktab', perm: 'reports.view' },
    ],
  },
];
