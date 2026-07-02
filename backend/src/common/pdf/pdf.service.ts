import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';

/**
 * Umumiy PDF generatsiya servisi (shartnoma, vedomost va boshqalar uchun).
 * @Global PdfModule orqali butun ilovada mavjud.
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async fromHtml(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
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
