import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Applications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let appId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = moduleRef.get(PrismaService);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'e2e-app@example.com', password: 'password123', name: '지원테스터', jobType: 'NEW_GRAD' });
    accessToken = res.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'e2e-app@example.com' } });
    await app.close();
  });

  describe('POST /applications', () => {
    it('should create an application', async () => {
      const res = await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ appliedAt: '2026-04-18', currentStage: 'DOCUMENT', memo: '서류 제출 완료' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStage).toBe('DOCUMENT');
      appId = res.body.data.id;
    });
  });

  describe('GET /applications', () => {
    it('should return list', async () => {
      const res = await request(app.getHttpServer())
        .get('/applications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('PATCH /applications/:id', () => {
    it('should update stage', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/applications/${appId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentStage: 'FIRST_INTERVIEW' })
        .expect(200);

      expect(res.body.data.currentStage).toBe('FIRST_INTERVIEW');
    });
  });

  describe('POST /applications/:id/stages', () => {
    it('should add stage history', async () => {
      const res = await request(app.getHttpServer())
        .post(`/applications/${appId}/stages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ stage: 'FIRST_INTERVIEW', scheduledAt: '2026-04-25', note: '1차 면접' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe('FIRST_INTERVIEW');
    });
  });

  describe('DELETE /applications/:id', () => {
    it('should delete', async () => {
      await request(app.getHttpServer())
        .delete(`/applications/${appId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
