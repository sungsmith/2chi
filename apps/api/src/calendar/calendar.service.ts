import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventType } from '@prisma/client';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async findByMonth(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    return this.prisma.calendarEvent.findMany({
      where: {
        userId,
        scheduledAt: { gte: start, lte: end },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateEventDto) {
    return this.prisma.calendarEvent.create({
      data: {
        userId,
        title: dto.title,
        eventType: dto.eventType as EventType,
        scheduledAt: new Date(dto.scheduledAt),
        applicationId: dto.applicationId,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateEventDto) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('일정을 찾을 수 없습니다.');
    if (event.userId !== userId) throw new ForbiddenException();

    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        title: dto.title,
        eventType: dto.eventType as EventType | undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('일정을 찾을 수 없습니다.');
    if (event.userId !== userId) throw new ForbiddenException();
    return this.prisma.calendarEvent.delete({ where: { id } });
  }
}
