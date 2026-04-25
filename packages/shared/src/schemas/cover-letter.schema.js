"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCoverLetterItemSchema = exports.createCoverLetterItemSchema = exports.createCoverLetterSchema = exports.scrapeJobPostingSchema = exports.parseJobPostingSchema = void 0;
const zod_1 = require("zod");
exports.parseJobPostingSchema = zod_1.z.object({
    text: zod_1.z.string().min(10, '공고 내용을 입력하세요.'),
    url: zod_1.z.string().url().optional(),
});
exports.scrapeJobPostingSchema = zod_1.z.object({
    url: zod_1.z.string().url('올바른 URL을 입력하세요.'),
});
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
