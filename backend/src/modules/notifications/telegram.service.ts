import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { PrismaService } from '../../prisma/prisma.service';

const WEEKDAYS_UZ = [
  '',
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
  'Yakshanba',
];

/** "010:15" -> "10:15", "8:5" -> "08:05" */
function normTime(t?: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hh = String(parseInt(h, 10) || 0).padStart(2, '0');
  const mm = String(parseInt(m ?? '0', 10) || 0).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Ismdan "(ustoz)" qo'shimchasini olib tashlaydi */
function stripUstoz(s: string): string {
  return s.replace(/\s*\(ustoz\)\s*$/i, '').trim();
}

const SCHEDULE_BTN = '📅 Dars jadvali';
/** Ulangandan keyin doimiy menyu tugmasi */
const MENU_KEYBOARD = {
  keyboard: [[{ text: SCHEDULE_BTN }]],
  resize_keyboard: true,
};

/**
 * Telegram bot — ota-ona/o'quvchini telefon orqali bog'laydi, xabar yuboradi va
 * farzand(lar) dars jadvalini ko'rsatadi.
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
    // Handlerdagi kutilmagan xatolar botni yiqitmasin
    this.bot.catch((err: any) =>
      this.logger.error('Telegram handler xatosi', err as Error),
    );

    this.bot.start(async (ctx: any) => {
      // Allaqachon ulangan bo'lsa — menyuni ko'rsatamiz
      const link = await this.prisma.telegramLink.findFirst({
        where: { chatId: String(ctx.chat.id) },
      });
      if (link) {
        return ctx.reply(
          'Xush kelibsiz! 👋\n\nFarzandingiz haftalik dars jadvalini olish uchun quyidagi tugmani bosing 👇',
          { reply_markup: MENU_KEYBOARD },
        );
      }
      return ctx.reply(
        '🎓 Sulton School — rasmiy bot\n\n' +
          'Assalomu alaykum! Ushbu bot orqali maktabdan barcha ma’lumotlar sizga yetkaziladi:\n\n' +
          '🔑 Kabinet login va parol\n' +
          '📅 Farzandingiz dars jadvali\n' +
          '💳 To’lovlar va qarzdorlik\n' +
          '📢 E’lonlar va bildirishnomalar\n\n' +
          'Botga ulanish uchun telefon raqamingizni ulashing 👇',
        {
          reply_markup: {
            keyboard: [[{ text: '📱 Telefonni ulashish', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      );
    });

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
          `🔗 Kirish: ${loginUrl}\n\n` +
          `Farzandingiz dars jadvalini olish uchun «${SCHEDULE_BTN}» tugmasini bosing 👇`,
        { reply_markup: MENU_KEYBOARD },
      );
    });

    // Dars jadvali — tugma yoki /jadval buyrug'i
    this.bot.hears(SCHEDULE_BTN, (ctx: any) => this.handleScheduleRequest(ctx));
    this.bot.command('jadval', (ctx: any) => this.handleScheduleRequest(ctx));

    // Farzand tanlangach — uning jadvalini yuboramiz
    this.bot.action(/^sched:(.+)$/, async (ctx: any) => {
      const studentId: string = ctx.match[1];
      const link = await this.prisma.telegramLink.findFirst({
        where: { chatId: String(ctx.chat.id) },
      });
      await ctx.answerCbQuery().catch(() => undefined);
      if (!link) {
        return ctx.reply('Avval telefon raqamingizni ulang — /start');
      }
      const students = await this.getStudentsForUser(link.userId);
      const student = students.find((s) => s.id === studentId);
      if (!student) {
        return ctx.reply('Bu o‘quvchi sizga biriktirilmagan.');
      }
      return this.sendChildSchedule(ctx, student);
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

    // "/" menyu buyruqlari — reply-keyboard holatidan qat'i nazar doim ko'rinadi
    this.bot.telegram
      .setMyCommands([
        { command: 'start', description: 'Boshlash / botga ulanish' },
        { command: 'jadval', description: '📅 Farzand dars jadvali' },
      ])
      .catch(() => undefined);

    // Polling'ni ishga tushirish
    this.bot.launch().catch((e) => this.logger.error('Bot launch xatosi', e as Error));
  }

  // ===== Dars jadvali oqimi =====

  /** Tugma/buyruq bosilganda — 1 farzand bo'lsa to'g'ridan-to'g'ri, 2+ bo'lsa tanlash */
  private async handleScheduleRequest(ctx: any) {
    const link = await this.prisma.telegramLink.findFirst({
      where: { chatId: String(ctx.chat.id) },
    });
    if (!link) {
      return ctx.reply('Avval telefon raqamingizni ulang — /start');
    }
    const students = await this.getStudentsForUser(link.userId);
    if (students.length === 0) {
      return ctx.reply('Sizga biriktirilgan farzand topilmadi. Administrator bilan bog‘laning.');
    }
    if (students.length === 1) {
      return this.sendChildSchedule(ctx, students[0]);
    }
    const inline_keyboard = students.map((s) => [
      {
        text: `${s.lastName} ${s.firstName}${s.class ? ` — ${s.class.name}` : ''}`,
        callback_data: `sched:${s.id}`,
      },
    ]);
    return ctx.reply('Qaysi farzandingiz uchun dars jadvali kerak?', {
      reply_markup: { inline_keyboard },
    });
  }

  /**
   * Foydalanuvchining o'quvchilari: vasiy sifatidagi farzandlari + (agar o'zi
   * o'quvchi bo'lsa) o'zi. Aka-uka farzandlar har xil Guardian yozuvida bo'lishi
   * mumkin (addGuardian har o'quvchiga alohida yozuv yaratadi), shuning uchun
   * userId bilan bir qatorda telefon bo'yicha ham qidiramiz.
   */
  private async getStudentsForUser(userId: string) {
    const studentSelect = {
      id: true,
      firstName: true,
      lastName: true,
      classId: true,
      class: { select: { id: true, name: true } },
    };
    const out = new Map<
      string,
      {
        id: string;
        firstName: string;
        lastName: string;
        classId: string | null;
        class: { id: string; name: string } | null;
      }
    >();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    const phoneTail = user?.phone ? user.phone.replace(/\D/g, '').slice(-9) : null;

    const guardians = await this.prisma.guardian.findMany({
      where: {
        OR: [
          { userId },
          ...(phoneTail ? [{ phone: { contains: phoneTail } }] : []),
        ],
      },
      include: { students: { include: { student: { select: studentSelect } } } },
    });
    for (const g of guardians) {
      for (const sg of g.students) out.set(sg.student.id, sg.student);
    }

    // Foydalanuvchining o'zi o'quvchi bo'lsa
    const self = await this.prisma.student.findFirst({
      where: { userId },
      select: studentSelect,
    });
    if (self) out.set(self.id, self);

    return [...out.values()];
  }

  private async sendChildSchedule(ctx: any, student: {
    id: string;
    firstName: string;
    lastName: string;
    classId: string | null;
    class: { id: string; name: string } | null;
  }) {
    if (!student.classId || !student.class) {
      return ctx.reply(
        `${student.lastName} ${student.firstName} hali sinfga biriktirilmagan.`,
        { reply_markup: MENU_KEYBOARD },
      );
    }
    const text = await this.buildScheduleText(
      student.classId,
      student.class.name,
      `${student.lastName} ${student.firstName}`,
    );
    return ctx.reply(text, { reply_markup: MENU_KEYBOARD });
  }

  /** Sinf bo'yicha haftalik jadvalni matn ko'rinishida tayyorlaydi */
  private async buildScheduleText(classId: string, className: string, studentName: string) {
    const rows = await this.prisma.schedule.findMany({
      where: { classId },
      include: { subject: { select: { name: true } } },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });

    let text = `👦 ${studentName}\n🏫 ${className} — haftalik dars jadvali`;
    if (rows.length === 0) {
      return text + '\n\nHozircha dars jadvali kiritilmagan.';
    }

    // Ustoz ismlari
    const teacherIds = [...new Set(rows.map((r) => r.teacherId).filter(Boolean))] as string[];
    const tUsers = teacherIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: teacherIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const tName = new Map(tUsers.map((u) => [u.id, stripUstoz(u.fullName)]));

    let printedDays = 0;
    for (let wd = 1; wd <= 6; wd++) {
      // normTime bo'yicha saralaymiz — saqlangan qiymat nol bilan to'ldirilmagan bo'lsa ham to'g'ri tartib
      const day = rows
        .filter((r) => r.weekday === wd)
        .sort((a, b) => normTime(a.startTime).localeCompare(normTime(b.startTime)));
      if (day.length === 0) continue;
      printedDays += 1;
      text += `\n\n🗓 ${WEEKDAYS_UZ[wd]}`;
      day.forEach((r, i) => {
        const teacher = r.teacherId ? tName.get(r.teacherId) : null;
        text +=
          `\n${i + 1}. ${normTime(r.startTime)}–${normTime(r.endTime)} · ${r.subject.name}` +
          (teacher ? ` · ${teacher}` : '');
      });
    }
    if (printedDays === 0) {
      return text + '\n\nHozircha dars jadvali kiritilmagan.';
    }
    return text;
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
