import { Injectable, Logger } from '@nestjs/common';

/**
 * SMS yuborish — Eskiz.uz orqali.
 * ESKIZ_EMAIL / ESKIZ_PASSWORD bo'lmasa — log qilinadi, lekin xato bermaydi.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private token?: string;
  private readonly base = 'https://notify.eskiz.uz/api';

  private get enabled() {
    return !!process.env.ESKIZ_EMAIL && !!process.env.ESKIZ_PASSWORD;
  }

  private async auth(): Promise<string | null> {
    if (!this.enabled) return null;
    if (this.token) return this.token;
    try {
      const body = new URLSearchParams({
        email: process.env.ESKIZ_EMAIL!,
        password: process.env.ESKIZ_PASSWORD!,
      });
      const res = await fetch(`${this.base}/auth/login`, { method: 'POST', body });
      const json: any = await res.json();
      this.token = json?.data?.token;
      return this.token ?? null;
    } catch (e) {
      this.logger.error('Eskiz auth xatosi', e as Error);
      return null;
    }
  }

  async send(phone: string, message: string): Promise<boolean> {
    const mobile = phone.replace(/\D/g, ''); // 998901234567
    if (!this.enabled) {
      this.logger.log(`[SMS o'chirilgan] ${mobile}: ${message}`);
      return false;
    }
    const token = await this.auth();
    if (!token) return false;
    try {
      const body = new URLSearchParams({
        mobile_phone: mobile,
        message,
        from: process.env.ESKIZ_FROM ?? '4546',
      });
      const res = await fetch(`${this.base}/message/sms/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      return res.ok;
    } catch (e) {
      this.logger.error('SMS send xatosi', e as Error);
      return false;
    }
  }
}
