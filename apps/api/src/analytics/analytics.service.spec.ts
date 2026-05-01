import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  application: {
    findMany: jest.fn(),
  },
};

const makeApp = (overrides: Partial<{
  result: string | null;
  appliedAt: Date | null;
  currentStage: string;
  stages: Array<{ stage: string; createdAt: Date }>;
}> = {}) => ({
  id: `app-${Math.random()}`,
  userId: 'user1',
  currentStage: 'DOCUMENT',
  result: null,
  appliedAt: new Date('2026-03-01'),
  updatedAt: new Date('2026-03-20'),
  stages: [],
  ...overrides,
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getSummary', () => {
    it('userId 필터로 해당 사용자의 지원 데이터만 조회', async () => {
      mockPrisma.application.findMany.mockResolvedValue([]);
      await service.getSummary('user1');
      expect(mockPrisma.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user1' } }),
      );
    });

    it('지원 데이터 없음 → 기본값 반환', async () => {
      mockPrisma.application.findMany.mockResolvedValue([]);
      const result = await service.getSummary('user1');
      expect(result.statistics.totalApplications).toBe(0);
      expect(result.statistics.passRate).toBe(0);
      expect(result.statistics.avgDaysToResult).toBeNull();
      expect(result.monthlyTrend).toHaveLength(6);
      expect(result.stageConversion).toHaveLength(5);
    });

    it('합격/불합격 데이터 → passRate 정확 계산', async () => {
      const apps = [
        makeApp({ result: 'PASS', appliedAt: new Date() }),
        makeApp({ result: 'PASS', appliedAt: new Date() }),
        makeApp({ result: 'FAIL', appliedAt: new Date() }),
        makeApp({ result: null, appliedAt: new Date() }),
      ];
      mockPrisma.application.findMany.mockResolvedValue(apps);
      const result = await service.getSummary('user1');
      // 2 PASS / 4 total = 50%
      expect(result.statistics.passRate).toBe(50);
    });

    it('byStage와 byResult 집계 정확성', async () => {
      const apps = [
        makeApp({ currentStage: 'DOCUMENT', result: 'PASS' }),
        makeApp({ currentStage: 'DOCUMENT', result: 'FAIL' }),
        makeApp({ currentStage: 'FIRST_INTERVIEW', result: null }),
      ];
      mockPrisma.application.findMany.mockResolvedValue(apps);
      const result = await service.getSummary('user1');
      expect(result.statistics.byStage['DOCUMENT']).toBe(2);
      expect(result.statistics.byStage['FIRST_INTERVIEW']).toBe(1);
      expect(result.statistics.byResult['PASS']).toBe(1);
      expect(result.statistics.byResult['FAIL']).toBe(1);
    });

    it('단계 전환율 배열 5개 항목 반환', async () => {
      mockPrisma.application.findMany.mockResolvedValue([makeApp()]);
      const result = await service.getSummary('user1');
      expect(result.stageConversion).toHaveLength(5);
      // 첫 번째 단계(DOCUMENT)는 100% 전환율
      expect(result.stageConversion[0].conversionRate).toBe(100);
    });

    it('월별 트렌드 최근 6개월 반환', async () => {
      mockPrisma.application.findMany.mockResolvedValue([]);
      const result = await service.getSummary('user1');
      expect(result.monthlyTrend).toHaveLength(6);
      // 각 항목은 'YYYY-MM' 형식
      result.monthlyTrend.forEach((trend) => {
        expect(trend.month).toMatch(/^\d{4}-\d{2}$/);
      });
    });
  });
});
