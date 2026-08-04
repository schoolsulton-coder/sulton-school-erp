import { Module } from '@nestjs/common';
import { DebtorsService } from './debtors.service';
import { DebtorsController } from './debtors.controller';

@Module({
  controllers: [DebtorsController],
  providers: [DebtorsService],
})
export class DebtorsModule {}
