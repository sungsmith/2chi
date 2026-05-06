import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import { InterviewPrepsService } from './interview-preps.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  interviewPrep: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  interviewAnswer: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
};

const makePrep = (overrides: Partial<{ id: string; userId: string }> = {}) => ({
  id: 'prep1',
  userId: 'user1',
  jobPostingId: null,
  title: '테스트 면접준비',
  createdAt: new Date(),
  updatedAt: new Date(),
  answers: [],
  ...overrides,
});

const makeAnswer = (overrides: Partial<{ id: string; interviewPrepId: string }> = {}) => ({
  id: 'ans1',
  interviewPrepId: 'prep1',
  question: '자기소개를 해주세요.',
  questionType: 'BEHAVIORAL',
  userAnswer: null,
  aiFeedback: null,
  score: null,
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('InterviewPrepsService', () => {
  let service: InterviewPrepsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewPrepsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('interview-prep'), useValue: mockQueue },
      ],
    }).compile();
    service = module.get<InterviewPrepsService>(InterviewPrepsService);
  });

  describe('findOne', () => {
    it('존재하지 않는 면접준비 → NotFoundException', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(null);
      await expect(service.findOne('not-exist', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 면접준비 → ForbiddenException', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(makePrep({ userId: 'other' }));
      await expect(service.findOne('prep1', 'user1')).rejects.toThrow(ForbiddenException);
    });

    it('본인 면접준비 → 반환', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(makePrep());
      const result = await service.findOne('prep1', 'user1');
      expect(result.id).toBe('prep1');
    });
  });

  describe('remove', () => {
    it('존재하지 않는 면접준비 삭제 → NotFoundException', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(null);
      await expect(service.remove('not-exist', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 면접준비 삭제 → ForbiddenException', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(makePrep({ userId: 'other' }));
      await expect(service.remove('prep1', 'user1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('generateQuestions', () => {
    it('존재하지 않는 면접준비 → NotFoundException', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(null);
      await expect(service.generateQuestions('not-exist', 'user1', { count: 5 })).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 면접준비 → ForbiddenException', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(makePrep({ userId: 'other' }));
      await expect(service.generateQuestions('prep1', 'user1', { count: 5 })).rejects.toThrow(ForbiddenException);
    });

    it('정상 요청 → Bull Queue에 작업 추가 후 jobId 반환', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(makePrep());
      const result = await service.generateQuestions('prep1', 'user1', { count: 5 });
      expect(mockQueue.add).toHaveBeenCalledWith('generate-questions', expect.objectContaining({ interviewPrepId: 'prep1' }));
      expect(result.jobId).toBe('job-1');
    });
  });

  describe('saveAnswer', () => {
    it('존재하지 않는 면접준비 → NotFoundException', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(null);
      await expect(service.saveAnswer('not-exist', 'ans1', 'user1', { answer: '답변' })).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 면접준비 → ForbiddenException', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(makePrep({ userId: 'other' }));
      await expect(service.saveAnswer('prep1', 'ans1', 'user1', { answer: '답변' })).rejects.toThrow(ForbiddenException);
    });

    it('잘못된 answerId (다른 prepId 소속) → NotFoundException', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(makePrep());
      mockPrisma.interviewAnswer.findUnique.mockResolvedValue(makeAnswer({ interviewPrepId: 'other-prep' }));
      await expect(service.saveAnswer('prep1', 'ans1', 'user1', { answer: '답변' })).rejects.toThrow(NotFoundException);
    });

    it('정상 저장 → 업데이트된 답변 반환', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(makePrep());
      mockPrisma.interviewAnswer.findUnique.mockResolvedValue(makeAnswer());
      mockPrisma.interviewAnswer.update.mockResolvedValue({ ...makeAnswer(), userAnswer: '내 답변' });
      const result = await service.saveAnswer('prep1', 'ans1', 'user1', { answer: '내 답변' });
      expect(result.answer).toBe('내 답변');
    });
  });

  describe('requestFeedback', () => {
    it('존재하지 않는 면접준비 → NotFoundException', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(null);
      await expect(service.requestFeedback('not-exist', 'ans1', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 면접준비 → ForbiddenException', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(makePrep({ userId: 'other' }));
      await expect(service.requestFeedback('prep1', 'ans1', 'user1')).rejects.toThrow(ForbiddenException);
    });

    it('정상 요청 → Bull Queue에 피드백 작업 추가 후 jobId 반환', async () => {
      mockPrisma.interviewPrep.findUnique.mockResolvedValue(makePrep());
      mockPrisma.interviewAnswer.findUnique.mockResolvedValue(makeAnswer());
      const result = await service.requestFeedback('prep1', 'ans1', 'user1');
      expect(mockQueue.add).toHaveBeenCalledWith('generate-feedback', expect.objectContaining({ answerId: 'ans1' }));
      expect(result.jobId).toBe('job-1');
    });
  });
});
