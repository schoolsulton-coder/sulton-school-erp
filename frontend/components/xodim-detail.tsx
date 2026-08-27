'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, ExternalLink, FileText, Trash2, Plus, Paperclip } from 'lucide-react';
import { hrApi, XODIM_DOC_TYPES } from '@/lib/hr';
import { money } from '@/lib/finance';
import { IzohlarSection } from '@/components/izohlar-section';

const initials = (n: string) => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const fmtDate = (iso?: string | null) => { if (!iso) return '—'; const s = new Date(iso).toLocaleDateString('en-CA'); const [y, m, d] = s.split('-'); return `${d}.${m}.${y}`; };
function staj(hire?: string | null) {
  if (!hire) return '—';
  const from = new Date(hire).getTime(); if (isNaN(from)) return '—';
  const months = Math.max(0, Math.floor((Date.now() - from) / (1000 * 60 * 60 * 24 * 30.44)));
  const y = Math.floor(months / 12), mo = months % 12;
  return `${y ? `${y} yil ` : ''}${mo} oy`.trim();
}

export function XodimDetailPanel({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [addDoc, setAddDoc] = useState(false);
  const { data: e, isLoading } = useQuery({ queryKey: ['employee', employeeId], queryFn: () => hrApi.employee(employeeId) as any });
  const { data: pay } = useQuery({ queryKey: ['lavozim-detail', employeeId], queryFn: () => hrApi.lavozimDetail(employeeId) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['employee', employeeId] });

  const delDoc = useMutation({ mutationFn: (docId: string) => hrApi.deleteDocument(docId), onSuccess: refresh });

  const branches = (e?.branchLinks ?? []).map((b: any) => b.branch?.name).filter(Boolean).join(', ') || (e?.branch?.name ?? '—');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(ev) => ev.stopPropagation()} className="h-full w-full max-w-xl overflow-y-auto bg-slate-50 shadow-2xl">
        {isLoading || !e ? (
          <div className="p-10 text-center text-slate-400">Yuklanmoqda…</div>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><X size={16} /> Yopish</button>
              <Link href={`/hr/${employeeId}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">To&apos;liq sahifa <ExternalLink size={13} /></Link>
            </div>

            <div className="space-y-4 p-5">
              {/* Sarlavha */}
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-lg font-bold text-slate-600">{initials(e.user.fullName)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Xodim</div>
                  <div className="truncate text-lg font-bold text-slate-800">{e.user.fullName}</div>
                  <div className="text-xs text-slate-400">{e.position?.name ?? '—'} · {branches}</div>
                </div>
              </div>

              {/* Kartalar */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card label="Lavozimlar" value={e.position ? '1 / 1' : '0 / 0'} />
                <Card label="Jami hisoblangan" value={money(pay?.cards.jamiHisob ?? 0)} />
                <Card label="Jami berilgan" value={money(pay?.cards.jamiBerilgan ?? 0)} valueClass="text-emerald-600" />
                <Card label="Ish staji" value={staj(e.hireDate)} />
              </div>

              {/* Shaxsiy ma'lumot */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Shaxsiy ma&apos;lumot</h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                  <Row label="F.I.SH." value={e.user.fullName} />
                  <Row label="Jinsi" value={e.gender === 'MALE' ? 'Erkak' : e.gender === 'FEMALE' ? 'Ayol' : '—'} />
                  <Row label="Telefon" value={e.user.phone ?? '—'} />
                  <Row label="Tug'ilgan sana" value={fmtDate(e.birthDate)} />
                  <Row label="Passport" value={[e.passportSeriya, e.passportRaqam].filter(Boolean).join(' ') || '—'} />
                  <Row label="Passport bergan" value={e.passportOrgan ?? '—'} />
                  <Row label="Passport sana" value={fmtDate(e.passportBerilgan)} />
                  <Row label="STIR" value={e.stir ?? '—'} />
                  <Row label="Ish boshlangan sana" value={fmtDate(e.hireDate)} />
                  <Row label="Ish staji" value={staj(e.hireDate)} />
                  <Row label="Yashash manzili" value={e.address ?? '—'} />
                  <Row label="Karta raqami" value={e.cardNumber ?? '—'} />
                  <Row label="Filiallar" value={branches} />
                </div>
              </div>

              {/* Xodim hujjatlari */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Xodim hujjatlari ({e.documents?.length ?? 0})</h3>
                  <button onClick={() => setAddDoc(true)} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"><Plus size={14} /> Yangi hujjat</button>
                </div>
                {e.documents?.length ? (
                  <ul className="space-y-1.5">
                    {e.documents.map((d: any) => (
                      <li key={d.id} className="group flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                        <FileText size={16} className="shrink-0 text-slate-400" />
                        <a href={d.filePath} download={d.fileName} target="_blank" rel="noopener" className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-700">{d.type}</div>
                          <div className="truncate text-[11px] text-slate-400">{d.fileName}</div>
                        </a>
                        <button onClick={() => { if (confirm("Hujjatni o'chirasizmi?")) delDoc.mutate(d.id); }} className="text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"><Trash2 size={15} /></button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-3 text-center text-sm text-slate-400">Hujjat yo&apos;q</p>
                )}
              </div>

              {/* Izohlar */}
              <IzohlarSection employeeId={employeeId} />
            </div>
          </>
        )}
      </div>

      {addDoc && <DocAddModal employeeId={employeeId} onClose={() => setAddDoc(false)} onSaved={() => { setAddDoc(false); refresh(); }} />}
    </div>
  );
}

function Card({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 truncate text-base font-bold ${valueClass ?? 'text-slate-800'}`} title={value}>{value}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm text-slate-700">{value}</div>
    </div>
  );
}

function DocAddModal({ employeeId, onClose, onSaved }: { employeeId: string; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState('');
  const [file, setFile] = useState<{ name: string; data: string } | null>(null);
  const [error, setError] = useState('');

  const onFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0]; if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setError('Fayl 8MB dan katta'); return; }
    const reader = new FileReader();
    reader.onload = () => setFile({ name: f.name, data: reader.result as string });
    reader.readAsDataURL(f);
  };

  const save = useMutation({
    mutationFn: () => hrApi.addDocument(employeeId, { type: type.trim(), fileName: file!.name, filePath: file!.data }),
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Xatolik'),
  });
  const submit = () => { setError(''); if (!type.trim()) return setError('Hujjat turini tanlang'); if (!file) return setError('Fayl tanlang'); save.mutate(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mt-16 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div><h2 className="text-lg font-bold text-slate-800">Yangi hujjat</h2><p className="text-xs text-slate-400">Xodim shaxsiy hujjati</p></div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Hujjat turi <span className="text-rose-500">*</span></label>
            <input list="xodim-doc-types" value={type} onChange={(e) => setType(e.target.value)} placeholder="Tanlang yoki yozing" className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white" />
            <datalist id="xodim-doc-types">{XODIM_DOC_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Fayl <span className="text-rose-500">*</span></label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
              <Paperclip size={15} /> {file ? file.name : 'Fayl tanlash (PDF, rasm — 8MB gacha)'}
              <input type="file" onChange={onFile} className="hidden" />
            </label>
          </div>
          {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Bekor</button>
          <button onClick={submit} disabled={save.isPending} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">{save.isPending ? 'Saqlanmoqda...' : 'Qo\'shish'}</button>
        </div>
      </div>
    </div>
  );
}
