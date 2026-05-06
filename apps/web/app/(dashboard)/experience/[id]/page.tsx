'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  useExperience,
  useUpdateExperience,
  useDeleteExperience,
} from '@/hooks/use-experiences';
import { updateExperienceSchema, type UpdateExperienceInput, type ExperienceDto } from '@2chi/shared';

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

const STAR_FIELDS: { key: keyof ExperienceDto; label: string; placeholder: string }[] = [
  { key: 'situation', label: 'Situation (상황)', placeholder: '어떤 상황/배경이었나요?' },
  { key: 'task', label: 'Task (과제)', placeholder: '어떤 목표/과제가 있었나요?' },
  { key: 'action', label: 'Action (행동)', placeholder: '구체적으로 어떤 행동을 했나요?' },
  { key: 'result', label: 'Result (결과)', placeholder: '어떤 결과를 얻었나요?' },
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 7); // YYYY-MM
}

// ─── Edit Form ──────────────────────────────────────────────────────

interface EditFormProps {
  experience: ExperienceDto;
  onSave: (data: UpdateExperienceInput) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
}

function EditForm({ experience, onSave, onCancel, isPending }: EditFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateExperienceInput>({
    resolver: zodResolver(updateExperienceSchema),
    defaultValues: {
      title: experience.title,
      type: experience.type,
      companyName: experience.companyName ?? undefined,
      startDate: formatDate(experience.startDate),
      endDate: formatDate(experience.endDate),
      isCurrent: experience.isCurrent,
      situation: experience.situation ?? undefined,
      task: experience.task ?? undefined,
      action: experience.action ?? undefined,
      result: experience.result ?? undefined,
      resultMetric: experience.resultMetric ?? undefined,
      tagNames: experience.tags.map(({ tag }) => tag.name),
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
    <form onSubmit={handleSubmit(onSave)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">
          제목 <span className="text-red-500">*</span>
        </Label>
        <Input id="title" placeholder="프로젝트 이름 또는 경력 제목" {...register('title')} />
        {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="type">유형</Label>
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

      {STAR_FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key}>{label}</Label>
          <Textarea
            id={key}
            rows={3}
            placeholder={placeholder}
            {...register(key as keyof UpdateExperienceInput)}
          />
        </div>
      ))}

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
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}

// ─── Detail View ────────────────────────────────────────────────────

interface DetailViewProps {
  experience: ExperienceDto;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function DetailView({ experience, onEdit, onDelete, isDeleting }: DetailViewProps) {
  const period = (() => {
    const start = experience.startDate ? experience.startDate.slice(0, 7) : '';
    const end = experience.isCurrent ? '현재' : (experience.endDate ? experience.endDate.slice(0, 7) : '');
    if (!start && !end) return null;
    return `${start} ~ ${end}`;
  })();

  return (
    <div className="space-y-6">
      {/* Title & meta */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className={`inline-block rounded-full text-xs font-medium px-2.5 py-0.5 ${TYPE_COLOR[experience.type] ?? 'bg-slate-100 text-slate-600'}`}
              >
                {TYPE_LABEL[experience.type] ?? experience.type}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">{experience.title}</h2>
            {experience.companyName && (
              <p className="text-sm text-slate-500 mt-1">{experience.companyName}</p>
            )}
            {period && <p className="text-sm text-slate-400 mt-0.5">{period}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={onEdit} className="text-slate-500 hover:text-blue-600">
              <Pencil className="w-4 h-4 mr-1" />
              수정
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="text-slate-500 hover:text-red-600"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              삭제
            </Button>
          </div>
        </div>

        {/* Tags */}
        {experience.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {experience.tags.map(({ tag }) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* STAR fields */}
      <div className="space-y-4">
        {STAR_FIELDS.map(({ key, label }) => {
          const value = experience[key] as string | null;
          if (!value) return null;
          return (
            <div key={key} className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {label}
              </h3>
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{value}</p>
            </div>
          );
        })}

        {experience.resultMetric && (
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              결과 지표
            </h3>
            <p className="text-sm text-slate-800">{experience.resultMetric}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

export default function ExperienceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: experience, isLoading } = useExperience(id);
  const updateExp = useUpdateExperience(id);
  const deleteExp = useDeleteExperience();

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async (data: UpdateExperienceInput) => {
    await updateExp.mutateAsync(data);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!confirm('이 이력을 삭제할까요?')) return;
    deleteExp.mutate(id, {
      onSuccess: () => router.push('/experience'),
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="max-w-3xl">
        <p className="text-sm text-slate-500">이력을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Back button */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-slate-700 px-2"
          onClick={() => router.push('/experience')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          목록으로
        </Button>
      </div>

      {isEditing ? (
        <EditForm
          experience={experience}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
          isPending={updateExp.isPending}
        />
      ) : (
        <DetailView
          experience={experience}
          onEdit={() => setIsEditing(true)}
          onDelete={handleDelete}
          isDeleting={deleteExp.isPending}
        />
      )}
    </div>
  );
}
