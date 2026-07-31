import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramService } from './telegram.service';
import { SmsService } from './sms.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
    private sms: SmsService,
  ) {}

  private record(
    userId: string | null,
    channel: 'TELEGRAM' | 'SMS' | 'PUSH' | 'IN_APP',
    title: string | null,
    body: string,
    ok: boolean,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        channel,
        title,
        body,
        status: ok ? 'SENT' : 'FAILED',
        sentAt: ok ? new Date() : null,
      },
    });
  }

  /** Bitta foydalanuvchiga: Telegram (ulangan bo'lsa) yoki SMS */
  async notifyUser(userId: string, title: string, body: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { telegramLink: true },
    });
    if (!user) return;

    if (user.telegramLink) {
      const ok = await this.telegram.send(user.telegramLink.chatId, `${title}\n${body}`);
      await this.record(userId, 'TELEGRAM', title, body, ok);
    } else {
      const ok = await this.sms.send(user.phone, `${title}: ${body}`);
      await this.record(userId, 'SMS', title, body, ok);
    }
  }

  /**
   * O'quvchining barcha vasiylariga xabar (xatolar bloklamaydi).
   * telegramOnly=true — Telegram ulanmagan vasiyga SMS yuborilmaydi
   * (baho kabi tez-tez keladigan xabarlar uchun — SMS xarajati/spam bo'lmasin).
   */
  async notifyGuardians(
    studentId: string,
    title: string,
    body: string,
    opts?: { telegramOnly?: boolean },
  ) {
    try {
      const links = await this.prisma.studentGuardian.findMany({
        where: { studentId },
        include: {
          guardian: { include: { user: { include: { telegramLink: true } } } },
        },
      });

      const sentChats = new Set<string>();
      for (const sg of links) {
        const g = sg.guardian;
        // chatId ni bot bilan bir xil tarzda topamiz: user linki -> telefon -> username
        const chatId = await this.resolveGuardianChatId(g);
        if (chatId) {
          if (sentChats.has(chatId)) continue; // bir chatga takror yubormaymiz
          sentChats.add(chatId);
          const ok = await this.telegram.send(chatId, `${title}\n${body}`);
          await this.record(g.user?.id ?? null, 'TELEGRAM', title, body, ok);
        } else if (g.phone && !opts?.telegramOnly) {
          const ok = await this.sms.send(g.phone, `${title}: ${body}`);
          await this.record(g.user?.id ?? null, 'SMS', title, body, ok);
        }
      }
    } catch (e) {
      this.logger.error('notifyGuardians xatosi', e as Error);
    }
  }

  /**
   * Vasiyning Telegram chatId'sini topadi — bot ulanish mantiqiga mos:
   *   1) vasiy user'ining o'z telegramLink'i,
   *   2) telefon bo'yicha (bot telefon orqali ulaydi, guardian.userId bo'lmasligi mumkin),
   *   3) telegram username bo'yicha.
   */
  private async resolveGuardianChatId(g: {
    phone?: string | null;
    telegramUsername?: string | null;
    user?: { telegramLink?: { chatId: string } | null } | null;
  }): Promise<string | null> {
    if (g.user?.telegramLink?.chatId) return g.user.telegramLink.chatId;

    const phoneTail = g.phone ? g.phone.replace(/\D/g, '').slice(-9) : null;
    if (phoneTail && phoneTail.length >= 7) {
      const link = await this.prisma.telegramLink.findFirst({
        where: { user: { phone: { contains: phoneTail } } },
        select: { chatId: true },
      });
      if (link?.chatId) return link.chatId;
    }

    if (g.telegramUsername) {
      const uname = g.telegramUsername.replace(/^@/, '');
      const link = await this.prisma.telegramLink.findFirst({
        where: { username: { equals: uname, mode: 'insensitive' } },
        select: { chatId: true },
      });
      if (link?.chatId) return link.chatId;
    }

    return null;
  }

  /**
   * Vasiyga kabinet login ma'lumotlarini (login, parol, kirish havolasi) Telegram
   * bot orqali yuboradi. Bot faqat oldindan /start bosib telefonini ulagan
   * (chatId mavjud) foydalanuvchiga yubora oladi.
   */
  async sendGuardianCredentials(
    guardianId: string,
    creds: { login: string; password: string },
  ): Promise<{ sent: boolean; reason?: string; botLink?: string | null }> {
    try {
      const g = await this.prisma.guardian.findUnique({
        where: { id: guardianId },
        include: { user: { include: { telegramLink: true } } },
      });
      if (!g) return { sent: false, reason: 'not_found' };

      // chatId ni aniqlash: 1) vasiy user'ining o'z linki, 2) username bo'yicha
      let chatId = g.user?.telegramLink?.chatId ?? null;
      if (!chatId && g.telegramUsername) {
        const uname = g.telegramUsername.replace(/^@/, '');
        const link = await this.prisma.telegramLink.findFirst({
          where: { username: { equals: uname, mode: 'insensitive' } },
        });
        chatId = link?.chatId ?? null;
      }

      const loginUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3005'}/login`;
      const text =
        `🔐 Sulton School — shaxsiy kabinet\n\n` +
        `Hurmatli ${g.fullName}, kabinetga kirish uchun ma'lumotlaringiz:\n\n` +
        `👤 Login: ${creds.login}\n` +
        `🔑 Parol: ${creds.password}\n\n` +
        `🔗 Kirish: ${loginUrl}\n\n` +
        `⚠️ Parolni hech kimga bermang.`;

      if (!this.telegram.isEnabled()) {
        return { sent: false, reason: 'bot_disabled', botLink: null };
      }
      if (!chatId) {
        const bot = this.telegram.getBotUsername();
        return {
          sent: false,
          reason: 'not_linked',
          botLink: bot ? `https://t.me/${bot}` : null,
        };
      }

      const ok = await this.telegram.send(chatId, text);
      await this.record(g.user?.id ?? null, 'TELEGRAM', 'Kabinet logini', text, ok);
      return { sent: ok, reason: ok ? undefined : 'send_failed' };
    } catch (e) {
      this.logger.error('sendGuardianCredentials xatosi', e as Error);
      return { sent: false, reason: 'error' };
    }
  }

  listMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  recent() {
    return this.prisma.notification.findMany({
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  status() {
    return {
      telegram: this.telegram.isEnabled(),
      sms: !!process.env.ESKIZ_EMAIL,
    };
  }
}
