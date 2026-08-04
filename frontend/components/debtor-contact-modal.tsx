'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, Phone, Send, MessageSquare } from 'lucide-react';
import { debtorsApi, CONTACT_TYPES, contactTypeLabel, fmtDate, type DebtorContact } from '@/lib/debtors';

export function DebtorContactModal({
  studentId,
  name,
  onClose,
  onChanged,
}: {
  studentId: string;
  name: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState('CALL');
  const [note, setNote] = useState('');

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['debtor-contacts', studentId],
    queryFn: () => debtorsApi.contacts(studentId),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['debtor-contacts', studentId] });
    onChanged();
  };

  const add = useMutation({
    mutationFn: () => debtorsApi.addContact(studentId, { type, note: note.trim() }),
    onSuccess: () => {
      setNote('');
      refresh();
    },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Saqlashda xatolik'),
  });

  const del = useMutation({
    mutationFn: (id: string) => debtorsApi.removeContact(id),
    onSuccess: refresh,
    onError: (e: any) => alert(e?.response?.data?.message ?? "O'chirishda xatolik"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        {/* Sarlavha */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"><MessageSquare size={18} /></span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-slate-800">{name}</div>
            <div className="text-xs text-slate-500">Qarzdorlik bo&apos;yicha aloqa jurnali</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>

        {/* Yangi aloqa qo'shish */}
        <div className="border-b border-slate-100 bg-slate-50 p-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {CONTACT_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  type === t.key ? 'bg-brand text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Izoh: nima gaplashildi, va'da qilingan sana, holat..."
            rows={2}
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            onClick={() => add.mutate()}
            disabled={add.isPending || !note.trim()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            <Send size={14} /> {add.isPending ? 'Saqlanmoqda…' : 'Aloqani saqlash'}
          </button>
        </div>

        {/* Tarix */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-slate-400">Yuklanmoqda…</p>
          ) : !contacts || !contacts.length ? (
            <p className="py-6 text-center text-sm text-slate-400">Hali aloqa yozilmagan</p>
          ) : (
            <ul className="space-y-2">
              {contacts.map((c: DebtorContact) => (
                <li key={c.id} className="group rounded-xl border border-slate-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      <Phone size={11} /> {contactTypeLabel(c.type)}
                    </span>
                    <span className="text-xs text-slate-400">{fmtDate(c.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{c.note}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{c.author?.fullName ?? '—'}</span>
                    <button
                      onClick={() => { if (confirm("Aloqani o'chirasizmi?")) del.mutate(c.id); }}
                      className="text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
                      title="O'chirish"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
