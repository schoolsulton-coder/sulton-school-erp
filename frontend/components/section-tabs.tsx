'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { SECTIONS, activeHref, allNavHrefs } from '@/lib/nav';
import { ACADEMIC_SECTION, canSeeAcademic, canSeeAcademicSection } from '@/lib/rbac';

/**
 * Sidebar guruhi (Ma'lumotlar / O'quv jarayoni / Sozlamalar) ichiga kirilganda
 * yuqorida ko'rinadigan tab'lar (dropdown o'rniga).
 */

export function SectionTabs() {
  const pathname = usePathname();
  const can = useAuthStore((s) => s.can);
  const role = useAuthStore((s) => s.user?.role);

  const activeTab = useRef<HTMLAnchorElement>(null);

  // Eng aniq mos keladigan tab belgilanadi (ikkita tab bir vaqtda yonmasin)
  const current = activeHref(pathname, allNavHrefs());
  const isActive = (href: string) => current === href;
  // Bo'lim ko'rinadigan (ruxsat bor) tab'lar bo'yicha topiladi
  const visibleChildren = (s: (typeof SECTIONS)[number]) =>
    s.children.filter((c) => !c.perm || can(c.perm));
  const section = SECTIONS.find((s) => visibleChildren(s).some((c) => isActive(c.href)));

  // Telefonda faol tab ko'rinish maydoniga surib qo'yiladi
  useEffect(() => {
    activeTab.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [pathname]);

  if (!section) return null;

  // Bo'limga huquqi yo'q rollarda tab qatori ham ko'rinmaydi (sidebar bilan bir xil qoida)
  if (section.label === ACADEMIC_SECTION && !canSeeAcademicSection(role)) return null;

  const tabs = visibleChildren(section);
  if (tabs.length === 0) return null;
  const Icon = section.icon;

  // Akademik rollarda "O'quv jarayoni" chap menuda ochilgan ro'yxat bo'lib turadi —
  // desktopda tab qatori takrorlanmasin, ammo telefonda (menyu yashirin) kerak.
  const desktopHidden = section.label === ACADEMIC_SECTION && canSeeAcademic(role);

  return (
    <div className={`shrink-0 border-b border-slate-200 bg-white ${desktopHidden ? 'md:hidden' : ''}`}>
      <div className="flex items-center gap-1 overflow-x-auto px-4">
        <span className="mr-2 hidden items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-slate-400 sm:flex">
          <Icon size={16} /> {section.label}
          <span className="mx-1 text-slate-200">|</span>
        </span>
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            ref={isActive(t.href) ? activeTab : undefined}
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
