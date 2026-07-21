'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, Camera, Trash2 } from 'lucide-react';
import { studentsApi, type StudentInput } from '@/lib/students';
import { crmApi } from '@/lib/crm';

const DOC_TYPES = ["Tug'ilganlik haqida guvohnoma", 'Pasport', 'ID karta', 'Metrika'];
const SCHOOL_TYPES = ['Davlat', 'Xususiy'];

/** Rasmni ~320px ga kichraytirib base64 (JPEG) qaytaradi */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 320;
        let { width, height } = img;
        if (width > height && width > MAX) { height = (height * MAX) / width; width = MAX; }
        else if (height >= width && height > MAX) { width = (width * MAX) / height; height = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function StudentFormModal({
  student,
  onClose,
  onSaved,
}: {
  student?: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = !!student;

  const [form, setForm] = useState({
    lastName: student?.lastName ?? '',
    firstName: student?.firstName ?? '',
    middleName: student?.middleName ?? '',
    gender: student?.gender ?? 'MALE',
    birthDate: student?.birthDate ? new Date(student.birthDate).toISOString().slice(0, 10) : '',
    documentType: student?.documentType ?? '',
    documentSeries: student?.documentSeries ?? '',
    prevSchoolType: student?.prevSchoolType ?? '',
    prevSchoolName: student?.prevSchoolName ?? '',
    branchId: student?.branchId ?? '',
    photo: student?.photo ?? '',
  });
  const [error, setError] = useState('');
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: crmApi.branches });

  // Filial avtomat tanlansin (hozircha 1 ta) — bo'sh bo'lsa birinchisi
  useEffect(() => {
    if (!form.branchId && branches?.length) set('branchId', branches[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches]);

  const onFile = async (f?: File) => {
    if (!f) return;
    try { set('photo', await resizeImage(f)); } catch { setError('Rasmni o‘qib bo‘lmadi'); }
  };

  const save = useMutation({
    mutationFn: () => {
      const payload: StudentInput = {
        lastName: form.lastName,
        firstName: form.firstName,
        middleName: form.middleName || undefined,
        gender: (form.gender as 'MALE' | 'FEMALE') || undefined,
        birthDate: form.birthDate || undefined,
        documentType: form.documentType || undefined,
        documentSeries: form.documentSeries || undefined,
        prevSchoolType: form.prevSchoolType || undefined,
        prevSchoolName: form.prevSchoolName || undefined,
        branchId: form.branchId || undefined,
        photo: form.photo || undefined,
      };
      return editing ? studentsApi.update(student.id, payload) : studentsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      if (editing) qc.invalidateQueries({ queryKey: ['student', student.id] });
      onSaved();
    },
    onError: (e: any) => setError(
      Array.isArray(e?.response?.data?.message) ? e.response.data.message.join(', ') : e?.response?.data?.message ?? 'Xatolik yuz berdi',
    ),
  });

  const cls = 'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';
  const initials = `${form.lastName.charAt(0)}${form.firstName.charAt(0)}`.toUpperCase() || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); setError(''); if (!form.lastName || !form.firstName) return setError('Familiya va ismni kiriting'); save.mutate(); }}
        className="my-6 w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
      >
        {/* Sarlavha */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">{editing ? "O'quvchini tahrirlash" : "Yangi o'quvchi"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Rasm */}
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand/10 text-xl font-bold text-brand">
              {form.photo ? <img src={form.photo} alt="" className="h-full w-full object-cover" /> : initials}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                <Camera size={15} /> Rasm yuklash
              </button>
              {form.photo && <button type="button" onClick={() => set('photo', '')} className="ml-2 inline-flex items-center gap-1 text-sm text-rose-500 hover:underline"><Trash2 size={13} /> O‘chirish</button>}
              <p className="mt-1 text-xs text-slate-400">JPG/PNG — avtomat kichraytiriladi</p>
            </div>
          </div>

          {/* Ism */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <F label="Familiya" req><input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={cls} /></F>
            <F label="Ism" req><input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={cls} /></F>
            <F label="Otasining ismi"><input value={form.middleName} onChange={(e) => set('middleName', e.target.value)} className={cls} /></F>
          </div>

          {/* Jins + tug'ilgan */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Jinsi" req>
              <div className="grid grid-cols-2 gap-2">
                {[['MALE', 'Erkak'], ['FEMALE', 'Ayol']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => set('gender', v)} className={`rounded-lg border py-2.5 text-sm font-medium transition ${form.gender === v ? 'border-brand bg-brand text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{l}</button>
                ))}
              </div>
            </F>
            <F label="Tug'ilgan sana"><input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} className={cls} /></F>
          </div>

          {/* Hujjat */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Hujjat turi" hint="Ro'yxatdan tanlang yoki yangi yozing">
              <input list="doc-types" value={form.documentType} onChange={(e) => set('documentType', e.target.value)} className={cls} />
              <datalist id="doc-types">{DOC_TYPES.map((d) => <option key={d} value={d} />)}</datalist>
            </F>
            <F label="Hujjat seriya / raqami"><input value={form.documentSeries} onChange={(e) => set('documentSeries', e.target.value)} className={cls} /></F>
          </div>

          {/* Maktab */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Maktab turi" hint="Ro'yxatdan tanlang yoki yangi yozing">
              <input list="school-types" value={form.prevSchoolType} onChange={(e) => set('prevSchoolType', e.target.value)} className={cls} />
              <datalist id="school-types">{SCHOOL_TYPES.map((d) => <option key={d} value={d} />)}</datalist>
            </F>
            <F label="Maktab nomi"><input value={form.prevSchoolName} onChange={(e) => set('prevSchoolName', e.target.value)} className={cls} /></F>
          </div>

          {/* Filial */}
          <F label="Filial(lar)" hint="Filial avtomat tanlanadi">
            <div className="flex flex-wrap gap-2">
              {branches?.map((b) => (
                <button key={b.id} type="button" onClick={() => set('branchId', b.id)} className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${form.branchId === b.id ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{b.name}</button>
              ))}
              {!branches?.length && <span className="text-sm text-slate-400">Filial yo‘q</span>}
            </div>
          </F>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
          <button type="submit" disabled={save.isPending} className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60">
            <Save size={16} /> {save.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  );
}

function F({ label, req, hint, children }: { label: string; req?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label} {req && <span className="text-rose-500">*</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
