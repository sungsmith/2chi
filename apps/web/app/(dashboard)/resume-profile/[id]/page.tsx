'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ExperienceSelector } from '@/components/resume-profile/experience-selector';
import { useResumeProfile, useUpdateResumeProfile } from '@/hooks/use-resume-profiles';
import { useExperiences } from '@/hooks/use-experiences';

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

export default function ResumeProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: profile, isLoading: profileLoading } = useResumeProfile(id);
  const { data: allExperiences, isLoading: expLoading } = useExperiences();
  const update = useUpdateResumeProfile(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setDescription(profile.description);
      setSelectedIds(profile.selectedExperienceIds);
    }
  }, [profile]);

  const handleSave = async () => {
    await update.mutateAsync({
      name,
      description,
      selectedExperienceIds: selectedIds,
    });
    setIsDirty(false);
  };

  const handleNameChange = (v: string) => { setName(v); setIsDirty(true); };
  const handleDescChange = (v: string) => { setDescription(v); setIsDirty(true); };
  const handleIdsChange = (ids: string[]) => { setSelectedIds(ids); setIsDirty(true); };

  if (profileLoading) {
    return <div className="text-sm text-slate-500">불러오는 중...</div>;
  }

  if (!profile) {
    return <div className="text-sm text-red-500">프로필을 찾을 수 없습니다.</div>;
  }

  const selectedExperiences = (allExperiences ?? []).filter((exp) =>
    selectedIds.includes(exp.id),
  );

  return (
    <div className="max-w-3xl space-y-6">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/resume-profile')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>
        <Button
          onClick={handleSave}
          disabled={!isDirty || update.isPending}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {update.isPending ? '저장 중...' : '저장'}
        </Button>
      </div>

      {/* 프로필 기본 정보 편집 */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">프로필 정보</h2>
        <div className="space-y-1.5">
          <Label htmlFor="name">
            프로필 이름 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="마케팅용 이력, 개발자 이직용 등"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">설명</Label>
          <Textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => handleDescChange(e.target.value)}
            placeholder="이 프로필의 목적이나 대상 직무를 간단히 적어주세요."
          />
        </div>
      </div>

      {/* 전체 경험 선택 */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">전체 경험</h2>
          <span className="text-xs text-slate-400">
            {selectedIds.length}개 선택됨
          </span>
        </div>
        {expLoading ? (
          <p className="text-sm text-slate-500">불러오는 중...</p>
        ) : (
          <ExperienceSelector
            experiences={allExperiences ?? []}
            selectedIds={selectedIds}
            onChange={handleIdsChange}
          />
        )}
      </div>

      {/* 선택된 경험 목록 */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">선택된 경험</h2>
        {selectedExperiences.length === 0 ? (
          <p className="text-sm text-slate-400 py-2 text-center">
            선택된 경험이 없습니다. 위에서 경험을 선택하세요.
          </p>
        ) : (
          <div className="space-y-3">
            {selectedExperiences.map((exp) => {
              const period = (() => {
                const start = exp.startDate?.slice(0, 7);
                const end = exp.isCurrent ? '현재' : exp.endDate?.slice(0, 7);
                if (!start && !end) return null;
                return `${start ?? ''} ~ ${end ?? ''}`;
              })();

              return (
                <div
                  key={exp.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-block rounded-full text-xs font-medium px-2.5 py-0.5 ${TYPE_COLOR[exp.type] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {TYPE_LABEL[exp.type] ?? exp.type}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{exp.title}</span>
                    </div>
                    {exp.companyName && (
                      <p className="text-xs text-slate-500 mt-0.5">{exp.companyName}</p>
                    )}
                    {period && <p className="text-xs text-slate-400 mt-0.5">{period}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
