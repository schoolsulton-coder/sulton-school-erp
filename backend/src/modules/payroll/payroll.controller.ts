import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PayrollService } from './payroll.service';
import { CreateRunDto } from './dto/create-run.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get('runs')
  @Permissions('payroll.view')
  listRuns() {
    return this.service.listRuns();
  }

  @Post('runs')
  @Permissions('payroll.create')
  createRun(@Body() dto: CreateRunDto) {
    return this.service.createRun(dto);
  }

  @Get('runs/:id')
  @Permissions('payroll.view')
  getRun(@Param('id') id: string) {
    return this.service.getRun(id);
  }

  @Patch('items/:itemId')
  @Permissions('payroll.update')
  updateItem(@Param('itemId') itemId: string, @Body() dto: UpdateItemDto) {
    return this.service.updateItem(itemId, dto);
  }

  @Patch('runs/:id/approve')
  @Permissions('payroll.update')
  approve(@Param('id') id: string) {
    return this.service.approveRun(id);
  }

  @Patch('runs/:id/pay')
  @Permissions('payroll.update')
  pay(@Param('id') id: string) {
    return this.service.payRun(id);
  }

  @Get('runs/:id/vedomost')
  @Permissions('payroll.view')
  async vedomost(@Param('id') id: string, @Res() res: Response) {
    const { buffer, period } = await this.service.generateVedomost(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="vedomost-${period}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
