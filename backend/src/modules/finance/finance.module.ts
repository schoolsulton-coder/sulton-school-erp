import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { RegistersService } from './registers.service';
import { RegistersController } from './registers.controller';

@Module({
  controllers: [FinanceController, RegistersController],
  providers: [FinanceService, RegistersService],
  exports: [FinanceService],
})
export class FinanceModule {}
