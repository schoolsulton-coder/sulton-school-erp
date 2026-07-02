interface VedomostData {
  period: string;
  items: {
    index: number;
    fullName: string;
    position?: string | null;
    base: number;
    bonus: number;
    penalty: number;
    total: number;
  }[];
  totalSum: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('uz-UZ').format(Math.round(n)) + " so'm";

export function renderVedomostHtml(d: VedomostData): string {
  const rows = d.items
    .map(
      (i) => `
      <tr>
        <td style="text-align:center">${i.index}</td>
        <td>${i.fullName}</td>
        <td>${i.position ?? '—'}</td>
        <td style="text-align:right">${fmt(i.base)}</td>
        <td style="text-align:right">${fmt(i.bonus)}</td>
        <td style="text-align:right">${fmt(i.penalty)}</td>
        <td style="text-align:right;font-weight:bold">${fmt(i.total)}</td>
        <td style="width:90px"></td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8" />
<style>
  * { font-family: 'DejaVu Sans', Arial, sans-serif; }
  body { color:#0f172a; font-size:12px; padding:0 8px; }
  h1 { text-align:center; font-size:16px; margin-bottom:2px; }
  .sub { text-align:center; color:#64748b; margin-bottom:18px; }
  table { width:100%; border-collapse:collapse; }
  th, td { border:1px solid #cbd5e1; padding:5px 7px; }
  th { background:#f1f5f9; text-align:left; }
  tfoot td { font-weight:bold; background:#f8fafc; }
</style>
</head>
<body>
  <h1>ISH HAQI VEDOMOSTI</h1>
  <div class="sub">Davr: ${d.period} · Sulton School</div>
  <table>
    <thead>
      <tr>
        <th style="width:36px;text-align:center">№</th>
        <th>F.I.SH</th>
        <th>Lavozim</th>
        <th style="text-align:right">Asosiy</th>
        <th style="text-align:right">Bonus</th>
        <th style="text-align:right">Jarima</th>
        <th style="text-align:right">Jami</th>
        <th>Imzo</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="6" style="text-align:right">JAMI:</td>
        <td style="text-align:right">${fmt(d.totalSum)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
}
