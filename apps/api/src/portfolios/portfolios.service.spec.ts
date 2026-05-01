import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { FilesService } from '../files/files.service';
import { ExperiencesService } from '../experiences/experiences.service';

const mockPrisma = {
  portfolio: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  portfolioSection: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAi = { streamPortfolioSectionDraft: jest.fn() };
const mockFiles = { uploadBuffer: jest.fn(), getSignedDownloadUrl: jest.fn() };
const mockExperiencesService = { findAll: jest.fn() };

type MockSection = {
  id: string;
  portfolioId: string;
  experienceId: string | null;
  sectionType: string;
  order: number;
  content: unknown;
};

const makePortfolio = (overrides: Partial<{ id: string; userId: string }> = {}) => ({
  id: 'p1',
  userId: 'user1',
  title: '테스트 포트폴리오',
  templateId: 'basic',
  versionLabel: 'v1',
  pdfUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  sections: [] as MockSection[],
  ...overrides,
});

describe('PortfoliosService', () => {
  let service: PortfoliosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfoliosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAi },
        { provide: FilesService, useValue: mockFiles },
        { provide: ExperiencesService, useValue: mockExperiencesService },
      ],
    }).compile();
    service = module.get<PortfoliosService>(PortfoliosService);
  });

  describe('findOne', () => {
    it('존재하지 않는 포트폴리오 → NotFoundException', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(null);
      await expect(service.findOne('not-exist', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 포트폴리오 → ForbiddenException', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(makePortfolio({ userId: 'other' }));
      await expect(service.findOne('p1', 'user1')).rejects.toThrow(ForbiddenException);
    });

    it('본인 포트폴리오 → 반환', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(makePortfolio());
      const result = await service.findOne('p1', 'user1');
      expect(result.id).toBe('p1');
    });
  });

  describe('update', () => {
    it('다른 사용자의 포트폴리오 수정 → ForbiddenException', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(makePortfolio({ userId: 'other' }));
      await expect(service.update('p1', 'user1', { title: 'new' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('다른 사용자의 포트폴리오 삭제 → ForbiddenException', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(makePortfolio({ userId: 'other' }));
      await expect(service.remove('p1', 'user1')).rejects.toThrow(ForbiddenException);
    });

    it('존재하지 않는 포트폴리오 삭제 → NotFoundException', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(null);
      await expect(service.remove('not-exist', 'user1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createSection', () => {
    it('다른 사용자의 포트폴리오에 섹션 추가 → ForbiddenException', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(makePortfolio({ userId: 'other' }));
      await expect(
        service.createSection('p1', 'user1', { type: 'INTRO', title: 't', content: 'c', order: 0 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateSection', () => {
    it('존재하지 않는 섹션 수정 → NotFoundException', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(makePortfolio());
      await expect(
        service.updateSection('p1', 'not-exist-section', 'user1', { title: 'new' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeSection', () => {
    it('존재하지 않는 섹션 삭제 → NotFoundException', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(makePortfolio());
      await expect(service.removeSection('p1', 'not-exist-section', 'user1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderSections', () => {
    it('다른 포트폴리오의 섹션 ID 포함 → BadRequestException', async () => {
      const portfolio = makePortfolio();
      portfolio.sections = [{ id: 's1', portfolioId: 'p1', experienceId: null, sectionType: 'INTRO', order: 0, content: {} }];
      mockPrisma.portfolio.findUnique.mockResolvedValue(portfolio);
      await expect(service.reorderSections('p1', 'user1', ['s1', 'alien-section'])).rejects.toThrow(BadRequestException);
    });

    it('유효한 섹션 ID → 순서 업데이트', async () => {
      const portfolio = makePortfolio();
      portfolio.sections = [
        { id: 's1', portfolioId: 'p1', experienceId: null, sectionType: 'INTRO', order: 0, content: {} },
        { id: 's2', portfolioId: 'p1', experienceId: null, sectionType: 'PROJECT', order: 1, content: {} },
      ];
      mockPrisma.portfolio.findUnique.mockResolvedValue(portfolio);
      mockPrisma.$transaction.mockResolvedValue([]);
      await expect(service.reorderSections('p1', 'user1', ['s2', 's1'])).resolves.toBeUndefined();
    });
  });
});
