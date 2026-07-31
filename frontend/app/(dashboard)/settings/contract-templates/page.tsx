'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Upload, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { contractTemplatesApi, type Template } from '@/lib/contract-templates';
import { TemplateEditor } from '@/components/template-editor';
import { useAuthStore } from '@/store/auth';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ');

export default function ContractTemplatesPage() {
  const qc = useQueryClient();
  const can = useAuthStore((s) => s.can);
  const canWrite = can('contracts.create');
  const canDelete = can('contracts.delete');

  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: list, isLoading } = useQuery({ queryKey: ['contract-templates'], queryFn: contractTemplatesApi.list });
  const { data: placeholders } = useQuery({ queryKey: ['tpl-placeholders'], queryFn: contractTemplatesApi.placeholders });

  const refresh = () => qc.invalidateQueries({ queryKey: ['contract-templates'] });

  const upload = useMutation({
    mutationFn: () => contractTemplatesApi.uploadDocx(name.trim(), file!),
    onSuccess: (t) => {
      setFile(null); setName('');
      if (fileRef.current) fileRef.current.value = '';
      refresh();
      setEditId(t.id);
    },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Yuklashda xatolik'),
  });

  const createEmpty = useMutation({
    mutationFn: () => contractTemplatesApi.create({ name: 'Yangi shablon', html: '<h2>O\'QUV XIZMATLARI SHARTNOMASI</h2><p>Matnni shu yerda yozing va "Belgi qo\'shish" orqali maydonlarni joylang.</p>' }),
    onSuccess: (t) => { refresh(); setEditId(t.id); },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Xatolik'),
  });

  const del = useMutation({
    mutationFn: (id: string) => contractTemplatesApi.remove(id),
    onSuccess: refresh,
    onError: (e: any) => alert(e?.response?.data?.message ?? "O'chirishda xatolik"),
  });

  const onPick = (f: File | null) => {
    setFile(f);
    if (f && !name.trim()) setName(f.name.replace(/\.docx$/i, ''));
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Shartnoma shablonlari</h1>
        <p className="text-sm text-slate-500">DOCX yuklang, ERP ichida tahrirlang — shartnoma ma'lumotlari avtomat qo'yiladi</p>
      </div>

      {canWrite && (
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <input
              ref={fileRef}
              type="file"
              accept=".docx"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand hover:file:bg-brand/20"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Shablon nomi (ixtiyoriy)"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
            <button
              onClick={() => upload.mutate()}
              disabled={!file || upload.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {upload.isPending ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} DOCX yuklash
            </button>
          </div>
          <button
            onClick={() => createEmpty.mutate()}
            disabled={createEmpty.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus size={16} /> Bo'sh shablon
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : !list?.length ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-slate-400">
          <FileText size={28} />
          <span>Hali shablon yo'q. DOCX yuklang yoki bo'sh shablon yarating.</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {list.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"><FileText size={17} /></span>
              <button onClick={() => setEditId(t.id)} className="min-w-0 flex-1 text-left">
                <div className="truncate font-medium text-slate-800">{t.name}</div>
                <div className="text-xs text-slate-400">Yangilangan: {fmtDate(t.updatedAt)}</div>
              </button>
              <button onClick={() => setEditId(t.id)} title="Tahrirlash" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><Pencil size={15} /></button>
              {canDelete && (
                <button
                  onClick={() => { if (confirm(`"${t.name}" shablonini o'chirasizmi?`)) del.mutate(t.id); }}
                  disabled={del.isPending}
                  title="O'chirish"
                  className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                ><Trash2 size={15} /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {editId && placeholders && (
        <EditorLoader
          id={editId}
          placeholders={placeholders}
          onClose={() => setEditId(null)}
          onSaved={() => { refresh(); setEditId(null); }}
        />
      )}
    </div>
  );
}

function EditorLoader({
  id, placeholders, onClose, onSaved,
}: {
  id: string;
  placeholders: import('@/lib/contract-templates').Placeholder[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data, isLoading } = useQuery({ queryKey: ['contract-template', id], queryFn: () => contractTemplatesApi.get(id) });
  if (isLoading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <Loader2 className="animate-spin text-white" size={28} />
      </div>
    );
  }
  return <TemplateEditor key={data.updatedAt} template={data as Template} placeholders={placeholders} onClose={onClose} onSaved={onSaved} />;
}
