/**
 * Shartnoma HTML shabloni — Puppeteer orqali PDF ga aylantiriladi.
 * Maktab rekvizitlarini (nomi, STIR, manzil) shu yerda sozlang.
 */

interface ContractTemplateData {
  number: string;
  date: string;
  student: { firstName: string; lastName: string; middleName?: string | null };
  guardianName?: string;
  guardianPhone?: string;
  monthlyAmount: number;
  discountLabel?: string | null;
  months: number;
  installments: { index: number; dueDate: string; amount: number }[];
  total: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('uz-UZ').format(Math.round(n)) + " so'm";

export function renderContractHtml(d: ContractTemplateData): string {
  const SCHOOL = {
    name: 'Sulton School xususiy maktabi',
    stir: '0000000000',
    address: "Toshkent sh., ___ tumani, ___ ko'chasi",
    phone: '+998 99 605 59 00',
  };

  const rows = d.installments
    .map(
      (i) => `
      <tr>
        <td style="text-align:center">${i.index}</td>
        <td>${i.dueDate}</td>
        <td style="text-align:right">${fmt(i.amount)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8" />
<style>
  * { font-family: 'DejaVu Sans', Arial, sans-serif; }
  body { color:#0f172a; font-size:13px; line-height:1.6; padding:0 8px; }
  h1 { text-align:center; font-size:18px; margin-bottom:4px; }
  .sub { text-align:center; color:#64748b; margin-bottom:24px; }
  .meta { display:flex; justify-content:space-between; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; margin:12px 0; }
  th, td { border:1px solid #cbd5e1; padding:6px 8px; }
  th { background:#f1f5f9; text-align:left; }
  .sign { display:flex; justify-content:space-between; margin-top:48px; }
  .sign div { width:45%; }
  .line { border-top:1px solid #0f172a; margin-top:32px; padding-top:4px; font-size:12px; color:#475569; }
  .total { text-align:right; font-weight:bold; font-size:14px; }
</style>
</head>
<body>
  <h1>O'QUV XIZMATLARINI KO'RSATISH SHARTNOMASI</h1>
  <div class="sub">№ ${d.number} · ${d.date}</div>

  <div class="meta">
    <div><b>Ijrochi:</b> ${SCHOOL.name}<br/>STIR: ${SCHOOL.stir}<br/>${SCHOOL.address}<br/>Tel: ${SCHOOL.phone}</div>
    <div style="text-align:right">
      <b>Buyurtmachi (vasiy):</b> ${d.guardianName ?? '—'}<br/>
      Tel: ${d.guardianPhone ?? '—'}<br/>
      <b>O'quvchi:</b> ${d.student.lastName} ${d.student.firstName} ${d.student.middleName ?? ''}
    </div>
  </div>

  <p>
    Mazkur shartnoma asosida Ijrochi o'quvchiga ta'lim xizmatlarini ko'rsatadi,
    Buyurtmachi esa quyidagi jadval bo'yicha to'lovni amalga oshirish majburiyatini
    oladi. Shartnoma muddati — <b>${d.months} oy</b>.
    Oylik to'lov: <b>${fmt(d.monthlyAmount)}</b>${
      d.discountLabel ? ` (chegirma: ${d.discountLabel})` : ''
    }.
  </p>

  <table>
    <thead>
      <tr><th style="width:48px;text-align:center">№</th><th>To'lov sanasi</th><th style="text-align:right">Summa</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">Jami: ${fmt(d.total)}</p>

  <div class="sign">
    <div><b>Ijrochi</b><div class="line">imzo / muhr</div></div>
    <div><b>Buyurtmachi</b><div class="line">imzo</div></div>
  </div>
</body>
</html>`;
}
