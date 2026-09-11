'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

/**
 * PWA — service worker'ni ro'yxatdan o'tkazadi va brauzer "o'rnatish"ga tayyor
 * bo'lganda (beforeinstallprompt) o'zimizning "Ilovani o'rnatish" tugmasini
 * ko'rsatadi. Chrome/Edge/Android'da ishlaydi; iOS Safari'da qo'llanma chiqadi.
 */

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as any).standalone === true);

export function PWAInstall() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  // Service worker'ni ro'yxatdan o'tkazish
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onLoad = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, []);

  // O'rnatish taklifini ushlash
  useEffect(() => {
    if (isStandalone()) return; // allaqachon o'rnatilgan

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      if (sessionStorage.getItem('pwa-hide') !== '1') setShow(true);
    };
    const onInstalled = () => {
      setShow(false);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari: beforeinstallprompt yo'q — qo'lda qo'shish qo'llanmasi
    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    if (isIOS && isSafari && sessionStorage.getItem('pwa-hide') !== '1') {
      setIosHint(true);
      setShow(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      sessionStorage.setItem('pwa-hide', '1');
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-[calc(100vw-2rem)] animate-[fadeIn_.2s_ease] sm:max-w-sm">
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
          <Download size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800">Ilovani o&apos;rnatish</div>
          {iosHint ? (
            <p className="mt-0.5 text-xs leading-snug text-slate-500">
              Safari&apos;da <span className="font-medium">Ulashish</span> tugmasi →{' '}
              <span className="font-medium">&quot;Bosh ekranga qo&apos;shish&quot;</span>ni bosing.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-snug text-slate-500">
              Sulton School ERP&apos;ni ilova sifatida o&apos;rnating — tezroq va alohida oynada ochiladi.
            </p>
          )}
          {!iosHint && (
            <button
              onClick={install}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
            >
              <Download size={14} /> O&apos;rnatish
            </button>
          )}
        </div>
        <button onClick={dismiss} className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Yopish">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
