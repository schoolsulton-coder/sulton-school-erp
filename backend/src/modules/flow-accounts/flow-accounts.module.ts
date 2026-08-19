import { Module } from '@nestjs/common';
import { FlowAccountsService } from './flow-accounts.service';
import { FlowAccountsController } from './flow-accounts.controller';

@Module({
  controllers: [FlowAccountsController],
  providers: [FlowAccountsService],
  exports: [FlowAccountsService],
})
export class FlowAccountsModule {}
