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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @Permissions('users.view')
  list(@Query('search') search?: string, @Query('roleId') roleId?: string) {
    return this.service.listUsers({ search, roleId });
  }

  @Post()
  @Permissions('users.create')
  create(@Body() dto: CreateUserDto) {
    return this.service.createUser(dto);
  }

  @Patch(':id')
  @Permissions('users.update')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.updateUser(id, dto);
  }

  @Patch(':id/password')
  @Permissions('users.update')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(id, dto.password);
  }

  @Patch(':id/status')
  @Permissions('users.update')
  setStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED',
  ) {
    return this.service.setStatus(id, status);
  }

  @Delete(':id')
  @Permissions('users.delete')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteUser(id, { id: user?.id, role: user?.role });
  }
}
