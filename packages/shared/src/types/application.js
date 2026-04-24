"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESULT_COLORS = exports.RESULT_LABELS = exports.STAGE_COLORS = exports.STAGE_DATE_LABELS = exports.STAGE_LABELS = void 0;
exports.STAGE_LABELS = {
    DOCUMENT: '서류',
    FIRST_INTERVIEW: '1차 면접',
    SECOND_INTERVIEW: '2차 면접',
    OFFER: '합격통보',
    DONE: '완료',
    CUSTOM: '기타',
};
exports.STAGE_DATE_LABELS = {
    DOCUMENT: '마감일',
    FIRST_INTERVIEW: '면접일',
    SECOND_INTERVIEW: '면접일',
    OFFER: '통보일',
    DONE: '완료일',
    CUSTOM: '응시일',
};
exports.STAGE_COLORS = {
    DOCUMENT: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-600', label: '서류' },
    FIRST_INTERVIEW: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700', label: '1차 면접' },
    SECOND_INTERVIEW: { dot: 'bg-blue-600', badge: 'bg-blue-100 text-blue-800', label: '2차 면접' },
    OFFER: { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700', label: '합격통보' },
    DONE: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600', label: '완료' },
    CUSTOM: { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700', label: '기타' },
};
exports.RESULT_LABELS = {
    PASS: '합격',
    FAIL: '불합격',
    PENDING: '대기',
    WITHDRAWN: '포기',
};
exports.RESULT_COLORS = {
    PASS: 'text-green-600 bg-green-50',
    FAIL: 'text-red-500 bg-red-50',
    PENDING: 'text-amber-600 bg-amber-50',
    WITHDRAWN: 'text-slate-500 bg-slate-100',
};
