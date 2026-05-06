import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CompaniesService, COMPANY_QUEUE } from './companies.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

const mockPrisma = {
  company: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  experience: { findMany: jest.fn() },
};

const mockAiService = {
  analyzeCompany: jest.fn(),
  analyzeCompetencyGap: jest.fn(),
};

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  getJob: jest.fn(),
};

describe('CompaniesService', () => {
  let service: CompaniesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAiService },
        { provide: getQueueToken(COMPANY_QUEUE), useValue: mockQueue },
      ],
    }).compile();
    service = module.get<CompaniesService>(CompaniesService);
  });

  describe('analyzeAndUpsert', () => {
    const userId = 'user-1';
    const dto = { name: '카카오', jobPostingText: '프론트엔드 개발자 채용...', additionalContext: undefined };

    const aiResult = {
      summary: '카카오 요약',
      products: ['카카오톡'],
      recentNews: ['AI 투자'],
      culture: '수평적 조직문화',
      keyCompetencies: ['커뮤니케이션', 'React'],
      jobTitle: '프론트엔드 개발자',
      requiredCompetencies: ['React', 'TypeScript'],
      preferredCompetencies: ['Next.js'],
      jobSummary: '프론트엔드 개발 담당',
    };

    const gapResult = {
      required: ['React', 'TypeScript'],
      preferred: ['Next.js'],
      myMatched: ['React'],
      myMissing: ['TypeScript'],
      score: 60,
      summary: 'React 강점, TypeScript 보강 필요',
    };

    it('새 기업 생성 시 jobInfo + gapResult를 unofficialInfo에 저장한다', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);
      mockAiService.analyzeCompany.mockResolvedValue(aiResult);
      mockPrisma.experience.findMany.mockResolvedValue([
        {
          title: '카카오 인턴',
          tags: [{ tag: { name: 'React' } }],
          situation: '...',
          action: '...',
        },
      ]);
      mockAiService.analyzeCompetencyGap.mockResolvedValue(gapResult);
      mockPrisma.company.create.mockResolvedValue({ id: 'co-1', userId, name: '카카오', industry: null, officialInfo: null, unofficialInfo: { jobInfo: { jobTitle: '프론트엔드 개발자', requiredCompetencies: ['React', 'TypeScript'], preferredCompetencies: ['Next.js'], jobSummary: '프론트엔드 개발 담당' }, gapResult }, keyCompetencies: ['커뮤니케이션', 'React'], analyzedAt: new Date(), createdAt: new Date() });

      await service.analyzeAndUpsert(userId, dto);

      expect(mockAiService.analyzeCompany).toHaveBeenCalledWith('카카오', dto.jobPostingText, undefined);
      expect(mockPrisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unofficialInfo: expect.objectContaining({
              jobInfo: expect.objectContaining({ jobTitle: '프론트엔드 개발자' }),
              gapResult: expect.objectContaining({ score: 60 }),
            }),
          }),
        }),
      );
    });

    it('경험이 없으면 gapResult를 null로 저장한다', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);
      mockAiService.analyzeCompany.mockResolvedValue(aiResult);
      mockPrisma.experience.findMany.mockResolvedValue([]);
      mockPrisma.company.create.mockResolvedValue({ id: 'co-1', userId, name: '카카오', industry: null, officialInfo: null, unofficialInfo: { jobInfo: { jobTitle: '프론트엔드 개발자', requiredCompetencies: ['React', 'TypeScript'], preferredCompetencies: ['Next.js'], jobSummary: '프론트엔드 개발 담당' }, gapResult: null }, keyCompetencies: ['커뮤니케이션', 'React'], analyzedAt: new Date(), createdAt: new Date() });

      await service.analyzeAndUpsert(userId, dto);

      expect(mockAiService.analyzeCompetencyGap).not.toHaveBeenCalled();
      expect(mockPrisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unofficialInfo: expect.objectContaining({ gapResult: null }),
          }),
        }),
      );
    });

    it('AI가 error를 반환하면 BadRequestException을 던진다', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);
      mockAiService.analyzeCompany.mockResolvedValue({ error: 'invalid_company', message: '유효한 기업명을 입력해주세요.' });

      await expect(service.analyzeAndUpsert(userId, dto)).rejects.toThrow('유효한 기업명을 입력해주세요.');
    });
  });

  describe('findOne', () => {
    it('존재하지 않는 기업 조회 시 NotFoundException을 던진다', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('다른 유저의 기업 조회 시 ForbiddenException을 던진다', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ id: 'co-1', userId: 'other-user', unofficialInfo: null, keyCompetencies: [], analyzedAt: null, createdAt: new Date() });
      await expect(service.findOne('co-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
