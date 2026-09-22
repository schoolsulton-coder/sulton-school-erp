import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardDetailService } from './dashboard-detail.service';
import { DashboardQueries } from './dashboard.queries';

@Module({
  imports: [FinanceModule],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardDetailService, DashboardQueries],
})
export class DashboardModule {}
