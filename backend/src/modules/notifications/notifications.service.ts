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

  /** O'quvchining barcha vasiylariga xabar (xatolar bloklamaydi) */
  async notifyGuardians(studentId: string, title: string, body: string) {
    try {
      const links = await this.prisma.studentGuardian.findMany({
        where: { studentId },
        include: {
          guardian: { include: { user: { include: { telegramLink: true } } } },
        },
      });

      for (const sg of links) {
        const g = sg.guardian;
        if (g.user?.telegramLink) {
          const ok = await this.telegram.send(
            g.user.telegramLink.chatId,
            `${title}\n${body}`,
          );
          await this.record(g.user.id, 'TELEGRAM', title, body, ok);
        } else if (g.phone) {
          const ok = await this.sms.send(g.phone, `${title}: ${body}`);
          await this.record(g.user?.id ?? null, 'SMS', title, body, ok);
        }
      }
    } catch (e) {
      this.logger.error('notifyGuardians xatosi', e as Error);
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
