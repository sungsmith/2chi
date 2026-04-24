"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCoverLetterItemSchema = exports.createCoverLetterItemSchema = exports.createCoverLetterSchema = void 0;
const zod_1 = require("zod");
exports.createCoverLetterSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, '제목을 입력하세요.').max(100),
    jobPostingId: zod_1.z.string().optional(),
    companyId: zod_1.z.string().optional(),
});
exports.createCoverLetterItemSchema = zod_1.z.object({
    question: zod_1.z.string().min(1, '질문을 입력하세요.'),
    order: zod_1.z.number().int().min(0),
    charLimit: zod_1.z.number().int().min(1).optional(),
});
exports.updateCoverLetterItemSchema = zod_1.z.object({
    userContent: zod_1.z.string().optional(),
    charLimit: zod_1.z.number().int().min(1).optional(),
});
