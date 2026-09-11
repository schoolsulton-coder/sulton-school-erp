/* Sulton School ERP — minimal service worker.
 * Vazifasi: PWA "o'rnatish" mezonini qondirish (fetch handler bo'lishi shart).
 * MUHIM: ERP ma'lumoti doim yangi bo'lishi kerak — shuning uchun HECH NARSA
 * keshlanmaydi (API/sahifa javoblari to'g'ridan-to'g'ri tarmoqdan olinadi).
 * Faqat sahifa (navigate) so'rovi tarmoqsiz qolsa — oddiy oflayn xabar chiqadi. */

const OFFLINE_HTML =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Oflayn</title>' +
  '<div style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;color:#334155;background:#faf7f7;margin:0">' +
  '<div><div style="font-size:44px">📡</div><h2>Internet aloqasi yo\'q</h2>' +
  '<p>Sulton School ERP ishlashi uchun internet kerak. Aloqani tekshirib, qayta urinib ko\'ring.</p>' +
  '<button onclick="location.reload()" style="padding:10px 18px;border:0;border-radius:10px;background:#D51A20;color:#fff;font-weight:600;cursor:pointer">Qayta yuklash</button></div></div>';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Faqat sahifa navigatsiyasini ushlaymiz (offline fallback uchun).
  // API, statik fayllar, boshqa so'rovlar tabiiy o'tadi — kesh yo'q.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(
        () => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
      ),
    );
  }
});
