"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePortfolioSectionSchema = exports.CreatePortfolioSectionSchema = exports.UpdatePortfolioSchema = exports.CreatePortfolioSchema = void 0;
const zod_1 = require("zod");
exports.CreatePortfolioSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(100),
    templateId: zod_1.z.string().min(1),
    versionLabel: zod_1.z.string().min(1).max(50),
});
exports.UpdatePortfolioSchema = exports.CreatePortfolioSchema.partial();
exports.CreatePortfolioSectionSchema = zod_1.z.object({
    type: zod_1.z.enum(['INTRO', 'PROJECT', 'SKILLS', 'ACHIEVEMENT', 'CUSTOM']),
    title: zod_1.z.string().min(1).max(100),
    content: zod_1.z.string(),
    order: zod_1.z.number().int().min(0),
});
exports.UpdatePortfolioSectionSchema = exports.CreatePortfolioSectionSchema.partial();
