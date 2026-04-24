"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCalendarEventSchema = exports.updateStageSchema = exports.addStageSchema = exports.createApplicationSchema = void 0;
const zod_1 = require("zod");
exports.createApplicationSchema = zod_1.z.object({
    jobPostingId: zod_1.z.string().optional(),
    companyId: zod_1.z.string().optional(),
    coverLetterId: zod_1.z.string().optional(),
    appliedAt: zod_1.z.string().optional(),
    currentStage: zod_1.z
        .enum(['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'OFFER', 'DONE', 'CUSTOM'])
        .optional()
        .default('DOCUMENT'),
    memo: zod_1.z.string().max(2000).optional(),
});
exports.addStageSchema = zod_1.z.object({
    stage: zod_1.z.enum(['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'OFFER', 'DONE', 'CUSTOM']),
    customLabel: zod_1.z.string().optional(),
    scheduledAt: zod_1.z.string().optional(),
    result: zod_1.z.enum(['PASS', 'FAIL', 'PENDING', 'WITHDRAWN']).optional(),
    note: zod_1.z.string().max(500).optional(),
});
exports.updateStageSchema = zod_1.z.object({
    result: zod_1.z.enum(['PASS', 'FAIL', 'PENDING', 'WITHDRAWN']).optional(),
    note: zod_1.z.string().max(500).optional(),
});
exports.createCalendarEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, '제목을 입력하세요.').max(100),
    eventType: zod_1.z.enum(['DEADLINE', 'INTERVIEW', 'OTHER']),
    scheduledAt: zod_1.z.string().min(1, '일정 날짜를 입력하세요.'),
    applicationId: zod_1.z.string().optional(),
    reminderAt: zod_1.z.string().optional(),
});
