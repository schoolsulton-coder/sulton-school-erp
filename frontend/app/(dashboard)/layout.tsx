'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { PORTAL_ROLES } from '@/lib/rbac';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { SectionTabs } from '@/components/section-tabs';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(localStorage.getItem('sidebar-collapsed') === '1');
  }, []);
  useEffect(() => {
    if (!mounted) return;
    if (!token) router.replace('/login');
    else if (user && PORTAL_ROLES.includes(user.role)) router.replace('/portal');
  }, [mounted, token, user, router]);

  // Sahifa almashganda mobil menyu yopiladi (orqaga tugmasi, ichki yo'naltirish...)
  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapse = () => {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem('sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  };

  // O'quvchi/vasiy portalga yo'naltirilguncha ERP oynasi ko'rinib qolmasin
  const isPortalUser = !!user && PORTAL_ROLES.includes(user.role);
  if (!mounted || !token || isPortalUser) {
    return <div className="flex h-screen items-center justify-center">Yuklanmoqda...</div>;
  }

  return (
    // Sahifaning o'zi aylanadi: telefonda ham, kompyuterda ham oddiy surish ishlaydi
    // (ilgari ichki "overflow-y-auto" konteyner edi — mobil brauzerlarda surish tutilmasdi)
    <div className="min-h-dvh bg-slate-50">
      {/* Kompyuter: chap menyu joyida qotib turadi */}
      <div className="fixed inset-y-0 left-0 z-30 hidden md:block">
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar collapsed={false} onToggleCollapse={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className={`flex min-h-dvh flex-col ${collapsed ? 'md:pl-16' : 'md:pl-64'}`}>
        {/* Tepa panel va bo'lim yorliqlari sahifa bilan birga surilmaydi */}
        <div className="sticky top-0 z-20">
          <Topbar onMenu={() => setMobileOpen(true)} />
          <SectionTabs />
        </div>
        {/* pb-[safe-area]: iPhone'da pastdagi "home indicator" kontentni to'smasin */}
        <main className="flex-1 pb-[env(safe-area-inset-bottom)]">{children}</main>
      </div>
    </div>
  );
}
