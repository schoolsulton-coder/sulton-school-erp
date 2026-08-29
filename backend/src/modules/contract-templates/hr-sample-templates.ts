/**
 * Kadrlar hujjatlari uchun tayyor namuna shablonlar.
 * Bo'sh joylar {{token}} bilan bog'langan — «Yangi shartnoma» formasidagi
 * ma'lumotlar PDF'da o'z o'rniga tushadi (hr-tokens.ts ga qarang).
 * Matnni ERP ichidagi muharrirda tahrirlash mumkin.
 */

const HEAD = `
<p style="text-align:center;font-weight:bold;font-size:15px;margin:0 0 2px">{{maktab_nomi}}</p>
<hr style="border:none;border-top:2px solid #111;margin:2px 0 14px" />
`;

/** 1) Ishga qabul qilish to'g'risida buyruq */
const BUYRUQ = `
${HEAD}
<table style="width:100%;border:none;margin-bottom:10px">
  <tr>
    <td style="border:none;padding:0">{{sana_yil}}-yil &laquo;{{sana_kun}}&raquo;-{{sana_oy}}</td>
    <td style="border:none;padding:0;text-align:right">{{shahar}}</td>
  </tr>
</table>

<p style="text-align:center;font-weight:bold;margin:14px 0 18px">{{hujjat_raqami}} &ndash; sonli BUYRUQ</p>

<p style="font-weight:bold;margin:0 0 16px">Ishga qabul qilish<br />to&lsquo;g&lsquo;risida</p>

<p style="text-align:justify">
  1. <b>{{xodim_fio}}</b> &ndash; {{sana_yil}}-yil &laquo;{{sana_kun}}&raquo;-{{sana_oy}}dan
  <b>{{lavozim}}</b> lavozimiga {{sinov_muddati}} sinov muddati bilan ishga qabul qilinsin.
  Oylik maosh shtat jadvali asosida belgilansin. Bandlik turi: {{bandlik_turi}}, stavka: {{stavka}}.
</p>

<p style="text-align:justify;margin-left:18px;font-size:12px">
  Asos: {{xodim_fio}} bilan tuzilgan mehnat shartnomasi va arizasi.
  O&lsquo;zR MK {{modda}}, {{sana}} da tuzilgan {{hujjat_raqami}}-sonli mehnat shartnomasi.
</p>

<table style="width:100%;border:none;margin-top:40px">
  <tr>
    <td style="border:none;padding:0;font-weight:bold">Direktor:</td>
    <td style="border:none;padding:0;font-weight:bold">{{direktor}}</td>
  </tr>
</table>

<p style="margin-top:32px">Huquqshunos:</p>

<table style="width:100%;border:none;margin-top:28px">
  <tr>
    <td style="border:none;padding:0">Buyruq bilan tanishdim:</td>
    <td style="border:none;padding:0;text-align:right">_____________________ ({{xodim_fio}})</td>
  </tr>
</table>
`;

