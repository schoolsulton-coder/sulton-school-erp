'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdmissionDetailBody } from '@/components/admission-detail';

export default function AdmissionDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link href="/crm" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Qabul ro&apos;yxatiga qaytish
      </Link>
      <AdmissionDetailBody id={params.id} />
    </div>
  );
}
