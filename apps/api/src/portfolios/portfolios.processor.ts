import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';

@Processor('portfolio')
export class PortfoliosProcessor {
  private readonly logger = new Logger(PortfoliosProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  @Process('generate-pdf')
  async handleGeneratePdf(job: Job<{ portfolioId: string }>): Promise<void> {
    const { portfolioId } = job.data;
    try {
      const portfolio = await this.prisma.portfolio.findUnique({
        where: { id: portfolioId },
        include: { sections: { orderBy: { order: 'asc' } } },
      });
      if (!portfolio) throw new Error('포트폴리오를 찾을 수 없습니다.');

      const templatePath = path.join(__dirname, 'templates', 'portfolio.template.hbs');
      const templateSource = fs.readFileSync(templatePath, 'utf-8');
      const template = Handlebars.compile(templateSource);

      const sections = portfolio.sections.map((s) => {
        const content = s.content as { title: string; body: string };
        return {
          type: s.sectionType,
          title: content?.title ?? '',
          content: content?.body ?? '',
          order: s.order,
        };
      });

      const html = template({
        title: portfolio.title,
        versionLabel: portfolio.versionLabel,
        sections,
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const chromium = require('@sparticuz/chromium');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const puppeteer = require('puppeteer-core');

      const executablePath = await chromium.executablePath();
      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
      });

      let pdfBuffer: Buffer;
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ format: 'A4', printBackground: true });
        pdfBuffer = Buffer.from(pdf);
      } finally {
        await browser.close();
      }

      const key = `portfolio/${portfolioId}/document.pdf`;
      await this.files.uploadBuffer(pdfBuffer, key, 'application/pdf');

      await this.prisma.portfolio.update({
        where: { id: portfolioId },
        data: { pdfUrl: key },
      });
    } catch (err) {
      this.logger.error(
        `Job ${job.id} (generate-pdf) failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }
}
