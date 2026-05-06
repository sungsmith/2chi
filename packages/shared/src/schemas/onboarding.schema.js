"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmOnboardingSchema = void 0;
const zod_1 = require("zod");
exports.confirmOnboardingSchema = zod_1.z.object({
    parseId: zod_1.z.string().min(1),
    experiences: zod_1.z.array(zod_1.z.object({
        title: zod_1.z.string().min(1, '제목을 입력하세요.').max(100),
        type: zod_1.z.enum(['WORK', 'PROJECT', 'ACTIVITY', 'EDUCATION']),
        companyName: zod_1.z.string().max(100).optional(),
        startDate: zod_1.z.string().optional(),
        endDate: zod_1.z.string().optional(),
        situation: zod_1.z.string().max(2000).optional(),
        task: zod_1.z.string().max(2000).optional(),
        action: zod_1.z.string().max(2000).optional(),
        result: zod_1.z.string().max(2000).optional(),
        resultMetric: zod_1.z.string().max(500).optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
    })).min(1, '저장할 경험을 1개 이상 선택하세요.'),
});
