import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResumeProfileDto, ExperienceDto } from '@2chi/shared';
import { CreateResumeProfileDto } from './dto/create-resume-profile.dto';
import { UpdateResumeProfileDto } from './dto/update-resume-profile.dto';

type PrismaResumeProfile = {
  id: string;
  userId: string;
  name: string;
  description: string;
  selectedExperienceIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

type PrismaExperience = {
  id: string;
  userId: string;
  title: string;
  type: string;
  companyName: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
  resultMetric: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: Array<{ tag: { id: string; name: string; category: string | null } }>;
};

@Injectable()
export class ResumeProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<ResumeProfileDto[]> {
    const items = await this.prisma.resumeProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => this.toDto(item));
  }

  async findOne(id: string, userId: string): Promise<ResumeProfileDto> {
    const item = await this.prisma.resumeProfile.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('이력 프로필을 찾을 수 없습니다.');
    if (item.userId !== userId) throw new ForbiddenException();

    const experiences = await this.prisma.experience.findMany({
      where: { id: { in: item.selectedExperienceIds }, userId },
      include: { tags: { include: { tag: true } } },
    });

    return this.toDto(item, experiences as PrismaExperience[]);
  }

  async create(userId: string, dto: CreateResumeProfileDto): Promise<ResumeProfileDto> {
    await this.validateExperienceIds(dto.selectedExperienceIds, userId);

    const item = await this.prisma.resumeProfile.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description ?? '',
        selectedExperienceIds: dto.selectedExperienceIds,
      },
    });
    return this.toDto(item);
  }

  async update(id: string, userId: string, dto: UpdateResumeProfileDto): Promise<ResumeProfileDto> {
    const existing = await this.findExistingOrThrow(id, userId);

    if (dto.selectedExperienceIds) {
      await this.validateExperienceIds(dto.selectedExperienceIds, userId);
    }

    const item = await this.prisma.resumeProfile.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.selectedExperienceIds !== undefined && {
          selectedExperienceIds: dto.selectedExperienceIds,
        }),
      },
    });

    void existing;
    return this.toDto(item);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findExistingOrThrow(id, userId);
    await this.prisma.resumeProfile.delete({ where: { id } });
  }

  private async findExistingOrThrow(id: string, userId: string): Promise<PrismaResumeProfile> {
    const item = await this.prisma.resumeProfile.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('이력 프로필을 찾을 수 없습니다.');
    if (item.userId !== userId) throw new ForbiddenException();
    return item;
  }

  private async validateExperienceIds(ids: string[], userId: string): Promise<void> {
    const found = await this.prisma.experience.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('존재하지 않는 경험 ID가 포함되어 있습니다.');
    }
  }

  private toDto(item: PrismaResumeProfile, experiences?: PrismaExperience[]): ResumeProfileDto {
    const dto: ResumeProfileDto = {
      id: item.id,
      userId: item.userId,
      name: item.name,
      description: item.description,
      selectedExperienceIds: item.selectedExperienceIds,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };

    if (experiences !== undefined) {
      dto.experiences = experiences.map((e): ExperienceDto => ({
        id: e.id,
        userId: e.userId,
        title: e.title,
        type: e.type as ExperienceDto['type'],
        companyName: e.companyName,
        startDate: e.startDate ? e.startDate.toISOString() : null,
        endDate: e.endDate ? e.endDate.toISOString() : null,
        isCurrent: e.isCurrent,
        situation: e.situation,
        task: e.task,
        action: e.action,
        result: e.result,
        resultMetric: e.resultMetric,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        tags: e.tags.map((t) => ({ tag: t.tag })),
      }));
    }

    return dto;
  }
}
