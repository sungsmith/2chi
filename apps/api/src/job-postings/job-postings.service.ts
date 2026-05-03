import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ParseJobPostingDto } from './dto/parse-job-posting.dto';
import { ScrapeJobPostingDto } from './dto/scrape-job-posting.dto';

@Injectable()
export class JobPostingsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.jobPosting.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const posting = await this.prisma.jobPosting.findUnique({ where: { id } });
    if (!posting) throw new NotFoundException('채용공고를 찾을 수 없습니다.');
    if (posting.userId !== userId) throw new ForbiddenException();
    return posting;
  }

  async delete(id: string, userId: string): Promise<void> {
    const posting = await this.prisma.jobPosting.findUnique({ where: { id } });
    if (!posting) throw new NotFoundException('채용공고를 찾을 수 없습니다.');
    if (posting.userId !== userId) throw new ForbiddenException();
    await this.prisma.jobPosting.delete({ where: { id } });
  }

  async parseAndCreate(userId: string, dto: ParseJobPostingDto) {
    const parsed = await this.aiService.parseJobPostingFromHtml(dto.text);

    const company = await this.upsertCompany(userId, parsed.company);

    return this.prisma.jobPosting.create({
      data: {
        userId,
        companyId: company?.id ?? null,
        url: dto.url ?? null,
        title: parsed.title,
        rawText: parsed.rawText,
        requiredCompetencies: parsed.requiredCompetencies,
        preferredCompetencies: parsed.preferredCompetencies,
        parsedAt: new Date(),
      },
    });
  }

  private isPrivateHost(hostname: string): boolean {
    // loopback
    if (hostname === 'localhost' || hostname === '::1') return true;
    // IPv4 private ranges: 10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x (link-local)
    const privateRanges = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
    ];
    return privateRanges.some((re) => re.test(hostname));
  }

  async scrapeAndCreate(userId: string, dto: ScrapeJobPostingDto) {
    // SSRF 방지: 내부 네트워크 주소 차단
    try {
      const parsed = new URL(dto.url);
      if (this.isPrivateHost(parsed.hostname)) {
        throw new BadRequestException('허용되지 않는 URL입니다.');
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('올바른 URL을 입력하세요.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let html: string;
    try {
      const response = await fetch(dto.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 2chi-bot/1.0)' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      html = await response.text();
    } catch {
      throw new BadRequestException('해당 URL의 채용공고를 가져올 수 없습니다.');
    } finally {
      clearTimeout(timeoutId);
    }

    const parsed = await this.aiService.parseJobPostingFromHtml(html);

    const company = await this.upsertCompany(userId, parsed.company);

    return this.prisma.jobPosting.create({
      data: {
        userId,
        companyId: company?.id ?? null,
        url: dto.url,
        title: parsed.title,
        rawText: parsed.rawText,
        requiredCompetencies: parsed.requiredCompetencies,
        preferredCompetencies: parsed.preferredCompetencies,
        parsedAt: new Date(),
      },
    });
  }

  private async upsertCompany(userId: string, companyName: string) {
    if (!companyName) return null;
    const existing = await this.prisma.company.findFirst({
      where: { userId, name: companyName },
    });
    if (existing) return existing;
    return this.prisma.company.create({
      data: { userId, name: companyName },
    });
  }
}
