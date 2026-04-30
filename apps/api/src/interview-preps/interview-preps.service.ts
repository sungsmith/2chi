import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { InterviewPrepDto, InterviewAnswerDto, InterviewQuestionType } from '@2chi/shared';
import { CreateInterviewPrepDto } from './dto/create-interview-prep.dto';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';

type PrismaInterviewPrep = {
  id: string;
  userId: string;
  jobPostingId: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  answers: PrismaInterviewAnswer[];
};

type PrismaInterviewAnswer = {
  id: string;
  interviewPrepId: string;
  question: string;
  questionType: string;
  userAnswer: string | null;
  aiFeedback: string | null;
  score: number | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class InterviewPrepsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('interview-prep') private readonly queue: Queue,
  ) {}

  async findAll(userId: string): Promise<InterviewPrepDto[]> {
    const items = await this.prisma.interviewPrep.findMany({
      where: { userId },
      include: { answers: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => this.toDto(item as PrismaInterviewPrep));
  }

  async findOne(id: string, userId: string): Promise<InterviewPrepDto> {
    const item = await this.prisma.interviewPrep.findUnique({
      where: { id },
      include: { answers: { orderBy: { order: 'asc' } } },
    });
    if (!item) throw new NotFoundException('면접준비를 찾을 수 없습니다.');
    if (item.userId !== userId) throw new ForbiddenException();
    return this.toDto(item as PrismaInterviewPrep);
  }

  async create(userId: string, dto: CreateInterviewPrepDto): Promise<InterviewPrepDto> {
    const item = await this.prisma.interviewPrep.create({
      data: {
        userId,
        title: dto.title,
        jobPostingId: dto.jobPostingId,
      },
      include: { answers: true },
    });
    return this.toDto(item as PrismaInterviewPrep);
  }

  async remove(id: string, userId: string): Promise<void> {
    const item = await this.prisma.interviewPrep.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('면접준비를 찾을 수 없습니다.');
    if (item.userId !== userId) throw new ForbiddenException();
    await this.prisma.interviewPrep.delete({ where: { id } });
  }

  async generateQuestions(id: string, userId: string, dto: GenerateQuestionsDto): Promise<{ jobId: string }> {
    const item = await this.prisma.interviewPrep.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('면접준비를 찾을 수 없습니다.');
    if (item.userId !== userId) throw new ForbiddenException();
    const job = await this.queue.add('generate-questions', { interviewPrepId: id, userId, dto });
    return { jobId: job.id.toString() };
  }

  async saveAnswer(id: string, answerId: string, userId: string, dto: SaveAnswerDto): Promise<InterviewAnswerDto> {
    const item = await this.prisma.interviewPrep.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('면접준비를 찾을 수 없습니다.');
    if (item.userId !== userId) throw new ForbiddenException();

    const answer = await this.prisma.interviewAnswer.findUnique({ where: { id: answerId } });
    if (!answer || answer.interviewPrepId !== id) throw new NotFoundException('답변을 찾을 수 없습니다.');

    const updated = await this.prisma.interviewAnswer.update({
      where: { id: answerId },
      data: { userAnswer: dto.answer },
    });
    return this.toAnswerDto(updated as PrismaInterviewAnswer);
  }

  async requestFeedback(id: string, answerId: string, userId: string): Promise<{ jobId: string }> {
    const item = await this.prisma.interviewPrep.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('면접준비를 찾을 수 없습니다.');
    if (item.userId !== userId) throw new ForbiddenException();

    const answer = await this.prisma.interviewAnswer.findUnique({ where: { id: answerId } });
    if (!answer || answer.interviewPrepId !== id) throw new NotFoundException('답변을 찾을 수 없습니다.');

    const job = await this.queue.add('generate-feedback', { interviewPrepId: id, answerId, userId });
    return { jobId: job.id.toString() };
  }

  private toDto(item: PrismaInterviewPrep): InterviewPrepDto {
    return {
      id: item.id,
      userId: item.userId,
      jobPostingId: item.jobPostingId,
      title: item.title,
      answers: item.answers.map((a) => this.toAnswerDto(a)),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private toAnswerDto(a: PrismaInterviewAnswer): InterviewAnswerDto {
    return {
      id: a.id,
      interviewPrepId: a.interviewPrepId,
      question: a.question,
      questionType: a.questionType as InterviewQuestionType,
      answer: a.userAnswer ?? '',
      aiFeedback: a.aiFeedback,
      score: a.score,
      order: a.order,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }
}
