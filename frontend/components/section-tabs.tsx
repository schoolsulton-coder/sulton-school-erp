'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { SECTIONS } from '@/lib/nav';
import { ACADEMIC_SECTION } from '@/lib/rbac';

/**
 * Sidebar guruhi (Ma'lumotlar / O'quv jarayoni / Sozlamalar) ichiga kirilganda
 * yuqorida ko'rinadigan tab'lar (dropdown o'rniga).
 */

export function SectionTabs() {
  const pathname = usePathname();
  const can = useAuthStore((s) => s.can);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const section = SECTIONS.find((s) => s.children.some((c) => isActive(c.href)));
  if (!section) return null;

  // "O'quv jarayoni" — akademik rollarda chap menuda ochilgan ro'yxat bor (tab takrorlanmasin),
  // boshqa rollarda bu bo'lim umuman ko'rinmaydi.
  if (section.label === ACADEMIC_SECTION) return null;

  const tabs = section.children.filter((c) => !c.perm || can(c.perm));
  if (tabs.length === 0) return null;
  const Icon = section.icon;

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-1 overflow-x-auto px-4">
        <span className="mr-2 hidden items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-slate-400 sm:flex">
          <Icon size={16} /> {section.label}
          <span className="mx-1 text-slate-200">|</span>
        </span>
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-medium transition ${
              isActive(t.href)
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
