"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCompanySchema = exports.createCompanySchema = void 0;
const zod_1 = require("zod");
exports.createCompanySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, '기업명을 입력하세요.').max(100),
    industry: zod_1.z.string().max(50).optional(),
});
exports.analyzeCompanySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, '기업명을 입력하세요.').max(100),
    jobTitle: zod_1.z.string().max(100).optional(),
    additionalContext: zod_1.z.string().max(1000).optional(),
});
