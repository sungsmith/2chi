'use client';

import { useState } from 'react';
import { Trash2, Pencil, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeleteApplication, useUpdateStage } from '@/hooks/use-applications';
import { EditApplicationModal } from './edit-application-modal';
import { AddStageModal } from './add-stage-modal';
import {
  STAGE_LABELS,
  STAGE_COLORS,
  STAGE_DATE_LABELS,
  RESULT_LABELS,
  RESULT_COLORS,
  type ApplicationDto,
  type ApplicationStageHistoryDto,
  type ApplicationResult,
} from '@2chi/shared';

function StageResultSelect({
  stage,
  applicationId,
  onPass,
}: {
  stage: ApplicationStageHistoryDto;
  applicationId: string;
  onPass: () => void;
}) {
  const updateStage = useUpdateStage(applicationId, stage.id);

  async function handleChange(result: string) {
    try {
      await updateStage.mutateAsync({ result: result as ApplicationResult });
      if (result === 'PASS') onPass();
    } catch {
      alert('결과 저장에 실패했습니다. 다시 시도해주세요.');
    }
  }

  return (
    <select
      value={stage.result ?? ''}
      onChange={(e) => handleChange(e.target.value)}
      className="text-xs border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">결과 선택</option>
      <option value="PASS">합격</option>
      <option value="FAIL">불합격</option>
      <option value="PENDING">대기</option>
      <option value="WITHDRAWN">포기</option>
    </select>
  );
}

export function ApplicationCard({ application }: { application: ApplicationDto }) {
  const delete_ = useDeleteApplication();
  const [showEdit, setShowEdit] = useState(false);
  const [showAddStage, setShowAddStage] = useState(false);
  const [showStages, setShowStages] = useState(false);
  const [showNextStagePrompt, setShowNextStagePrompt] = useState(false);

  const displayName =
    application.company?.name ??
    application.memo ??
    application.jobPosting?.title ??
    '(미입력)';

  const overallResult = application.result;

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm group">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
            {application.jobPosting && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{application.jobPosting.title}</p>
            )}
            {application.appliedAt && (
              <p className="text-xs text-slate-400 mt-1">
                지원일: {application.appliedAt.slice(0, 10)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => setShowAddStage(true)}
              className="text-slate-400 hover:text-green-500 p-1"
              aria-label="단계 추가"
              title="전형 단계 추가"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="text-slate-400 hover:text-blue-500 p-1"
              aria-label="수정"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (confirm('이 지원 현황을 삭제할까요?')) delete_.mutate(application.id);
              }}
              className="text-slate-400 hover:text-red-500 p-1"
              aria-label="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 전체 결과 뱃지 */}
        {overallResult && (
          <span
            className={cn(
              'inline-block mt-2 rounded-full text-xs font-medium px-2.5 py-0.5',
              RESULT_COLORS[overallResult],
            )}
          >
            {RESULT_LABELS[overallResult]}
          </span>
        )}

        {/* 전형 히스토리 토글 */}
        {application.stages.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowStages((v) => !v)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              {showStages ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              전형 기록 {application.stages.length}개
            </button>

            {showStages && (
              <div className="mt-2 space-y-2">
                {application.stages.map((stage) => {
                  const stageKey = stage.stage;
                  const color = STAGE_COLORS[stageKey] ?? { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600', label: '기타' };
                  const stageName =
                    stageKey === 'CUSTOM'
                      ? (stage.customLabel ?? '기타')
                      : STAGE_LABELS[stageKey];
                  const dateLabel = STAGE_DATE_LABELS[stageKey];

                  return (
                    <div
                      key={stage.id}
                      className="flex items-start justify-between gap-2 bg-slate-50 rounded-md px-2.5 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('w-2 h-2 rounded-full shrink-0', color.dot)} />
                          <span className="text-xs font-medium text-slate-800">{stageName}</span>
                          {stage.result && (
                            <span
                              className={cn(
                                'text-xs rounded-full px-1.5 py-0 font-medium',
                                RESULT_COLORS[stage.result],
                              )}
                            >
                              {RESULT_LABELS[stage.result]}
                            </span>
                          )}
                        </div>
                        {stage.scheduledAt && (
                          <p className="text-xs text-slate-400 mt-0.5 ml-3.5">
                            {dateLabel}: {stage.scheduledAt.slice(0, 10)}
                          </p>
                        )}
                        {stage.note && (
                          <p className="text-xs text-slate-400 mt-0.5 ml-3.5 truncate">{stage.note}</p>
                        )}
                      </div>
                      <StageResultSelect
                        stage={stage}
                        applicationId={application.id}
                        onPass={() => setShowNextStagePrompt(true)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 단계 없을 때 추가 버튼 */}
        {application.stages.length === 0 && (
          <button
            onClick={() => setShowAddStage(true)}
            className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-blue-500 border border-dashed border-slate-200 hover:border-blue-300 rounded-md py-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" />
            전형 단계 추가
          </button>
        )}
      </div>

      {/* 합격 시 다음 단계 유도 팝업 */}
      {showNextStagePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <div className="text-2xl mb-2">🎉</div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">합격을 축하합니다!</h3>
            <p className="text-sm text-slate-500 mb-5">다음 전형 일정도 기록해두시겠어요?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNextStagePrompt(false)}
                className="flex-1 border border-slate-200 rounded-lg py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                나중에
              </button>
              <button
                onClick={() => {
                  setShowNextStagePrompt(false);
                  setShowAddStage(true);
                }}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
              >
                다음 단계 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <EditApplicationModal application={application} onClose={() => setShowEdit(false)} />
      )}

      {showAddStage && (
        <AddStageModal
          applicationId={application.id}
          onClose={() => setShowAddStage(false)}
        />
      )}
    </>
  );
}
