'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, GraduationCap } from 'lucide-react';
import { classesApi, type ClassRow, type ClassInput } from '@/lib/classes';
import { crmApi } from '@/lib/crm';

const LANGS = ["O'zbek", 'Rus', 'Ingliz'];
const STATUSES = ['Faol', 'Nofaol', 'Arxiv'];

/** Nomdan harfni ajratib olish: "5-A" -> "A" */
function letterFromName(name?: string, level?: number) {
  if (!name) return '';
  return name.replace(new RegExp(`^\\s*${level ?? ''}\\s*-\\s*`), '').trim() || name;
}

export function ClassFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing?: ClassRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: crmApi.branches,
  });
  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: crmApi.academicYears,
  });

  const [form, setForm] = useState({
    branchId: editing?.branchId ?? '',
    academicYear: editing?.academicYear ?? '',
    gradeLevel: String(editing?.gradeLevel ?? 1),
    letter: letterFromName(editing?.name, editing?.gradeLevel),
    language: editing?.language ?? "O'zbek",
    capacity: String(editing?.capacity ?? 24),
    room: editing?.room ?? '',
    status: editing?.status ?? 'Faol',
    telegramGroup: editing?.telegramGroup ?? '',
  });
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Yillar yuklangach: agar joriy qiymat ro'yxatda bo'lmasa, birinchi haqiqiy yilni tanlaymiz
  // (bu "controlled select" xatosini oldini oladi — ko'rsatilgan va saqlanadigan qiymat bir xil bo'ladi)
  useEffect(() => {
    if (
      !editing &&
      years &&
      years.length > 0 &&
      !years.some((y) => y.name === form.academicYear)
    ) {
      setForm((f) => ({ ...f, academicYear: years[0].name }));
    }
  }, [years, editing, form.academicYear]);

  // Select opsiyalari — joriy qiymat doim ro'yxatda bo'lishini kafolatlaydi
  const yearOptions = useMemo(() => {
    const names = (years ?? []).map((y) => y.name);
    if (form.academicYear && !names.includes(form.academicYear)) {
      names.unshift(form.academicYear);
    }
    return names;
  }, [years, form.academicYear]);

  const fullName = useMemo(() => {
    const base = `${form.gradeLevel}-${form.letter.toUpperCase()}`.trim();
    return form.letter ? `${base} (${form.language})` : '—';
  }, [form.gradeLevel, form.letter, form.language]);

  const save = useMutation({
    mutationFn: () => {
      const payload: ClassInput = {
        name: `${form.gradeLevel}-${form.letter.toUpperCase()}`,
        gradeLevel: Number(form.gradeLevel),
        academicYear: form.academicYear,
        capacity: Number(form.capacity) || undefined,
        room: form.room || undefined,
        language: form.language || undefined,
        branchId: form.branchId || undefined,
        status: form.status || undefined,
        telegramGroup: form.telegramGroup || undefined,
      };
      return editing
        ? classesApi.update(editing.id, payload)
        : classesApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      if (editing) qc.invalidateQueries({ queryKey: ['class', editing.id] });
      onSaved();
    },
    onError: (e: any) =>
      setError(
        Array.isArray(e?.response?.data?.message)
          ? e.response.data.message.join(', ')
          : e?.response?.data?.message ?? 'Xatolik yuz berdi',
      ),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.letter.trim()) return setError('Sinf harfini kiriting (A, B...)');
          save.mutate();
        }}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
      >
        {/* Sarlavha */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? 'Sinfni tahrirlash' : 'Yangi sinf'}
              </h2>
              <p className="text-xs text-slate-400">Sinf ma&apos;lumotlarini kiriting</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Maydonlar — side by side */}
        <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
          <Field label="Filial" required>
            <select
              value={form.branchId}
              onChange={(e) => set('branchId', e.target.value)}
              className={selectCls}
            >
              <option value="">Tanlang...</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="O'quv yili" required>
            <select
              value={form.academicYear}
              onChange={(e) => set('academicYear', e.target.value)}
              className={selectCls}
            >
              {yearOptions.length === 0 && <option value="">Yuklanmoqda...</option>}
              {yearOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sinf darajasi (0–11)">
            <input
              type="number"
              min={0}
              max={11}
              value={form.gradeLevel}
              onChange={(e) => set('gradeLevel', e.target.value)}
              className={inputCls}
              placeholder="1 — 11"
            />
          </Field>

          <Field label="Nomi / harf (A, B...)" required>
            <input
              value={form.letter}
              onChange={(e) => set('letter', e.target.value)}
              className={inputCls}
              placeholder="A / B / V..."
            />
          </Field>

          <Field label="Ta'lim tili">
            <select
              value={form.language}
              onChange={(e) => set('language', e.target.value)}
              className={selectCls}
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Joylar soni (sig'im)">
            <input
              type="number"
              min={1}
              max={60}
              value={form.capacity}
              onChange={(e) => set('capacity', e.target.value)}
              className={inputCls}
              placeholder="Masalan: 24"
            />
          </Field>

          <Field label="Xona">
            <input
              value={form.room}
              onChange={(e) => set('room', e.target.value)}
              className={inputCls}
              placeholder="Masalan: 101"
            />
          </Field>

          <Field label="Holat">
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className={selectCls}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Telegram guruh (ixtiyoriy)">
              <input
                value={form.telegramGroup}
                onChange={(e) => set('telegramGroup', e.target.value)}
                className={inputCls}
                placeholder="https://t.me/..."
              />
            </Field>
          </div>

          {/* Avto to'liq nom */}
          <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-brand/5 px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              To&apos;liq nom (avto)
            </span>
            <span className="text-base font-bold text-brand">{fullName}</span>
          </div>
        </div>

        {error && (
          <p className="mx-6 mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Bekor
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
          >
            <Save size={16} />
            {save.isPending ? 'Saqlanmoqda...' : editing ? 'Saqlash' : 'Yaratish'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';
const selectCls = inputCls + ' cursor-pointer';
