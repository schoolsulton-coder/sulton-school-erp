import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class RolesController {
  constructor(private readonly service: UsersService) {}

  @Get('roles')
  @Permissions('users.view')
  listRoles() {
    return this.service.listRoles();
  }

  @Get('roles/:id')
  @Permissions('users.view')
  getRole(@Param('id') id: string) {
    return this.service.getRole(id);
  }

  @Get('permissions')
  @Permissions('users.view')
  listPermissions() {
    return this.service.listPermissions();
  }

  @Patch('roles/:id/permissions')
  @Permissions('users.update')
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.service.updateRolePermissions(id, dto.permissions);
  }
}
