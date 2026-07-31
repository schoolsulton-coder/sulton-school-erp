import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';

/**
 * Umumiy PDF generatsiya servisi (shartnoma, vedomost va boshqalar uchun).
 * @Global PdfModule orqali butun ilovada mavjud.
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async fromHtml(
    html: string,
    opts?: { javascript?: boolean },
  ): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      // VPS'da tizim Chromium'i o'rnatilgan bo'lsa — PUPPETEER_EXECUTABLE_PATH orqali
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // kichik /dev/shm — Chrome crash bo'lmasin
        '--disable-gpu',
      ],
    });
    try {
      const page = await browser.newPage();
      // Foydalanuvchi (xodim) yaratgan shablon HTML uchun JS o'chiriladi —
      // server tomonda skript ishga tushmasin (himoya).
      if (opts?.javascript === false) await page.setJavaScriptEnabled(false);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      return Buffer.from(pdf);
    } catch (e) {
      this.logger.error('PDF generatsiya xatosi', e as Error);
      throw e;
    } finally {
      await browser.close();
    }
  }
}
