import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Companies (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let companyId: string;

  jest.setTimeout(30000);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = moduleRef.get(PrismaService);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'e2e-company@example.com', password: 'password123', name: '기업테스터', jobType: 'NEW_GRAD' });
    accessToken = res.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'e2e-company@example.com' } });
    await app.close();
  });

  describe('GET /companies', () => {
    it('should return empty list initially', async () => {
      const res = await request(app.getHttpServer())
        .get('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /companies/analyze', () => {
    it('should analyze company and return result', async () => {
      const res = await request(app.getHttpServer())
        .post('/companies/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '카카오', jobTitle: '프론트엔드 개발자' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('카카오');
      expect(Array.isArray(res.body.data.keyCompetencies)).toBe(true);
      expect(res.body.data.analyzedAt).toBeDefined();
      companyId = res.body.data.id;
    });

    it('should reuse cached result within 24h', async () => {
      const res = await request(app.getHttpServer())
        .post('/companies/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '카카오', jobTitle: '프론트엔드 개발자' })
        .expect(201);

      expect(res.body.data.id).toBe(companyId);
    });
  });

  describe('GET /companies/:id', () => {
    it('should return company analysis', async () => {
      const res = await request(app.getHttpServer())
        .get(`/companies/${companyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(companyId);
      expect(res.body.data.keyCompetencies.length).toBeGreaterThan(0);
    });
  });
});
