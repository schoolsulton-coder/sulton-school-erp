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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
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

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <SectionTabs />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
