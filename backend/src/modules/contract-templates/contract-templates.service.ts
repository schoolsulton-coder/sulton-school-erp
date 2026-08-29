import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as mammoth from 'mammoth';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../../common/pdf/pdf.service';
import { buildTokens, fillPlaceholders, PLACEHOLDERS } from './tokens';
import { buildHrTokens, HR_PLACEHOLDERS } from './hr-tokens';

export interface UploadedDocx {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
  size?: number;
}

// Shartnoma ma'lumotlari — buildTokens uchun kerakli include
const CONTRACT_INCLUDE = {
  student: {
    include: {
      guardians: { include: { guardian: true } },
      class: { select: { name: true, academicYear: true } },
      branch: { select: { name: true } },
    },
  },
  installments: { orderBy: { dueDate: 'asc' as const } },
};

// Kadrlar shartnomasi — buildHrTokens uchun kerakli include
const HR_CONTRACT_INCLUDE = {
  employee: {
    include: {
      user: { select: { fullName: true, phone: true } },
      position: { select: { name: true } },
      department: { select: { name: true } },
      branch: { select: { name: true } },
    },
  },
  branch: { select: { name: true } },
};

@Injectable()
export class ContractTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: PdfService,
  ) {}

  placeholders(kind?: string) {
    return kind === 'HR' ? HR_PLACEHOLDERS : PLACEHOLDERS;
  }

  list(kind?: string) {
    return this.prisma.contractTemplate.findMany({
      where: kind ? { kind } : undefined,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, kind: true, createdAt: true, updatedAt: true },
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.contractTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Shablon topilmadi');
    return t;
  }

  create(data: { name: string; html: string; kind?: string }) {
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('Nom kiritilishi shart');
    return this.prisma.contractTemplate.create({
      data: { name, html: data.html ?? '', kind: data.kind === 'HR' ? 'HR' : 'STUDENT' },
    });
  }

  async uploadDocx(name: string | undefined, file?: UploadedDocx, kind?: string) {
    if (!file?.buffer?.length) throw new BadRequestException('Fayl topilmadi');
    const isDocx =
      /\.docx$/i.test(file.originalname || '') ||
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (!isDocx) throw new BadRequestException('Faqat .docx fayl yuklang');

    let html = '';
    try {
      const result = await mammoth.convertToHtml({ buffer: file.buffer });
      html = result.value ?? '';
    } catch {
      throw new BadRequestException(
        "Fayl o'qilmadi. To'g'ri .docx ekanini tekshiring",
      );
    }

    const nm =
      name?.trim() ||
      (file.originalname || '').replace(/\.docx$/i, '').trim() ||
      'Shablon';
    return this.prisma.contractTemplate.create({
      data: { name: nm, html, kind: kind === 'HR' ? 'HR' : 'STUDENT' },
    });
  }

  async update(id: string, data: { name?: string; html?: string }) {
    await this.findOne(id);
    const patch: { name?: string; html?: string } = {};
    if (data.name !== undefined) {
      const nm = data.name.trim();
      if (!nm) throw new BadRequestException("Nom bo'sh bo'lmasin");
      patch.name = nm;
    }
    if (data.html !== undefined) patch.html = data.html;
    return this.prisma.contractTemplate.update({ where: { id }, data: patch });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.contractTemplate.delete({ where: { id } });
    return { ok: true };
  }

  // ===== Shartnomaga to'ldirilgan HTML / PDF =====
  private async getContract(contractId: string) {
    const c = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: CONTRACT_INCLUDE,
    });
    if (!c) throw new NotFoundException('Shartnoma topilmadi');
    return c;
  }

  private wrapHtml(inner: string): string {
    return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><style>
      * { font-family: 'DejaVu Sans', Arial, sans-serif; box-sizing: border-box; }
      body { color:#111827; font-size:13px; line-height:1.6; margin:0; }
      h1 { font-size:18px; text-align:center; margin:0 0 8px; }
      h2 { font-size:15px; margin:14px 0 6px; }
      h3 { font-size:13px; margin:12px 0 4px; }
      p { margin:6px 0; }
      /* Word (DOCX) jadval chegaralari mammoth tomonidan tashlanadi — tiklaymiz */
      table { border-collapse:collapse; width:100%; margin:8px 0; }
      td, th { vertical-align:top; border:1px solid #444; padding:4px 8px; }
      img { max-width:100%; }
      ul, ol { margin:6px 0; padding-left:22px; }
    </style></head><body>${inner}</body></html>`;
  }

  /** Real shartnoma ma'lumotlari bilan to'ldirilgan to'liq HTML */
  async renderForContract(templateId: string, contractId: string): Promise<string> {
    const [tpl, contract] = await Promise.all([
      this.findOne(templateId),
      this.getContract(contractId),
    ]);
    const filled = fillPlaceholders(tpl.html, buildTokens(contract));
    return this.wrapHtml(filled);
  }

  async pdfForContract(
    templateId: string,
    contractId: string,
  ): Promise<{ buffer: Buffer; number: string }> {
    const contract = await this.getContract(contractId);
    const tpl = await this.findOne(templateId);
    const filled = fillPlaceholders(tpl.html, buildTokens(contract));
    const buffer = await this.pdf.fromHtml(this.wrapHtml(filled), {
      javascript: false,
    });
    return { buffer, number: contract.number };
  }

  // ===== Kadrlar hujjati (buyruq / mehnat shartnomasi) =====
  private async getHrContract(contractId: string) {
    const c = await this.prisma.employmentContract.findUnique({
      where: { id: contractId },
      include: HR_CONTRACT_INCLUDE,
    });
    if (!c) throw new NotFoundException('Kadrlar shartnomasi topilmadi');
    return c;
  }

  /** Xodim ma'lumotlari bilan to'ldirilgan to'liq HTML */
  async renderForEmployment(templateId: string, contractId: string): Promise<string> {
    const [tpl, contract] = await Promise.all([
      this.findOne(templateId),
      this.getHrContract(contractId),
    ]);
    return this.wrapHtml(fillPlaceholders(tpl.html, buildHrTokens(contract)));
  }

  async pdfForEmployment(
    templateId: string,
    contractId: string,
  ): Promise<{ buffer: Buffer; number: string }> {
    const contract = await this.getHrContract(contractId);
    const tpl = await this.findOne(templateId);
    const filled = fillPlaceholders(tpl.html, buildHrTokens(contract));
    const buffer = await this.pdf.fromHtml(this.wrapHtml(filled), {
      javascript: false,
    });
    const num = contract.number && contract.number !== '—' ? contract.number : 'hujjat';
    return { buffer, number: num.replace(/[\\/:*?"<>|]/g, '-') };
  }
}
