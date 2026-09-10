'use client';

import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from './attendance';
import { classesApi } from './classes';

/**
 * O'quv jarayoni oynalari uchun sinflar ro'yxati:
 * ustoz/kurator/koordinator — faqat o'ziga biriktirilganlari,
 * qolgan rollar — barcha sinflar.
 * `scoped` — ro'yxat cheklanganini bildiradi (filtrlarni yashirish uchun).
 */
export function useMyClasses() {
  const { data: my } = useQuery({ queryKey: ['att-my-classes'], queryFn: attendanceApi.myClasses });
  const scoped = my?.canMarkAll === false;

  const { data: all } = useQuery({
    queryKey: ['classes-mini'],
    queryFn: () => classesApi.list(),
    enabled: my !== undefined && !scoped,
  });

  const classes: { id: string; name: string }[] = scoped
    ? my!.classes
    : (all ?? []).map((c) => ({ id: c.id, name: c.name }));

  return { classes, scoped };
}
