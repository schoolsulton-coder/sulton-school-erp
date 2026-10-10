import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DailyTasksService } from './daily-tasks.service';
import {
  CreateDailyTaskDto,
  MarkAllDailyTasksDto,
  MarkBulkDto,
  MarkDailyTaskDto,
  UpdateDailyTaskDto,
} from './dto/daily-task.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

type JwtUser = { id: string; role: string };

@ApiTags('daily-tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('daily-tasks')
export class DailyTasksController {
  constructor(private readonly service: DailyTasksService) {}

  /** Oynadagi sinf tanlovi (koordinator — faqat o'z sinflari) */
  @Get('my-classes')
  @Permissions('behavior.view')
  myClasses(@CurrentUser() user: JwtUser) {
    return this.service.myClasses(user);
  }

  /** Vazifalar ro'yxati: umumiy + sinfga qo'shimcha */
  @Get('tasks')
  @Permissions('behavior.view')
  tasks(
    @CurrentUser() user: JwtUser,
    @Query('classId') classId?: string,
    @Query('all') all?: string,
  ) {
    return this.service.tasks(user, classId, all === 'true');
  }

  @Post('tasks')
  @Permissions('behavior.update')
  createTask(@CurrentUser() user: JwtUser, @Body() dto: CreateDailyTaskDto) {
    return this.service.createTask(user, dto);
  }

  @Patch('tasks/:id')
  @Permissions('behavior.update')
  updateTask(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateDailyTaskDto,
  ) {
    return this.service.updateTask(user, id, dto);
  }

  @Delete('tasks/:id')
  @Permissions('behavior.update')
  removeTask(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.removeTask(user, id);
  }

  /** Kunlik jadval: sinf × kun */
  @Get('board')
  @Permissions('behavior.view')
  board(
    @CurrentUser() user: JwtUser,
    @Query('classId') classId: string,
    @Query('date') date?: string,
  ) {
    return this.service.board(user, { classId, date });
  }

  @Post('mark')
  @Permissions('behavior.create')
  mark(@CurrentUser() user: JwtUser, @Body() dto: MarkDailyTaskDto) {
    return this.service.mark(user, dto);
  }

  @Post('mark-bulk')
  @Permissions('behavior.create')
  markBulk(@CurrentUser() user: JwtUser, @Body() dto: MarkBulkDto) {
    return this.service.markBulk(user, dto);
  }

  @Post('mark-all')
  @Permissions('behavior.create')
  markAll(@CurrentUser() user: JwtUser, @Body() dto: MarkAllDailyTasksDto) {
    return this.service.markAll(user, dto);
  }

  /** Davr bo'yicha: qaysi vazifa qanchalik bajarilgan, kim nechta coin yiqqan */
  @Get('stats')
  @Permissions('behavior.view')
  stats(
    @CurrentUser() user: JwtUser,
    @Query('classId') classId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.stats(user, { classId, from, to });
  }

  /** Kun yakunida vasiylarga bitta xulosa xabar */
  @Post('notify')
  @Permissions('behavior.create')
  notify(
    @CurrentUser() user: JwtUser,
    @Body() body: { classId: string; date?: string },
  ) {
    return this.service.notifyDay(user, body);
  }
}