/** 2) Mehnat shartnomasi (kontrakt) */
const MEHNAT_SHARTNOMASI = `
${HEAD}
<p style="text-align:center;font-weight:bold;margin:0 0 12px">
  {{hujjat_raqami}}-SON MEHNAT SHARTNOMASI (KONTRAKT)
</p>

<table style="width:100%;border:none;margin-bottom:12px">
  <tr>
    <td style="border:none;padding:0">{{shahar}}</td>
    <td style="border:none;padding:0;text-align:right">&laquo;{{sana_kun}}&raquo; {{sana_oy}} {{sana_yil}}-yil</td>
  </tr>
</table>

<p style="text-align:justify">
  1. {{maktab_nomi}} nomidan direktor {{direktor_toliq}}, keyingi o&lsquo;rinlarda
  &ldquo;Ish beruvchi&rdquo; deb ataladi va fuqaro <b>{{xodim_fio}}</b>, keyingi o&lsquo;rinlarda
  &ldquo;Xodim&rdquo; deb ataladi, mazkur shartnomani quyidagilar haqida tuzdik:
</p>
<p style="text-align:justify">2. Xodim <b>{{lavozim}}</b> lavozimiga ishga qabul qilinadi. Filial: {{filial}}.</p>
<p style="text-align:justify">3. Shartnoma <b>{{bandlik_turi}}</b> (asosiy, o&lsquo;rindosh, soatbay) hisoblanadi. Stavka: {{stavka}}.</p>
<p style="text-align:justify">4. Shartnoma muddati: {{sana}} &ndash; {{tugash_sana}}.</p>
<p style="text-align:justify">5. Shartnoma bo&lsquo;yicha ishlash boshlanishi {{kelish_sana}}, tamom bo&lsquo;lishi {{tugash_sana}}.</p>
<p style="text-align:justify">6. Sinov muddati: {{sinov_muddati}}.</p>

<p style="text-align:justify"><b>7. Xodimning majburiyatlari:</b></p>
<p style="text-align:justify">a) mehnat va texnologiya intizomi (ichki mehnat tartibi qoidalari, ustavlar va intizom to&lsquo;g&lsquo;risidagi qoidalar)ga rioya qilish;</p>
<p style="text-align:justify">b) ish beruvchining qonuniy farmoyishlarini bajarish;</p>
<p style="text-align:justify">v) mehnatni muhofaza qilish, xavfsizlik texnikasi va ishlab chiqarish sanitariyasi talablariga rioya qilish;</p>
<p style="text-align:justify">g) lavozim yo&lsquo;riqnomalariga rioya qilish;</p>
<p style="text-align:justify">d) YATMM, MM bilan nazarda tutilgan malaka majburiyatlariga rioya qilish;</p>
<p style="text-align:justify">e) qonun hujjatlari va boshqa normativ hujjatlarga rioya qilish;</p>
<p style="text-align:justify">j) jamoa shartnomasi shartlariga rioya qilish;</p>
<p style="text-align:justify">z) xodim tomonidan qabul qilinadigan boshqa majburiyatlar;</p>
<p style="text-align:justify">i) Tashqi ko&lsquo;rinish (imidj): Xodim maktabning korporativ madaniyati va ijobiy imidjini saqlash maqsadida ish vaqtida ozoda, saranjom-sarishta, pedagog odob-axloqiga hamda maktabning ichki tartib-qoidalari va dress-kod talablariga mos tashqi ko&lsquo;rinishda bo&lsquo;lishi, o&lsquo;zining xatti-harakati va muomalasi bilan maktabning obro&lsquo;-e&rsquo;tiboriga putur yetkazmasligi.</p>

<p style="text-align:justify"><b>8. Ish beruvchining majburiyatlari:</b></p>
<p style="text-align:justify">a) xodimning mehnatini tashkil etish, xodimni mehnatni muhofaza qilish va xavfsizlik texnikasi qoidalari, lavozim yo&lsquo;riqnomalari, jamoa shartnomasi va boshqa normativ va mahalliy hujjatlar bilan tanishtirish;</p>
<p style="text-align:justify">b) mehnat va ishlab chiqarish intizomini ta&rsquo;minlash;</p>
<p style="text-align:justify">v) ish haqini o&lsquo;z vaqtida to&lsquo;lash;</p>
<p style="text-align:justify">g) xavfsiz va samarali mehnat uchun shart-sharoitlar yaratish, xodimni o&lsquo;qitish, unga mehnatning xavfsiz shart-sharoiti to&lsquo;g&lsquo;risida ma&rsquo;lumot berish;</p>
<p style="text-align:justify">d) ish joyini mehnatni muhofaza qilish va xavfsizlik texnikasi qoidalariga muvofiq jihozlash;</p>
<p style="text-align:justify">j) qonun hujjatlariga va boshqa normativ hujjatlarga rioya qilish;</p>
<p style="text-align:justify">z) jamoa shartnomasi shartlariga rioya qilish;</p>
<p style="text-align:justify">i) ish beruvchi tomonidan qabul qilinadigan boshqa majburiyatlar.</p>

<p style="text-align:justify">9. Ish kuni rejimi: 8 soatgacha.</p>

<p style="text-align:justify"><b>10. Mehnat haqi to&lsquo;lash.</b> Xodimga quyidagicha haq to&lsquo;lash belgilanadi:</p>
<p style="text-align:justify">a) shtatlar jadvaliga asosan;</p>
<p style="text-align:justify">b) amaldagi qonun hujjatlari va normativ hujjatlarga muvofiq mehnat sharoitlari bilan bog&lsquo;liq bo&lsquo;lgan qo&lsquo;shimcha haq, ustama, kompensatsiyalar &mdash; ichki buyruq va nizomlar asosida;</p>
<p style="text-align:justify">v) jamoa shartnomasi shartlari bilan nazarda tutilgan, shuningdek, berilgan (mavjud) huquqlar va mablag&lsquo;lar doirasida rahbar tomonidan belgilanadigan qo&lsquo;shimcha haq, ustama, mukofot, taqdirlashlar va rag&lsquo;batlantiruvchi turdagi boshqa to&lsquo;lovlar &mdash; ichki buyruq va nizomlar asosida.</p>
<p style="text-align:justify">Qo&lsquo;shimcha lavozim: {{qoshimcha_lavozim}} ({{qoshimcha_stavka}} stavka).</p>

<p style="text-align:justify">11. Mehnat shartnomasi (kontrakt)ning mehnat sharoitlari va unga haq to&lsquo;lash xususiyatlari, ijtimoiy himoya, imtiyozlar, kafolatlar va hokazolar bilan bog&lsquo;liq bo&lsquo;lgan boshqa shartlari.</p>

<p style="margin-top:18px"><b>Tomonlarning manzillari va imzolari:</b></p>

<table style="width:100%;border:none;margin-top:8px">
  <tr>
    <td style="border:none;padding:0;width:50%;vertical-align:top">
      <p style="margin:0"><b>Ish beruvchi:</b></p>
      <p style="margin:2px 0">{{maktab_nomi}}</p>
      <p style="margin:2px 0">{{tashkilot_manzili}}</p>
      <p style="margin:10px 0 0">&laquo;___&raquo; __________ 202__-yil.</p>
      <p style="margin:10px 0 0">(muhr) ____________ (imzo)</p>
    </td>
    <td style="border:none;padding:0;width:50%;vertical-align:top">
      <p style="margin:0"><b>Xodim:</b></p>
      <p style="margin:2px 0">F.I.SH.: {{xodim_fio}}</p>
      <p style="margin:2px 0">Manzili: {{xodim_manzil}}</p>
      <p style="margin:2px 0">Passport: {{xodim_passport}}</p>
      <p style="margin:10px 0 0">&laquo;___&raquo; __________ 202__-yil.</p>
      <p style="margin:10px 0 0">____________ (imzo)</p>
    </td>
  </tr>
</table>

<p style="text-align:center;margin-top:28px;font-size:12px">{{shahar}} {{sana_yil}}</p>
`;

export const HR_SAMPLE_TEMPLATES: { name: string; html: string }[] = [
  { name: "Ishga qabul qilish to'g'risida buyruq", html: BUYRUQ.trim() },
  { name: 'Mehnat shartnomasi (kontrakt)', html: MEHNAT_SHARTNOMASI.trim() },
];
