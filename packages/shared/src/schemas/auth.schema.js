"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('유효한 이메일을 입력하세요.'),
    password: zod_1.z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
    name: zod_1.z.string().min(1, '이름을 입력하세요.').max(50),
    jobType: zod_1.z.enum(['NEW_GRAD', 'MID_CAREER', 'EXPERIENCED']),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('유효한 이메일을 입력하세요.'),
    password: zod_1.z.string().min(1, '비밀번호를 입력하세요.'),
});
