import { Module } from '@nestjs/common';
import { InternalTransfersService } from './internal-transfers.service';
import { InternalTransfersController } from './internal-transfers.controller';

@Module({
  controllers: [InternalTransfersController],
  providers: [InternalTransfersService],
})
export class InternalTransfersModule {}
