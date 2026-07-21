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
  private botUsername?: string;

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
        '🎓 Sulton School — rasmiy bot\n\n' +
          'Assalomu alaykum! Ushbu bot orqali maktabdan barcha ma’lumotlar sizga yetkaziladi:\n\n' +
          '🔑 Kabinet login va parol\n' +
          '💳 To’lovlar va qarzdorlik\n' +
          '📅 Davomat va baholar\n' +
          '📢 E’lonlar va bildirishnomalar\n\n' +
          'Botga ulanish uchun telefon raqamingizni ulashing 👇',
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
        return ctx.reply(
          '❌ Bu raqam tizimda topilmadi.\n\n' +
            'Avval maktab administratori sizga kabinet ochishi kerak. Iltimos, administrator bilan bog’laning.',
          { reply_markup: { remove_keyboard: true } },
        );
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

      const loginUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3005'}/login`;
      await ctx.reply(
        `✅ ${user.fullName}, botga muvaffaqiyatli ulandingiz!\n\n` +
          'Bundan buyon Sulton School’dan barcha bildirishnomalar (to’lovlar, davomat, e’lonlar) shu yerga keladi.\n\n' +
          `🔑 Kabinet login: ${user.phone}\n` +
          `🔗 Kirish: ${loginUrl}`,
        { reply_markup: { remove_keyboard: true } },
      );
    });

    // Token'ni tekshirish va bot @username'ini olish (deep-link uchun).
    // Eslatma: Telegraf'da launch() promise'i bot TO'XTAGANDA resolve bo'ladi,
    // shuning uchun username'ni getMe() orqali alohida olamiz.
    this.bot.telegram
      .getMe()
      .then((me) => {
        this.botUsername = me.username;
        this.logger.log(`🤖 Telegram bot ulandi: @${me.username}`);
      })
      .catch((e) =>
        this.logger.error('Telegram getMe xatosi — token noto‘g‘ri?', e as Error),
      );

    // Polling'ni ishga tushirish
    this.bot.launch().catch((e) => this.logger.error('Bot launch xatosi', e as Error));
  }

  /** Bot @username (deep-link uchun). Bot o'chiq bo'lsa undefined. */
  getBotUsername() {
    return this.botUsername;
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
