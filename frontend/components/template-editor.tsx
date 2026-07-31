'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  X, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight,
  Heading, Pilcrow, Plus, Eye, Code, Save,
} from 'lucide-react';
import {
  contractTemplatesApi, fillWithSamples, type Template, type Placeholder,
} from '@/lib/contract-templates';

type Mode = 'visual' | 'html' | 'preview';

export function TemplateEditor({
  template, placeholders, onClose, onSaved,
}: {
  template: Template;
  placeholders: Placeholder[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(template.name);
  const [html, setHtml] = useState(template.html || '');
  const [mode, setMode] = useState<Mode>('visual');
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const savedRange = useRef<Range | null>(null);

  // Visual rejimga kirilганда bir marta innerHTML seed qilamiz (kursor sakramasin)
  useEffect(() => {
    if (mode === 'visual' && editorRef.current) {
      editorRef.current.innerHTML = html || '<p></p>';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const groups = useMemo(() => {
    const g: Record<string, Placeholder[]> = {};
    placeholders.forEach((p) => { (g[p.group] ??= []).push(p); });
    return g;
  }, [placeholders]);

  const syncFromEditor = () => {
    if (editorRef.current) setHtml(editorRef.current.innerHTML);
  };
  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };
  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
    document.execCommand(cmd, false, val);
    syncFromEditor();
  };

  const insertToken = (key: string) => {
    const token = `{{${key}}}`;
    setMenuOpen(false);
    if (mode === 'html') {
      const ta = htmlRef.current;
      if (!ta) { setHtml((h) => h + token); return; }
      const s = ta.selectionStart ?? html.length;
      const e = ta.selectionEnd ?? html.length;
      const next = html.slice(0, s) + token + html.slice(e);
      setHtml(next);
      requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + token.length; });
      return;
    }
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
    document.execCommand('insertText', false, token);
    syncFromEditor();
  };

  const currentHtml = () => (mode === 'visual' && editorRef.current ? editorRef.current.innerHTML : html);

  const save = async () => {
    if (!name.trim()) { alert('Nom kiriting'); return; }
    setSaving(true);
    try {
      const updated = await contractTemplatesApi.update(template.id, { name: name.trim(), html: currentHtml() });
      // Detail keshini yangi ma'lumot bilan yangilaymiz — qayta ochilganda eski matn chiqmasin
      qc.setQueryData(['contract-template', template.id], updated);
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const Tb = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title}
      className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100">{children}</button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-4xl flex-col bg-white shadow-xl sm:h-[92vh] sm:rounded-2xl">
        {/* Sarlavha */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shablon nomi"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium outline-none focus:border-brand" />
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            <Save size={15} /> {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {/* Rejim + toolbar */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <div className="mr-2 flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
            {([['visual', 'Matn'], ['html', 'HTML'], ['preview', "Ko'rish"]] as [Mode, string][]).map(([m, lbl]) => (
              <button key={m} onClick={() => { if (mode === 'visual') syncFromEditor(); setMode(m); }}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 ${mode === m ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {m === 'preview' ? <Eye size={13} /> : m === 'html' ? <Code size={13} /> : <Pilcrow size={13} />} {lbl}
              </button>
            ))}
          </div>

          {mode === 'visual' && (
            <div className="flex items-center gap-0.5">
              <Tb onClick={() => exec('bold')} title="Qalin"><Bold size={16} /></Tb>
              <Tb onClick={() => exec('italic')} title="Kursiv"><Italic size={16} /></Tb>
              <Tb onClick={() => exec('underline')} title="Tagchiziq"><Underline size={16} /></Tb>
              <span className="mx-1 h-5 w-px bg-slate-200" />
              <Tb onClick={() => exec('formatBlock', 'H2')} title="Sarlavha"><Heading size={16} /></Tb>
              <Tb onClick={() => exec('formatBlock', 'P')} title="Oddiy matn"><Pilcrow size={16} /></Tb>
              <Tb onClick={() => exec('insertUnorderedList')} title="Ro'yxat"><List size={16} /></Tb>
              <span className="mx-1 h-5 w-px bg-slate-200" />
              <Tb onClick={() => exec('justifyLeft')} title="Chapga"><AlignLeft size={16} /></Tb>
              <Tb onClick={() => exec('justifyCenter')} title="Markazga"><AlignCenter size={16} /></Tb>
              <Tb onClick={() => exec('justifyRight')} title="O'ngga"><AlignRight size={16} /></Tb>
            </div>
          )}

          {mode !== 'preview' && (
            <div className="relative ml-auto">
              <button onClick={() => { saveRange(); setMenuOpen((o) => !o); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/5 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/10">
                <Plus size={15} /> Belgi qo'shish
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 max-h-80 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                    {Object.entries(groups).map(([g, items]) => (
                      <div key={g}>
                        <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g}</div>
                        {items.map((p) => (
                          <button key={p.key} onClick={() => insertToken(p.key)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                            <span className="text-slate-700">{p.label}</span>
                            <code className="shrink-0 text-[11px] text-slate-400">{`{{${p.key}}}`}</code>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Kontent */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
          {mode === 'visual' && (
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={syncFromEditor}
              onKeyUp={saveRange}
              onMouseUp={saveRange}
              onBlur={() => { saveRange(); syncFromEditor(); }}
              className="tpl-doc mx-auto min-h-full max-w-3xl rounded-lg bg-white p-8 text-[13px] leading-relaxed text-slate-800 shadow-sm outline-none"
            />
          )}
          {mode === 'html' && (
            <textarea
              ref={htmlRef}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              spellCheck={false}
              className="mx-auto block h-full min-h-[60vh] w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-4 font-mono text-xs text-slate-700 outline-none focus:border-brand"
            />
          )}
          {mode === 'preview' && (
            <div
              className="tpl-doc mx-auto min-h-full max-w-3xl rounded-lg bg-white p-8 text-[13px] leading-relaxed text-slate-800 shadow-sm"
              dangerouslySetInnerHTML={{ __html: fillWithSamples(currentHtml(), placeholders) }}
            />
          )}
        </div>
        {mode === 'preview' && (
          <div className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-400">
            Namuna ma'lumotlar bilan ko'rsatilmoqda — PDF shartnomaning haqiqiy ma'lumotlari bilan yaratiladi
          </div>
        )}
      </div>
    </div>
  );
}
