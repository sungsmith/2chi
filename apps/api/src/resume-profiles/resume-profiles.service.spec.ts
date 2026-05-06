import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ResumeProfilesService } from './resume-profiles.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  resumeProfile: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  experience: {
    findMany: jest.fn(),
  },
};

const makeProfile = (overrides: Partial<{ id: string; userId: string }> = {}) => ({
  id: 'rp1',
  userId: 'user1',
  name: '마케팅용',
  description: '마케팅 직무 지원용 프로필',
  selectedExperienceIds: ['exp1', 'exp2'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('ResumeProfilesService', () => {
  let service: ResumeProfilesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeProfilesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ResumeProfilesService>(ResumeProfilesService);
  });

  describe('findOne', () => {
    it('존재하지 않는 프로필 → NotFoundException', async () => {
      mockPrisma.resumeProfile.findUnique.mockResolvedValue(null);
      await expect(service.findOne('not-exist', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 프로필 → ForbiddenException', async () => {
      mockPrisma.resumeProfile.findUnique.mockResolvedValue(makeProfile({ userId: 'other' }));
      await expect(service.findOne('rp1', 'user1')).rejects.toThrow(ForbiddenException);
    });

    it('본인 프로필 → experiences 포함 반환', async () => {
      mockPrisma.resumeProfile.findUnique.mockResolvedValue(makeProfile());
      mockPrisma.experience.findMany.mockResolvedValue([
        {
          id: 'exp1', userId: 'user1', title: '경험1', type: 'WORK',
          companyName: null, startDate: null, endDate: null, isCurrent: false,
          situation: null, task: null, action: null, result: null, resultMetric: null,
          createdAt: new Date(), updatedAt: new Date(), tags: [],
        },
      ]);
      const result = await service.findOne('rp1', 'user1');
      expect(result.id).toBe('rp1');
      expect(result.experiences).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('존재하지 않는 experienceId 포함 → BadRequestException', async () => {
      // validateExperienceIds: found.length(1) !== ids.length(2) → throws
      mockPrisma.experience.findMany.mockResolvedValue([{ id: 'exp1' }]);
      await expect(
        service.create('user1', { name: '테스트', description: '', selectedExperienceIds: ['exp1', 'not-exist-exp'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('모든 experienceId 유효 → 프로필 생성', async () => {
      mockPrisma.experience.findMany.mockResolvedValue([{ id: 'exp1' }, { id: 'exp2' }]);
      mockPrisma.resumeProfile.create.mockResolvedValue(makeProfile());
      const result = await service.create('user1', { name: '마케팅용', description: '', selectedExperienceIds: ['exp1', 'exp2'] });
      expect(result.id).toBe('rp1');
    });
  });

  describe('update', () => {
    it('존재하지 않는 프로필 수정 → NotFoundException', async () => {
      mockPrisma.resumeProfile.findUnique.mockResolvedValue(null);
      await expect(service.update('not-exist', 'user1', { name: '수정' })).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 프로필 수정 → ForbiddenException', async () => {
      mockPrisma.resumeProfile.findUnique.mockResolvedValue(makeProfile({ userId: 'other' }));
      await expect(service.update('rp1', 'user1', { name: '수정' })).rejects.toThrow(ForbiddenException);
    });

    it('유효하지 않은 experienceId로 수정 → BadRequestException', async () => {
      mockPrisma.resumeProfile.findUnique.mockResolvedValue(makeProfile());
      mockPrisma.experience.findMany.mockResolvedValue([{ id: 'exp1' }]); // only 1 found, 2 requested
      await expect(
        service.update('rp1', 'user1', { selectedExperienceIds: ['exp1', 'bad-id'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('존재하지 않는 프로필 삭제 → NotFoundException', async () => {
      mockPrisma.resumeProfile.findUnique.mockResolvedValue(null);
      await expect(service.remove('not-exist', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 프로필 삭제 → ForbiddenException', async () => {
      mockPrisma.resumeProfile.findUnique.mockResolvedValue(makeProfile({ userId: 'other' }));
      await expect(service.remove('rp1', 'user1')).rejects.toThrow(ForbiddenException);
    });

    it('본인 프로필 삭제 → 성공', async () => {
      mockPrisma.resumeProfile.findUnique.mockResolvedValue(makeProfile());
      mockPrisma.resumeProfile.delete.mockResolvedValue({});
      await expect(service.remove('rp1', 'user1')).resolves.toBeUndefined();
    });
  });
});
