import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Telegram bot — ota-ona/o'quvchini telefon orqali bog'laydi va xabar yuboradi.
 * TELEGRAM_BOT_TOKEN bo'lmasa — bot ishga tushmaydi (app baribir ishlaydi).
 */
@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot?: Telegraf;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN yo‘q — Telegram bot o‘chirilgan');
      return;
    }

    this.bot = new Telegraf(token);

    this.bot.start((ctx: any) =>
      ctx.reply(
        'Assalomu alaykum! Sulton School bildirishnomalarini olish uchun telefon raqamingizni ulashing.',
        {
          reply_markup: {
            keyboard: [[{ text: '📱 Telefonni ulashish', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      ),
    );

    this.bot.on('contact', async (ctx: any) => {
      const raw: string = ctx.message.contact.phone_number;
      const digits = raw.replace(/\D/g, '');
      const user = await this.findUserByPhone(digits);
      if (!user) {
        return ctx.reply('Bu raqam tizimda topilmadi. Administrator bilan bog‘laning.');
      }
      await this.prisma.telegramLink.upsert({
        where: { userId: user.id },
        update: { chatId: String(ctx.chat.id), username: ctx.from?.username },
        create: {
          userId: user.id,
          chatId: String(ctx.chat.id),
          username: ctx.from?.username,
        },
      });
      ctx.reply(`✅ Ulandi! Bildirishnomalar shu yerga keladi, ${user.fullName}.`, {
        reply_markup: { remove_keyboard: true },
      });
    });

    this.bot
      .launch()
      .then(() => this.logger.log('🤖 Telegram bot ishga tushdi'))
      .catch((e) => this.logger.error('Bot launch xatosi', e));
  }

  /** Raqamni turli formatda moslashtirib qidiradi (oxirgi 9 raqam bo'yicha) */
  private async findUserByPhone(digits: string) {
    const tail = digits.slice(-9);
    const users = await this.prisma.user.findMany({
      where: { phone: { contains: tail } },
      take: 1,
    });
    return users[0] ?? null;
  }

  async send(chatId: string, text: string): Promise<boolean> {
    if (!this.bot) return false;
    try {
      await this.bot.telegram.sendMessage(chatId, text);
      return true;
    } catch (e) {
      this.logger.error('Telegram send xatosi', e as Error);
      return false;
    }
  }

  isEnabled() {
    return !!this.bot;
  }
}
