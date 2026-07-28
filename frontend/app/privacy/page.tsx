import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Maxfiylik siyosati — Sulton School',
  description: "Sulton School maxfiylik siyosati va ma'lumotlarni qayta ishlash tartibi",
};

// Commit qilinganda oxirgi yangilanish sanasi (build-time emas, qat'iy).
const UPDATED = '2026-07-28';

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
      <h1 className="mb-2 text-3xl font-bold text-[#D51A20]">Maxfiylik siyosati</h1>
      <p className="mb-8 text-sm text-slate-500">Oxirgi yangilanish: {UPDATED}</p>

      <section className="space-y-6 leading-relaxed">
        <p>
          Ushbu maxfiylik siyosati <strong>Sulton School</strong> (keyingi o&apos;rinlarda
          &laquo;Maktab&raquo;, &laquo;biz&raquo;) tomonidan foydalanuvchilarning shaxsiy
          ma&apos;lumotlari qanday yig&apos;ilishi, ishlatilishi va himoya qilinishini tushuntiradi.
          Maktabning raqamli boshqaruv tizimidan (ERP) hamda ijtimoiy tarmoqlar orqali biz bilan
          bog&apos;lanishdan foydalanish orqali siz ushbu siyosat shartlariga rozilik bildirasiz.
        </p>

        <div>
          <h2 className="mb-2 text-xl font-semibold">1. Biz qanday ma&apos;lumot yig&apos;amiz</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Qabul ma&apos;lumotlari:</strong> o&apos;quvchi va ota-onaning ismi, telefon
              raqami, sinf/filial va qabulga oid boshqa ma&apos;lumotlar.
            </li>
            <li>
              <strong>Instagram/Facebook orqali murojaatlar:</strong> agar siz bizning Instagram yoki
              Facebook sahifamizga xabar (Direct) yozsangiz, Meta platformasi orqali sizning
              foydalanuvchi identifikatoringiz, ismingiz/username va yuborgan xabaringiz matni bizga
              yetkaziladi — bu murojaatingizga javob berish uchun ishlatiladi.
            </li>
            <li>
              <strong>Sayt orqali ro&apos;yxatdan o&apos;tish:</strong> rasmiy saytimiz orqali qoldirgan
              ariza ma&apos;lumotlaringiz.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">2. Ma&apos;lumotlardan qanday foydalanamiz</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Qabul jarayonini yuritish va siz bilan bog&apos;lanish uchun;</li>
            <li>Murojaat va savollaringizga javob berish uchun;</li>
            <li>Ta&apos;lim xizmatlari, to&apos;lovlar va shartnomalarni boshqarish uchun;</li>
            <li>Xizmat sifatini yaxshilash uchun.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">3. Ma&apos;lumotlarni uchinchi shaxslarga berish</h2>
          <p>
            Biz sizning shaxsiy ma&apos;lumotlaringizni sotmaymiz va reklama maqsadida uchinchi
            shaxslarga bermaymiz. Ma&apos;lumotlar faqat qonun talab qilgan hollarda yoki xizmatni
            ta&apos;minlash uchun zarur bo&apos;lgan texnik provayderlar (masalan, xosting, Meta
            Platforms) doirasida ishlanadi.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">4. Ma&apos;lumotlarni saqlash va himoya</h2>
          <p>
            Ma&apos;lumotlar himoyalangan serverlarda saqlanadi va faqat vakolatli xodimlar uchun
            ochiq. Biz ma&apos;lumotlarni ruxsatsiz kirish, o&apos;zgartirish yoki yo&apos;qotishdan
            himoya qilish uchun texnik va tashkiliy choralarni qo&apos;llaymiz.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">5. Sizning huquqlaringiz</h2>
          <p>
            Siz o&apos;zingiz haqingizdagi ma&apos;lumotlarni ko&apos;rish, tuzatish yoki
            o&apos;chirishni so&apos;rashingiz mumkin. Buning uchun quyidagi kontaktlar orqali biz
            bilan bog&apos;laning.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">6. Ma&apos;lumotlarni o&apos;chirish</h2>
          <p>
            Instagram/Facebook orqali yuborilgan ma&apos;lumotlaringizni o&apos;chirishni istasangiz,
            quyidagi manzilga xabar yuboring — so&apos;rovingiz asosida tegishli ma&apos;lumotlar
            tizimdan o&apos;chiriladi.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">7. Bog&apos;lanish</h2>
          <ul className="list-none space-y-1">
            <li><strong>Sulton School</strong></li>
            <li>Veb-sayt: <a className="text-[#D51A20] underline" href="https://sultonschool.uz">sultonschool.uz</a></li>
            <li>Instagram: <a className="text-[#D51A20] underline" href="https://instagram.com/sultonschool">@sultonschool</a></li>
            <li>Email: <a className="text-[#D51A20] underline" href="mailto:info@sultonschool.uz">info@sultonschool.uz</a></li>
          </ul>
        </div>

        <p className="pt-4 text-sm text-slate-500">
          Ushbu siyosat vaqti-vaqti bilan yangilanishi mumkin. O&apos;zgarishlar ushbu sahifada
          e&apos;lon qilinadi.
        </p>
      </section>
    </main>
  );
}
