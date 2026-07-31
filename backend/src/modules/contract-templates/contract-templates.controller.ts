import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  ContractTemplatesService,
  UploadedDocx,
} from './contract-templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('contract-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('contract-templates')
export class ContractTemplatesController {
  constructor(private readonly service: ContractTemplatesService) {}

  // Statik yo'llar :id dan oldin turishi shart
  @Get('placeholders')
  @Permissions('contracts.view')
  placeholders() {
    return this.service.placeholders();
  }

  @Get()
  @Permissions('contracts.view')
  list() {
    return this.service.list();
  }

  @Post('upload')
  @Permissions('contracts.create')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  upload(
    @UploadedFile() file: UploadedDocx,
    @Body('name') name?: string,
  ) {
    return this.service.uploadDocx(name, file);
  }

  @Post()
  @Permissions('contracts.create')
  create(@Body() body: { name: string; html: string }) {
    return this.service.create(body);
  }

  @Get(':id')
  @Permissions('contracts.view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Permissions('contracts.update')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; html?: string },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Permissions('contracts.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // Shablon bo'yicha shartnomaga PDF
  @Get(':id/pdf/:contractId')
  @Permissions('contracts.view')
  async pdf(
    @Param('id') id: string,
    @Param('contractId') contractId: string,
    @Res() res: Response,
  ) {
    const { buffer, number } = await this.service.pdfForContract(id, contractId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${number}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
