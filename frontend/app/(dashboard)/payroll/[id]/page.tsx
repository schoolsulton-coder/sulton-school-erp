import { redirect } from 'next/navigation';

/**
 * ESKI maosh hisobi sahifasi — ishlatilmaydi.
 * Tasdiqlash/to'lash amallari kassaga ta'sir qilmagani uchun yopildi;
 * barcha maosh ishlari yangi /maoshlar bo'limida.
 */
export default function PayrollRunPage() {
  redirect('/maoshlar');
}
