import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AddStageDto } from './dto/add-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
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
    const app = await this.findOne(applicationId, userId);
    const { stage, customLabel, scheduledAt, result, note } = dto;

    if (stage === 'CUSTOM' && !customLabel?.trim()) {
      throw new BadRequestException('기타 단계는 카테고리명을 입력해야 합니다.');
    }

    const stageHistory = await this.prisma.applicationStageHistory.create({
      data: {
        applicationId,
        stage,
        customLabel: stage === 'CUSTOM' ? (customLabel ?? null) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        result,
        note,
      },
    });

    await this.prisma.application.update({
      where: { id: applicationId },
      data: { currentStage: stage },
    });

    const companyName = app.company?.name ?? app.memo ?? app.jobPosting?.title;

    if (scheduledAt && stage === 'DOCUMENT') {
      await this.prisma.calendarEvent.create({
        data: {
          userId,
          applicationId,
          title: `[마감] ${companyName ?? '서류'}`,
          eventType: 'DEADLINE',
          scheduledAt: new Date(scheduledAt),
        },
      });
    }

    const interviewStages = new Set(['FIRST_INTERVIEW', 'SECOND_INTERVIEW']);
    if (scheduledAt && interviewStages.has(stage)) {
      const stageLabel: Record<string, string> = {
        FIRST_INTERVIEW: '1차',
        SECOND_INTERVIEW: '2차',
      };
      await this.prisma.calendarEvent.create({
        data: {
          userId,
          applicationId,
          title: `[면접] ${companyName ?? '면접'} ${stageLabel[stage] ?? ''}`,
          eventType: 'INTERVIEW',
          scheduledAt: new Date(scheduledAt),
        },
      });
    }

    if (scheduledAt && stage === 'CUSTOM') {
      const displayLabel = customLabel ?? '기타';
      await this.prisma.calendarEvent.create({
        data: {
          userId,
          applicationId,
          title: `[${displayLabel}] ${companyName ?? ''}`.trim(),
          eventType: 'OTHER',
          scheduledAt: new Date(scheduledAt),
        },
      });
    }

    return stageHistory;
  }

  async getCustomLabels(userId: string): Promise<string[]> {
    const rows = await this.prisma.applicationStageHistory.findMany({
      where: {
        application: { userId },
        stage: 'CUSTOM',
        customLabel: { not: null },
      },
      select: { customLabel: true },
      distinct: ['customLabel'],
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => r.customLabel!);
  }

  async updateStage(applicationId: string, stageId: string, userId: string, dto: UpdateStageDto) {
    await this.findOne(applicationId, userId);
    const stageHistory = await this.prisma.applicationStageHistory.findUnique({ where: { id: stageId } });
    if (!stageHistory || stageHistory.applicationId !== applicationId) {
      throw new NotFoundException('전형 기록을 찾을 수 없습니다.');
    }
    return this.prisma.applicationStageHistory.update({
      where: { id: stageId },
      data: {
        result: dto.result,
        note: dto.note,
      },
    });
  }
}
