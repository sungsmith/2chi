import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { ExperienceType } from '@prisma/client';

const INCLUDE_TAGS = { tags: { include: { tag: true } } } as const;

@Injectable()
export class ExperiencesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.experience.findMany({
      where: { userId },
      include: INCLUDE_TAGS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
      include: INCLUDE_TAGS,
    });
    if (!experience) throw new NotFoundException('이력을 찾을 수 없습니다.');
    if (experience.userId !== userId) throw new ForbiddenException();
    return experience;
  }

  async create(userId: string, dto: CreateExperienceDto) {
    const { tagNames, startDate, endDate, ...rest } = dto;

    const tagConnects = tagNames?.length
      ? await Promise.all(
          tagNames.map((name: string) =>
            this.prisma.tag.upsert({
              where: { name },
              update: {},
              create: { name },
            }),
          ),
        )
      : [];

    return this.prisma.experience.create({
      data: {
        ...rest,
        userId,
        type: rest.type as ExperienceType,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        tags: {
          create: tagConnects.map((tag) => ({ tagId: tag.id })),
        },
      },
      include: INCLUDE_TAGS,
    });
  }

  async update(id: string, userId: string, dto: UpdateExperienceDto) {
    await this.findOne(id, userId);
    const { tagNames, startDate, endDate, type, ...rest } = dto;

    const tagConnects =
      tagNames !== undefined
        ? await Promise.all(
            tagNames.map((name: string) =>
              this.prisma.tag.upsert({
                where: { name },
                update: {},
                create: { name },
              }),
            ),
          )
        : undefined;

    return this.prisma.experience.update({
      where: { id },
      data: {
        ...rest,
        ...(type && { type: type as ExperienceType }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(tagConnects !== undefined && {
          tags: {
            deleteMany: {},
            create: tagConnects.map((tag) => ({ tagId: tag.id })),
          },
        }),
      },
      include: INCLUDE_TAGS,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.experience.delete({ where: { id } });
  }
}
