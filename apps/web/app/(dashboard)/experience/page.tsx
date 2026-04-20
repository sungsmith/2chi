'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useExperiences, useCreateExperience, useUpdateExperience, useDeleteExperience } from '@/hooks/use-experiences';
import { createExperienceSchema, type CreateExperienceInput, type ExperienceDto } from '@2chi/shared';

const TYPE_LABEL: Record<string, string> = {
  WORK: '경력',
  PROJECT: '프로젝트',
  ACTIVITY: '활동',
  EDUCATION: '학력',
};

const TYPE_COLOR: Record<string, string> = {
  WORK: 'bg-blue-100 text-blue-700',
  PROJECT: 'bg-purple-100 text-purple-700',
  ACTIVITY: 'bg-green-100 text-green-700',
  EDUCATION: 'bg-amber-100 text-amber-700',
};

// ─── Experience Form Modal ──────────────────────────────────────────

interface ExperienceFormModalProps {
  defaultValues?: Partial<CreateExperienceInput>;
  onSubmit: (data: CreateExperienceInput) => Promise<void>;
  isPending: boolean;
  title: string;
  onClose: () => void;
}

function ExperienceFormModal({
  defaultValues,
  onSubmit,
  isPending,
  title,
  onClose,
}: ExperienceFormModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateExperienceInput>({
    resolver: zodResolver(createExperienceSchema),
    defaultValues: {
      type: 'WORK',
      isCurrent: false,
      tagNames: [],
      ...defaultValues,
    },
  });

  const [tagInput, setTagInput] = useState('');
  const tagNames = watch('tagNames') ?? [];
  const isCurrent = watch('isCurrent');

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tagNames.includes(trimmed)) {
      setValue('tagNames', [...tagNames, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setValue('tagNames', tagNames.filter((t) => t !== tag));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-lg shadow-sm my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">
              제목 <span className="text-red-500">*</span>
            </Label>
            <Input id="title" placeholder="프로젝트 이름 또는 경력 제목" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">
              유형 <span className="text-red-500">*</span>
            </Label>
            <select
              id="type"
              {...register('type')}
              className="w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="WORK">경력 (WORK)</option>
              <option value="PROJECT">프로젝트 (PROJECT)</option>
              <option value="ACTIVITY">활동 (ACTIVITY)</option>
              <option value="EDUCATION">학력 (EDUCATION)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companyName">회사명 / 기관명 (선택)</Label>
            <Input id="companyName" placeholder="(주)카카오" {...register('companyName')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">시작일</Label>
              <Input id="startDate" type="month" {...register('startDate')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">종료일</Label>
              <Input id="endDate" type="month" disabled={!!isCurrent} {...register('endDate')} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isCurrent"
              type="checkbox"
              className="rounded border-slate-300"
              {...register('isCurrent')}
            />
            <Label htmlFor="isCurrent" className="cursor-pointer">현재 재직 / 진행 중</Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="situation">상황 (Situation)</Label>
            <Textarea
              id="situation"
              rows={2}
              placeholder="어떤 상황/배경이었나요?"
              {...register('situation')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task">과제 (Task)</Label>
            <Textarea
              id="task"
              rows={2}
              placeholder="어떤 목표/과제가 있었나요?"
              {...register('task')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="action">행동 (Action)</Label>
            <Textarea
              id="action"
              rows={3}
              placeholder="구체적으로 어떤 행동을 했나요?"
              {...register('action')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="result">결과 (Result)</Label>
            <Textarea
              id="result"
              rows={2}
              placeholder="어떤 결과를 얻었나요?"
              {...register('result')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resultMetric">결과 지표 (선택)</Label>
            <Input
              id="resultMetric"
              placeholder="전환율 30% 향상, 처리 속도 2배 개선 등"
              {...register('resultMetric')}
            />
          </div>

          <div className="space-y-1.5">
            <Label>태그</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="React, 협업 등 (Enter로 추가)"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                추가
              </Button>
            </div>
            {tagNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tagNames.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 rounded-full text-xs px-2.5 py-0.5"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? '저장 중...' : '저장'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Experience Card ────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

interface ExperienceCardProps {
  experience: ExperienceDto;
  onEdit: (exp: ExperienceDto) => void;
}

function ExperienceCard({ experience, onEdit }: ExperienceCardProps) {
  const delete_ = useDeleteExperience();

  const formatPeriod = () => {
    const start = formatDate(experience.startDate);
    const end = experience.isCurrent ? '현재' : formatDate(experience.endDate);
    if (!start && !end) return null;
    return `${start} ~ ${end}`;
  };

  const period = formatPeriod();

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-block rounded-full text-xs font-medium px-2.5 py-0.5 ${TYPE_COLOR[experience.type] ?? 'bg-slate-100 text-slate-600'}`}
            >
              {TYPE_LABEL[experience.type] ?? experience.type}
            </span>
            <h3 className="text-sm font-semibold text-slate-900 truncate">{experience.title}</h3>
          </div>
          {experience.companyName && (
            <p className="text-xs text-slate-500 mt-1">{experience.companyName}</p>
          )}
          {period && <p className="text-xs text-slate-400 mt-0.5">{period}</p>}
          {experience.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {experience.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="bg-slate-100 text-slate-600 rounded-full text-xs px-2 py-0.5"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(experience)}
            className="text-slate-400 hover:text-blue-500 p-1"
            aria-label="수정"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('이 이력을 삭제할까요?')) delete_.mutate(experience.id);
            }}
            className="text-slate-400 hover:text-red-500 p-1"
            aria-label="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

type ModalState =
  | { mode: 'closed' }
  | { mode: 'add' }
  | { mode: 'edit'; experience: ExperienceDto };

export default function ExperiencePage() {
  const { data: experiences, isLoading } = useExperiences();
  const createExp = useCreateExperience();
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' });

  const editingId = modal.mode === 'edit' ? modal.experience.id : '';
  const updateExp = useUpdateExperience(editingId);

  const handleAdd = async (data: CreateExperienceInput) => {
    await createExp.mutateAsync(data);
    setModal({ mode: 'closed' });
  };

  const handleEdit = async (data: CreateExperienceInput) => {
    await updateExp.mutateAsync(data);
    setModal({ mode: 'closed' });
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">내 이력</h1>
          <p className="text-sm text-slate-500 mt-0.5">STAR 구조로 경험을 정리하세요.</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setModal({ mode: 'add' })}>
          <Plus className="w-4 h-4" />
          이력 추가
        </Button>
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {!isLoading && experiences?.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">등록된 이력이 없습니다.</p>
          <p className="text-xs mt-1">위 버튼을 눌러 첫 이력을 추가하세요.</p>
        </div>
      )}

      <div className="space-y-3">
        {experiences?.map((exp) => (
          <ExperienceCard
            key={exp.id}
            experience={exp}
            onEdit={(e) => setModal({ mode: 'edit', experience: e })}
          />
        ))}
      </div>

      {modal.mode === 'add' && (
        <ExperienceFormModal
          title="이력 추가"
          isPending={createExp.isPending}
          onSubmit={handleAdd}
          onClose={() => setModal({ mode: 'closed' })}
        />
      )}

      {modal.mode === 'edit' && (
        <ExperienceFormModal
          title="이력 수정"
          isPending={updateExp.isPending}
          defaultValues={{
            title: modal.experience.title,
            type: modal.experience.type,
            companyName: modal.experience.companyName ?? undefined,
            startDate: modal.experience.startDate?.slice(0, 10) ?? undefined,
            endDate: modal.experience.endDate?.slice(0, 10) ?? undefined,
            isCurrent: modal.experience.isCurrent,
            situation: modal.experience.situation ?? undefined,
            task: modal.experience.task ?? undefined,
            action: modal.experience.action ?? undefined,
            result: modal.experience.result ?? undefined,
            resultMetric: modal.experience.resultMetric ?? undefined,
            tagNames: modal.experience.tags.map(({ tag }) => tag.name),
          }}
          onSubmit={handleEdit}
          onClose={() => setModal({ mode: 'closed' })}
        />
      )}
    </div>
  );
}
