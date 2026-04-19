import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AddStageDto } from './dto/add-stage.dto';
import { ApplicationStage, ApplicationResult } from '@prisma/client';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.application.findMany({
      where: { userId },
      include: {
        stages: { orderBy: { createdAt: 'asc' } },
        company: { select: { id: true, name: true } },
        jobPosting: { select: { id: true, title: true, deadline: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { createdAt: 'asc' } },
        company: { select: { id: true, name: true } },
        jobPosting: { select: { id: true, title: true, deadline: true } },
      },
    });
    if (!app) throw new NotFoundException('지원 현황을 찾을 수 없습니다.');
    if (app.userId !== userId) throw new ForbiddenException();
    return app;
  }

  async create(userId: string, dto: CreateApplicationDto) {
    const { appliedAt, currentStage, ...rest } = dto;
    const app = await this.prisma.application.create({
      data: {
        ...rest,
        userId,
        appliedAt: appliedAt ? new Date(appliedAt) : undefined,
        currentStage: (currentStage ?? 'DOCUMENT') as ApplicationStage,
      },
      include: {
        stages: true,
        company: { select: { id: true, name: true } },
        jobPosting: { select: { id: true, title: true, deadline: true } },
      },
    });

    if (app.jobPosting?.deadline) {
      await this.prisma.calendarEvent.create({
        data: {
          userId,
          applicationId: app.id,
          title: `[마감] ${app.jobPosting.title}`,
          eventType: 'DEADLINE',
          scheduledAt: new Date(app.jobPosting.deadline),
        },
      });
    }

    return app;
  }

  async update(id: string, userId: string, dto: UpdateApplicationDto) {
    await this.findOne(id, userId);
    const { appliedAt, currentStage, result, ...rest } = dto;
    return this.prisma.application.update({
      where: { id },
      data: {
        ...rest,
        appliedAt: appliedAt ? new Date(appliedAt) : undefined,
        currentStage: currentStage as ApplicationStage | undefined,
        result: result as ApplicationResult | undefined,
      },
      include: {
        stages: { orderBy: { createdAt: 'asc' } },
        company: { select: { id: true, name: true } },
        jobPosting: { select: { id: true, title: true, deadline: true } },
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.application.delete({ where: { id } });
  }

  async addStage(applicationId: string, userId: string, dto: AddStageDto) {
    await this.findOne(applicationId, userId);
    const { stage, scheduledAt, result, note } = dto;

    const stageHistory = await this.prisma.applicationStageHistory.create({
      data: {
        applicationId,
        stage: stage as ApplicationStage,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        result: result as ApplicationResult | undefined,
        note,
      },
    });

    const interviewStages = new Set(['FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW']);
    if (scheduledAt && interviewStages.has(stage)) {
      const app = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: { jobPosting: true },
      });
      const stageLabel: Record<string, string> = {
        FIRST_INTERVIEW: '1차',
        SECOND_INTERVIEW: '2차',
        FINAL_INTERVIEW: '최종',
      };
      await this.prisma.calendarEvent.create({
        data: {
          userId,
          applicationId,
          title: `[면접] ${app?.jobPosting?.title ?? '면접'} ${stageLabel[stage] ?? ''}`,
          eventType: 'INTERVIEW',
          scheduledAt: new Date(scheduledAt),
        },
      });
    }

    return stageHistory;
  }
}
