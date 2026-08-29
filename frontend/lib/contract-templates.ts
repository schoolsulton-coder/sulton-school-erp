import { api } from './api';

export type TemplateKind = 'STUDENT' | 'HR';

export interface TemplateListItem {
  id: string;
  name: string;
  kind?: TemplateKind;
  createdAt: string;
  updatedAt: string;
}
export interface Template extends TemplateListItem {
  html: string;
}
export interface Placeholder {
  key: string;
  label: string;
  sample: string;
  group: string;
}

export const contractTemplatesApi = {
  placeholders: (kind?: TemplateKind) =>
    api.get<Placeholder[]>('/contract-templates/placeholders', { params: { kind } }).then((r) => r.data),
  list: (kind?: TemplateKind) =>
    api.get<TemplateListItem[]>('/contract-templates', { params: { kind } }).then((r) => r.data),
  get: (id: string) => api.get<Template>(`/contract-templates/${id}`).then((r) => r.data),
  /** Kadrlar uchun tayyor namunalar (buyruq + mehnat shartnomasi) */
  createHrSamples: () =>
    api.post<{ created: { id: string; name: string }[]; count: number }>('/contract-templates/hr-samples').then((r) => r.data),
  create: (data: { name: string; html: string; kind?: TemplateKind }) =>
    api.post<Template>('/contract-templates', data).then((r) => r.data),
  update: (id: string, data: { name?: string; html?: string }) =>
    api.patch<Template>(`/contract-templates/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/contract-templates/${id}`).then((r) => r.data),

  uploadDocx: (name: string, file: File, kind?: TemplateKind) => {
    const fd = new FormData();
    fd.append('name', name);
    fd.append('file', file);
    if (kind) fd.append('kind', kind);
    return api
      .post<Template>('/contract-templates/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  /** Shablon bo'yicha kadrlar hujjatiga (buyruq/mehnat shartnomasi) PDF */
  openHrPdf: (templateId: string, contractId: string, number: string) =>
    openBlobPdf(`/contract-templates/${templateId}/hr-pdf/${contractId}`, number),

  /** Shablon bo'yicha shartnomaga PDF (blob → yangi oynada). Xato bo'lsa — sababini ko'rsatadi */
  openPdf: async (templateId: string, contractId: string, number: string) => {
    try {
      const res = await api.get(
        `/contract-templates/${templateId}/pdf/${contractId}`,
        { responseType: 'blob' },
      );
      const blob = res.data as Blob;
      if (blob.type && !blob.type.includes('pdf')) {
        alert(await readPdfError(blob));
        return;
      }
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.download = `${number}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e: any) {
      const d = e?.response?.data;
      alert(d instanceof Blob ? await readPdfError(d) : (e?.message ?? "PDF yaratib bo'lmadi"));
    }
  },
};

/** PDF'ni blob sifatida olib, yangi oynada ochadi (auth header bilan) */
async function openBlobPdf(url: string, filename: string) {
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const blob = res.data as Blob;
    if (blob.type && !blob.type.includes('pdf')) {
      alert(await readPdfError(blob));
      return;
    }
    const objUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = objUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    a.download = `${filename}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
  } catch (e: any) {
    const d = e?.response?.data;
    alert(d instanceof Blob ? await readPdfError(d) : (e?.message ?? "PDF yaratib bo'lmadi"));
  }
}

/** Blob ichidagi server xato xabarini o'qiydi (PDF o'rniga JSON kelganda) */
export async function readPdfError(blob: Blob): Promise<string> {
  try {
    const txt = await blob.text();
    const msg = JSON.parse(txt)?.message;
    if (msg) return Array.isArray(msg) ? msg.join(', ') : String(msg);
  } catch {
    /* ignore */
  }
  return "PDF yaratib bo'lmadi. Serverda Chromium (PDF) o'rnatilganini tekshiring.";
}

/** Preview/insert uchun sample qiymatlar bilan {{token}} larni almashtiradi (client-side) */
export function fillWithSamples(html: string, placeholders: Placeholder[]): string {
  const map = new Map(placeholders.map((p) => [p.key, p.sample]));
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, k: string) => {
    if (!map.has(k)) return m;
    const v = map.get(k)!;
    return k === 'tolov_jadvali'
      ? '<table style="width:100%;border-collapse:collapse;margin:8px 0"><thead><tr><th style="border:1px solid #999;padding:4px 8px">№</th><th style="border:1px solid #999;padding:4px 8px">Sana</th><th style="border:1px solid #999;padding:4px 8px">Summa</th></tr></thead><tbody><tr><td style="border:1px solid #999;padding:4px 8px;text-align:center">1</td><td style="border:1px solid #999;padding:4px 8px">01.09.2025</td><td style="border:1px solid #999;padding:4px 8px;text-align:right">1 500 000 so\'m</td></tr></tbody></table>'
      : v;
  });
}
