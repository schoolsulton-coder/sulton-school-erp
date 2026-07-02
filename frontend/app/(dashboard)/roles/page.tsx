'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  usersApi,
  GROUP_LABEL,
  ACTION_LABEL,
  type Role,
} from '@/lib/users';

export default function RolesPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: usersApi.roles });
  const { data: groups } = useQuery({ queryKey: ['permissions'], queryFn: usersApi.permissions });
  const { data: roleDetail } = useQuery({
    queryKey: ['role', selectedId],
    queryFn: () => usersApi.role(selectedId!),
    enabled: !!selectedId,
  });

  const [checked, setChecked] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (roleDetail) setChecked(new Set(roleDetail.permissionSlugs));
  }, [roleDetail]);

  const isAdmin = roleDetail?.slug === 'admin';

  const save = useMutation({
    mutationFn: () => usersApi.updateRolePermissions(selectedId!, [...checked]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['role', selectedId] });
    },
  });

  const toggle = (slug: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Rollar va ruxsatlar</h1>
        <p className="text-sm text-slate-500">
          <Link href="/users" className="text-brand">← Foydalanuvchilar</Link>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Rollar ro'yxati */}
        <div className="space-y-2">
          {roles?.map((r: Role) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selectedId === r.id
                  ? 'border-brand bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="font-semibold">{r.name}</div>
              <div className="text-xs text-slate-400">
                {r.permissionCount} ruxsat · {r.userCount} foydalanuvchi
              </div>
            </button>
          ))}
        </div>

        {/* Ruxsatlar matritsasi */}
        <div className="lg:col-span-2">
          {!selectedId ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
              Ruxsatlarni ko&apos;rish uchun rol tanlang
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">{roleDetail?.name}</h2>
                {isAdmin ? (
                  <span className="text-xs text-slate-400">
                    Administrator — barcha ruxsatlar (o&apos;zgartirilmaydi)
                  </span>
                ) : (
                  <button
                    onClick={() => save.mutate()}
                    disabled={save.isPending}
                    className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                  >
                    {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {groups?.map((g) => (
                  <div key={g.group}>
                    <h3 className="mb-1 text-sm font-semibold text-slate-700">
                      {GROUP_LABEL[g.group] ?? g.group}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {g.items.map((p) => {
                        const action = p.slug.split('.')[1];
                        const on = isAdmin || checked.has(p.slug);
                        return (
                          <label
                            key={p.slug}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${
                              on ? 'border-brand bg-blue-50 text-brand' : 'border-slate-200'
                            } ${isAdmin ? 'cursor-not-allowed opacity-70' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              disabled={isAdmin}
                              onChange={() => toggle(p.slug)}
                              className="hidden"
                            />
                            {ACTION_LABEL[action] ?? action}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {save.isSuccess && (
                <p className="mt-3 text-sm text-green-600">✓ Ruxsatlar saqlandi</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
