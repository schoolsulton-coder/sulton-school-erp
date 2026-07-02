import { Module } from '@nestjs/common';
import { EsmaktabService } from './esmaktab.service';
import { EsmaktabController } from './esmaktab.controller';

@Module({
  controllers: [EsmaktabController],
  providers: [EsmaktabService],
  exports: [EsmaktabService],
})
export class EsmaktabModule {}
