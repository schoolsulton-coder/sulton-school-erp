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

  /**
   * X-Hub-Signature-256 (HMAC-SHA256, app secret) ni tekshiradi.
   * Instagram Login turidagi app webhook'ni Instagram app secret bilan imzolaydi,
   * Facebook Login turi esa Facebook app secret bilan — shu sabab ikkalasini ham
   * qabul qilamiz (qaysi biri mos kelsa — o'tadi).
   */
  verifySignature(rawBody: Buffer | undefined, signature?: string): boolean {
    const secrets = [
      process.env.META_APP_SECRET,
      process.env.IG_APP_SECRET,
    ].filter((s): s is string => !!s);

    if (secrets.length === 0) {
      // Secret sozlanmagan — dastlabki sinov uchun o'tkazamiz (loglar bilan)
      this.logger.warn('META_APP_SECRET/IG_APP_SECRET yo‘q — imzo tekshirilmadi');
      return true;
    }
    if (!rawBody || !signature) return false;

    for (const secret of secrets) {
      const expected =
        'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      // timingSafeEqual uzunlik mos kelmasa xato beradi — oldindan tekshiramiz
      if (signature.length !== expected.length) continue;
      try {
        if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
          return true;
        }
      } catch {
        // keyingi secretni sinaymiz
      }
    }
    return false;
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
        await this.createOrAppendLead(senderId, msg.text, msg.mid);
      }
    }
  }

  private async createOrAppendLead(senderId: string, text: string, mid?: string) {
    const externalId = `ig:${senderId}`;
    const msg = text.slice(0, 4000);
    const phone = this.extractPhone(text); // xabardan telefon (bo'lmasa null)

    // Bir xil xabar (mid) qayta kelsa — o'tkazamiz (Meta ba'zan qayta yuboradi)
    if (mid) {
      const dup = await this.prisma.leadMessage.findUnique({
        where: { externalId: mid },
      });
      if (dup) {
        this.logger.log(`Instagram xabar allaqachon mavjud (mid): ${mid}`);
        return;
      }
    }

    // Bir vaqtda kelgan bir xil xabar (poyga) unique (externalId) bilan bloklanadi —
    // P2002 ni "allaqachon saqlangan" deb qabul qilamiz (500 va Meta qayta-yuborish tsikli bo'lmasin)
    try {
      // Dedup: aynan shu Instagram foydalanuvchisi bo'yicha (externalId — unique)
      const existing = await this.prisma.lead.findUnique({ where: { externalId } });
      if (existing) {
        await this.prisma.$transaction([
          this.prisma.leadMessage.create({
            data: { leadId: existing.id, direction: 'IN', text: msg, externalId: mid ?? null },
          }),
          this.prisma.lead.update({
            where: { id: existing.id },
            data: {
              crmUpdatedAt: new Date(),
              // telefon topilsa va hali bo'sh bo'lsa — vasiy telefoniga yozamiz
              ...(phone && !existing.phone ? { phone } : {}),
            },
          }),
        ]);
        this.logger.log(`Instagram lead yangilandi: ${externalId}`);
        return;
      }

      // (ixtiyoriy) Graph API orqali ism/username olish
      const profile = await this.fetchProfile(senderId);
      const username = profile?.username ?? null;
      const igName = profile?.name || profile?.username || 'Instagram foydalanuvchisi';

      // Yangi Instagram lead — "Tasdiqlanmagan" bosqichiga tushadi
      const stage = await this.unconfirmedStage();
      if (!stage) {
        this.logger.error('Lead bosqichlari yo‘q — seed ishga tushiring');
        return;
      }
      await this.prisma.lead.create({
        data: {
          fullName: igName, // talaba ismi (operator suhbat davomida to'g'rilaydi)
          phone: phone ?? '', // vasiy telefoni (xabardan topilsa)
          igUsername: username,
          source: 'Instagram Direct',
          externalId,
          stageId: stage.id,
          crmUpdatedAt: new Date(),
          messages: { create: { direction: 'IN', text: msg, externalId: mid ?? null } },
        },
      });
      this.logger.log(`Instagram'dan yangi lead: ${username ? '@' + username : externalId}`);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        this.logger.log(`Instagram xabar allaqachon saqlangan (poyga, P2002): ${mid ?? externalId}`);
        return;
      }
      throw e;
    }
  }

  /** "Tasdiqlanmagan" bosqichi (IG/Sayt leadlar shu yerga) — topilmasa birinchi bosqich */
  private async unconfirmedStage() {
    return (
      (await this.prisma.leadStage.findFirst({
        where: { name: { contains: 'Tasdiq', mode: 'insensitive' } },
      })) ??
      (await this.prisma.leadStage.findFirst({ orderBy: { order: 'asc' } }))
    );
  }

  /** Xabar matnidan O'zbek telefon raqamini ajratadi (+998XXXXXXXXX yoki 9 xonali) */
  private extractPhone(text: string): string | null {
    const matches = text.match(/[+(]?\d[\d\s()\-]{6,}/g) || [];
    for (const m of matches) {
      const digits = m.replace(/\D/g, '');
      if (digits.length === 12 && digits.startsWith('998')) return '+' + digits;
      if (digits.length === 9) return '+998' + digits; // mahalliy 9 xonali
    }
    return null;
  }

  /**
   * IG foydalanuvchi profili (ism/username) — IG_PAGE_TOKEN sozlangan bo'lsa.
   * Instagram Login (IGAA...) tokeni graph.instagram.com bilan ishlaydi.
   * Xato bo'lsa null qaytadi — lead baribir yaratiladi (faqat @username bo'lmaydi).
   */
  private async fetchProfile(igUserId: string): Promise<{ name?: string; username?: string } | null> {
    const token = process.env.IG_PAGE_TOKEN;
    if (!token) return null;
    try {
      const url = `https://graph.instagram.com/v21.0/${igUserId}?fields=name,username&access_token=${token}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return (await res.json()) as { name?: string; username?: string };
    } catch {
      return null;
    }
  }
}
