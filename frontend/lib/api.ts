import axios from 'axios';
import { useAuthStore } from '@/store/auth';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const api = axios.create({ baseURL });

// Har bir so'rovga JWT access token qo'shadi
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function forceLogout() {
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined') window.location.href = '/login';
}

// Javob umuman kelmadi: tarmoq uzildi / timeout / CORS — sessiya aybdor emas
function isNetworkError(error: any): boolean {
  return !error?.response;
}

// Server vaqtincha yo'q (deploy, restart, proxy) — sessiya aybdor emas
function isServerUnavailable(status?: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

// Refresh natijasi: token olindi (token) yoki sessiya haqiqatan tugadi (sessionExpired).
// Ikkovi ham bo'lmasa — vaqtincha xato, keyingi urinishda qayta sinaladi.
type RefreshResult = { token: string | null; sessionExpired: boolean };

// Bir vaqtda ko'p 401 bo'lsa — bitta refresh so'rovi ishlaydi (dedup)
let refreshing: Promise<RefreshResult> | null = null;
async function refreshAccessToken(): Promise<RefreshResult> {
  const rt = useAuthStore.getState().refreshToken;
  if (!rt) return { token: null, sessionExpired: true };
  try {
    // Interceptorlarsiz toza so'rov (aylanma logout bo'lmasin)
    const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken: rt });
    const { accessToken, user } = res.data;
    if (!accessToken) return { token: null, sessionExpired: true };
    if (user) useAuthStore.getState().setAuth(accessToken, user, rt);
    else useAuthStore.getState().setToken(accessToken);
    return { token: accessToken, sessionExpired: false };
  } catch (err: any) {
    const status = err?.response?.status;
    // Faqat haqiqiy 401/403 — refresh kalit yaroqsiz, sessiya tugagan
    if (status === 401 || status === 403) return { token: null, sessionExpired: true };
    // Tarmoq uzildi, server vaqtincha yo'q yoki boshqa xato —
    // 7 kunlik refresh kalitni o'chirmaymiz, keyin qayta urinamiz
    return { token: null, sessionExpired: false };
  }
}

// 401 → access token'ni yangilab, so'rovni qayta yuboradi; bo'lmasa login'ga
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url: string = original?.url ?? '';

    // Tarmoq uzilishi / timeout / CORS — sessiyaga TEGMAYMIZ, foydalanuvchi sahifada qoladi
    if (isNetworkError(error)) return Promise.reject(error);
    // Server vaqtincha yo'q (502/503/504) — bu ham sessiya tugagani emas
    if (isServerUnavailable(status)) return Promise.reject(error);

    if (status !== 401 || !original || original._retry) return Promise.reject(error);
    // Login/refresh so'rovining o'zi 401 bersa — refresh urinmaymiz
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      if (url.includes('/auth/refresh')) forceLogout();
      return Promise.reject(error);
    }

    original._retry = true;
    if (!refreshing) refreshing = refreshAccessToken().finally(() => { refreshing = null; });
    const result = await refreshing;
    const newToken = result?.token;
    if (newToken) {
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }
    // Faqat sessiya haqiqatan tugaganda logout; tarmoq/server xatosida kutamiz
    if (result?.sessionExpired) forceLogout();
    return Promise.reject(error);
  },
);
