'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StageConversionDto } from '@2chi/shared';

interface StageConversionTableProps {
  data: StageConversionDto[];
}

const STAGE_LABELS: Record<string, string> = {
  DOCUMENT: '서류',
  FIRST_INTERVIEW: '1차 면접',
  SECOND_INTERVIEW: '2차 면접',
  FINAL_INTERVIEW: '최종 면접',
  OFFER: '합격',
};

export function StageConversionTable({ data }: StageConversionTableProps) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900">
          단계별 전환율
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                단계
              </th>
              <th className="text-right py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                도달 수
              </th>
              <th className="text-right py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                전환율
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.stage} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 text-slate-700">
                  {STAGE_LABELS[row.stage] ?? row.stage}
                </td>
                <td className="py-2.5 text-right text-slate-700">{row.count}</td>
                <td className="py-2.5 text-right text-slate-700">
                  {row.conversionRate.toFixed(1)}%
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-slate-400 text-xs">
                  데이터가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
