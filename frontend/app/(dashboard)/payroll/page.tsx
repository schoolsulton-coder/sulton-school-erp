import { redirect } from 'next/navigation';

/**
 * ESKI maosh sahifasi — ishlatilmaydi.
 * Bu yerda "to'langan" deb belgilangan maosh kassadan chiqmaydi va hisobni
 * chalkashtiradi, shuning uchun yangi /maoshlar bo'limiga yo'naltiriladi.
 */
export default function PayrollPage() {
  redirect('/maoshlar');
}
