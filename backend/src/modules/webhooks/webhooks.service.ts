import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Ijtimoiy tarmoq (Instagram Direct) xabarlaridan CRM lead yaratadi.
 * Meta (Facebook) Business API webhook orqali ishlaydi.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  /** X-Hub-Signature-256 (HMAC-SHA256, app secret) ni tekshiradi */
  verifySignature(rawBody: Buffer | undefined, signature?: string): boolean {
    const secret = process.env.META_APP_SECRET;
    if (!secret) {
      // Secret sozlanmagan — dastlabki sinov uchun o'tkazamiz (loglar bilan)
      this.logger.warn('META_APP_SECRET yo‘q — imzo tekshirilmadi');
      return true;
    }
    if (!rawBody || !signature) return false;
    const expected =
      'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  /** Instagram webhook body'sini qayta ishlaydi */
  async handleInstagram(body: any) {
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const events = entry.messaging ?? entry.changes ?? [];
      for (const ev of events) {
        const msg = ev.message;
        // Faqat foydalanuvchidan kelgan matnli xabar (echo/emas)
        if (!msg || msg.is_echo || !msg.text) continue;
        const senderId: string = ev.sender?.id;
        if (!senderId) continue;
        await this.createOrAppendLead(senderId, msg.text);
      }
    }
  }

  private async createOrAppendLead(senderId: string, text: string) {
    const handle = `ig:${senderId}`;
    // (ixtiyoriy) Graph API orqali ism/username olish
    const profile = await this.fetchProfile(senderId);
    const displayHandle = profile?.username ? `@${profile.username}` : handle;
    const fullName = profile?.name || profile?.username || 'Instagram foydalanuvchisi';

    // Dedup: shu foydalanuvchidan ochiq lead bo'lsa — xabarni qo'shamiz
    const existing = await this.prisma.lead.findFirst({
      where: {
        source: 'Instagram Direct',
        phone: { in: [handle, displayHandle] },
        convertedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      await this.prisma.lead.update({
        where: { id: existing.id },
        data: {
          note: `${existing.note ? existing.note + '\n' : ''}${text}`.slice(0, 4000),
          crmUpdatedAt: new Date(),
        },
      });
      this.logger.log(`Instagram lead yangilandi: ${displayHandle}`);
      return;
    }

    const stage = await this.prisma.leadStage.findFirst({ orderBy: { order: 'asc' } });
    if (!stage) {
      this.logger.error('Lead bosqichlari yo‘q — seed ishga tushiring');
      return;
    }
    await this.prisma.lead.create({
      data: {
        fullName,
        phone: displayHandle,
        source: 'Instagram Direct',
        note: text.slice(0, 4000),
        stageId: stage.id,
        crmUpdatedAt: new Date(),
      },
    });
    this.logger.log(`Instagram'dan yangi lead: ${displayHandle}`);
  }

  /** IG profil (ism/username) — IG_PAGE_TOKEN sozlangan bo'lsa */
  private async fetchProfile(igUserId: string): Promise<{ name?: string; username?: string } | null> {
    const token = process.env.IG_PAGE_TOKEN;
    if (!token) return null;
    try {
      const url = `https://graph.facebook.com/v21.0/${igUserId}?fields=name,username&access_token=${token}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return (await res.json()) as { name?: string; username?: string };
    } catch {
      return null;
    }
  }
}
