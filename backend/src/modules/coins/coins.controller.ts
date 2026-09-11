import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CoinsService } from './coins.service';
import { CreateCoinDto } from './dto/create-coin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('coins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('coins')
export class CoinsController {
  constructor(private readonly service: CoinsService) {}

  @Get()
  @Permissions('behavior.view')
  list(
    @CurrentUser() user: any,
    @Query('studentId') studentId?: string,
    @Query('classId') classId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.list(user, { studentId, classId, from, to });
  }

  @Get('student/:studentId')
  @Permissions('behavior.view')
  studentSummary(@Param('studentId') studentId: string) {
    return this.service.studentSummary(studentId);
  }

  @Get('class/:classId/stats')
  @Permissions('behavior.view')
  classStats(
    @Param('classId') classId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.classStats(classId, from, to);
  }

  @Post()
  @Permissions('behavior.create')
  create(@CurrentUser() user: any, @Body() dto: CreateCoinDto) {
    return this.service.create(user, dto);
  }

  @Delete(':id')
  @Permissions('behavior.delete')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
