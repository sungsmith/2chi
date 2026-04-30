import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Processor('interview-prep')
export class InterviewPrepsProcessor {
  private readonly logger = new Logger(InterviewPrepsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  @Process('generate-questions')
  async handleGenerateQuestions(job: Job<{ interviewPrepId: string; userId: string; dto: { count?: number; questionTypes?: string[] } }>): Promise<void> {
    const { interviewPrepId, userId, dto } = job.data;
    try {
      const interviewPrep = await this.prisma.interviewPrep.findUnique({
        where: { id: interviewPrepId },
        include: { jobPosting: true },
      });
      if (!interviewPrep) throw new Error('면접준비를 찾을 수 없습니다.');

      const experiences = await this.prisma.experience.findMany({
        where: { userId },
        include: { tags: { include: { tag: true } } },
      });

      const experienceSummaries = experiences.map((e) =>
        `${e.title}: ${e.action ?? ''} ${e.result ?? ''}`.trim(),
      );

      const jobTitle = interviewPrep.jobPosting?.title ?? interviewPrep.title;
      const jobDescription = interviewPrep.jobPosting?.requirements ?? interviewPrep.jobPosting?.rawText ?? '';

      const questions = await this.ai.generateInterviewQuestions(
        jobTitle,
        jobDescription,
        experienceSummaries,
        dto.count ?? 10,
        dto.questionTypes,
      );

      await this.prisma.interviewAnswer.createMany({
        data: questions.map((q) => ({
          interviewPrepId,
          question: q.question,
          questionType: q.questionType as QuestionType,
          order: q.order,
        })),
      });
    } catch (err) {
      this.logger.error(`Job ${job.id} (generate-questions) failed: ${(err as Error).message}`, (err as Error).stack);
      throw err;
    }
  }

  @Process('generate-feedback')
  async handleGenerateFeedback(job: Job<{ interviewPrepId: string; answerId: string; userId: string }>): Promise<void> {
    const { answerId } = job.data;
    try {
      const answer = await this.prisma.interviewAnswer.findUnique({
        where: { id: answerId },
      });
      if (!answer) throw new Error('답변을 찾을 수 없습니다.');
      if (!answer.userAnswer) throw new Error('답변 내용이 없습니다.');

      const { feedback, score } = await this.ai.generateInterviewFeedback(
        answer.question,
        answer.questionType,
        answer.userAnswer,
      );

      await this.prisma.interviewAnswer.update({
        where: { id: answerId },
        data: { aiFeedback: feedback, score },
      });
    } catch (err) {
      this.logger.error(`Job ${job.id} (generate-feedback) failed: ${(err as Error).message}`, (err as Error).stack);
      throw err;
    }
  }
}
