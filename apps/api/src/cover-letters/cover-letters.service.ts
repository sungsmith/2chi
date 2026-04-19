import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ExperiencesService } from '../experiences/experiences.service';

@Injectable()
export class CoverLettersService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private experiencesService: ExperiencesService,
  ) {}

  async findOne(id: string, userId: string) {
    const coverLetter = await this.prisma.coverLetter.findUnique({
      where: { id },
      include: { jobPosting: true },
    });
    if (!coverLetter) throw new NotFoundException('자소서를 찾을 수 없습니다.');
    if (coverLetter.userId !== userId) throw new ForbiddenException();
    return coverLetter;
  }

  async calculateMatching(coverLetterId: string, userId: string) {
    const coverLetter = await this.findOne(coverLetterId, userId);
    const requiredCompetencies = (coverLetter.jobPosting as any)?.requiredCompetencies ?? [];

    if (!requiredCompetencies.length) {
      return { score: 0, matchedKeywords: [], missingKeywords: [], summary: '채용공고 역량 정보가 없습니다.' };
    }

    const experiences = await this.experiencesService.findAll(userId);
    const expData = experiences.map((e) => ({
      title: e.title,
      action: e.action,
      result: e.result,
      tags: (e.tags as any[]).map(({ tag }) => tag.name),
    }));

    const result = await this.aiService.calculateMatchingScore(requiredCompetencies, expData);

    await this.prisma.coverLetter.update({
      where: { id: coverLetterId },
      data: { matchingScore: result.score },
    });

    return result;
  }
}
