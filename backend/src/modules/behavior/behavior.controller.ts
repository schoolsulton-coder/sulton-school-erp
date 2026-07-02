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
import { BehaviorService } from './behavior.service';
import { CreateBehaviorDto } from './dto/create-behavior.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('behavior')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('behavior')
export class BehaviorController {
  constructor(private readonly service: BehaviorService) {}

  @Get()
  @Permissions('behavior.view')
  list(@Query('studentId') studentId?: string, @Query('type') type?: string) {
    return this.service.list({ studentId, type });
  }

  @Get('student/:studentId')
  @Permissions('behavior.view')
  studentSummary(@Param('studentId') studentId: string) {
    return this.service.studentSummary(studentId);
  }

  @Get('class/:classId/ranking')
  @Permissions('behavior.view')
  classRanking(@Param('classId') classId: string) {
    return this.service.classRanking(classId);
  }

  @Post()
  @Permissions('behavior.create')
  create(@CurrentUser('id') authorId: string, @Body() dto: CreateBehaviorDto) {
    return this.service.create(authorId, dto);
  }

  @Delete(':id')
  @Permissions('behavior.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
