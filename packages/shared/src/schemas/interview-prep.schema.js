"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveAnswerSchema = exports.GenerateQuestionsSchema = exports.CreateInterviewPrepSchema = void 0;
const zod_1 = require("zod");
exports.CreateInterviewPrepSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(100),
    jobPostingId: zod_1.z.string().optional(),
});
exports.GenerateQuestionsSchema = zod_1.z.object({
    count: zod_1.z.number().int().min(3).max(20).default(10),
    questionTypes: zod_1.z.array(zod_1.z.enum(['COMPETENCY', 'BEHAVIORAL', 'TECHNICAL', 'SITUATIONAL'])).optional(),
});
exports.SaveAnswerSchema = zod_1.z.object({
    answer: zod_1.z.string().min(1),
});
