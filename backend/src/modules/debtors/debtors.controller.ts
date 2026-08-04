import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DebtorsService } from './debtors.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

type JwtUser = { id: string; role: string };

@ApiTags('debtors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('debtors')
export class DebtorsController {
  constructor(private readonly service: DebtorsService) {}

  @Get()
  @Permissions('contracts.view')
  list() {
    return this.service.list();
  }

  @Get(':studentId/contacts')
  @Permissions('contracts.view')
  contacts(@Param('studentId') studentId: string) {
    return this.service.listContacts(studentId);
  }

  @Post(':studentId/contacts')
  @Permissions('contracts.view')
  addContact(
    @CurrentUser() user: JwtUser,
    @Param('studentId') studentId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.service.addContact(user, studentId, dto);
  }

  @Delete('contacts/:id')
  @Permissions('contracts.view')
  removeContact(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.removeContact(user, id);
  }
}
