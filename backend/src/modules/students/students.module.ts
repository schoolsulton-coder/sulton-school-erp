import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';

/**
 * Bu modul — barcha ERP/LMS modullari uchun NAMUNA (shablon).
 * Yangi modul yaratishda shu tuzilishni nusxalang:
 *   dto/  ·  *.service.ts  ·  *.controller.ts  ·  *.module.ts
 * So'ng AppModule imports ro'yxatiga qo'shing.
 */
@Module({
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
