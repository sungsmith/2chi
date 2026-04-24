"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExperienceSchema = exports.createExperienceSchema = void 0;
const zod_1 = require("zod");
exports.createExperienceSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, '제목을 입력하세요.').max(100),
    type: zod_1.z.enum(['WORK', 'PROJECT', 'ACTIVITY', 'EDUCATION']),
    companyName: zod_1.z.string().max(100).optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    isCurrent: zod_1.z.boolean().optional(),
    situation: zod_1.z.string().max(2000).optional(),
    task: zod_1.z.string().max(2000).optional(),
    action: zod_1.z.string().max(2000).optional(),
    result: zod_1.z.string().max(2000).optional(),
    resultMetric: zod_1.z.string().max(200).optional(),
    tagNames: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.updateExperienceSchema = exports.createExperienceSchema.partial();
