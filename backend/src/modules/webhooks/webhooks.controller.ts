import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';

// Meta (Instagram/Facebook) webhook. Autentifikatsiyasiz (Meta imzo bilan kiradi).
@ApiExcludeController()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  // Meta webhook'ни ulashда bir marta chaqiradi (verify).
  @Get('instagram')
  verify(@Query() q: Record<string, string>, @Res() res: Response) {
    const mode = q['hub.mode'];
    const token = q['hub.verify_token'];
    const challenge = q['hub.challenge'];
    if (mode === 'subscribe' && token && token === process.env.META_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // Instagram Direct xabarlari shu yerga keladi.
  @Post('instagram')
  @HttpCode(200)
  async receive(@Req() req: Request & { rawBody?: Buffer }, @Body() body: any) {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    if (!this.service.verifySignature(req.rawBody, signature)) {
      throw new ForbiddenException('Imzo noto‘g‘ri');
    }
    await this.service.handleInstagram(body);
    return { ok: true };
  }
}
