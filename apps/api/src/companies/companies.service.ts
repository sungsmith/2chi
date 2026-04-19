import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AnalyzeCompanyDto } from './dto/analyze-company.dto';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.company.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('기업 정보를 찾을 수 없습니다.');
    if (company.userId !== userId) throw new ForbiddenException();
    return company;
  }

  async analyzeAndUpsert(userId: string, dto: AnalyzeCompanyDto) {
    const existing = await this.prisma.company.findFirst({
      where: { userId, name: dto.name },
    });

    if (existing?.analyzedAt) {
      const age = Date.now() - new Date(existing.analyzedAt).getTime();
      if (age < CACHE_TTL_MS) return existing;
    }

    const analysis = await this.aiService.analyzeCompany(
      dto.name,
      dto.jobTitle,
      dto.additionalContext,
    );

    if (existing) {
      return this.prisma.company.update({
        where: { id: existing.id },
        data: {
          officialInfo: {
            summary: analysis.summary,
            products: analysis.products,
            recentNews: analysis.recentNews,
          },
          keyCompetencies: analysis.keyCompetencies,
          analyzedAt: new Date(),
        },
      });
    }

    return this.prisma.company.create({
      data: {
        userId,
        name: dto.name,
        officialInfo: {
          summary: analysis.summary,
          products: analysis.products,
          recentNews: analysis.recentNews,
        },
        keyCompetencies: analysis.keyCompetencies,
        analyzedAt: new Date(),
      },
    });
  }
}
