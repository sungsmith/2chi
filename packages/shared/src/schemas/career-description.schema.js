"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSectionDraftSchema = exports.updateSectionSchema = exports.updateCareerDescriptionSchema = exports.createCareerDescriptionSchema = void 0;
const zod_1 = require("zod");
exports.createCareerDescriptionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, '제목을 입력하세요.').max(100),
    versionLabel: zod_1.z.string().max(50).optional(),
    targetJobType: zod_1.z.string().max(100).optional(),
});
exports.updateCareerDescriptionSchema = exports.createCareerDescriptionSchema.partial();
exports.updateSectionSchema = zod_1.z.object({
    content: zod_1.z.object({
        heading: zod_1.z.string(),
        body: zod_1.z.string(),
    }),
    order: zod_1.z.number().int().min(0).optional(),
});
exports.generateSectionDraftSchema = zod_1.z.object({
    experienceIds: zod_1.z.array(zod_1.z.string()).optional(),
    targetJobType: zod_1.z.string().optional(),
});
