'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import type { ParsedExperience } from '@2chi/shared';

const TYPE_LABEL: Record<string, string> = {
  WORK: '경력',
  PROJECT: '프로젝트',
  ACTIVITY: '활동',
  EDUCATION: '학력',
};

const TYPE_COLOR: Record<string, string> = {
  WORK: 'bg-blue-50 text-blue-700',
  PROJECT: 'bg-purple-50 text-purple-700',
  ACTIVITY: 'bg-green-50 text-green-700',
  EDUCATION: 'bg-amber-50 text-amber-700',
};

interface ParsedExperienceItemProps {
  experience: ParsedExperience;
  checked: boolean;
  onChange: (updated: ParsedExperience) => void;
  onCheckChange: (checked: boolean) => void;
}

export function ParsedExperienceItem({
  experience,
  checked,
  onChange,
  onCheckChange,
}: ParsedExperienceItemProps) {
  const [expanded, setExpanded] = useState(false);

  function update(patch: Partial<ParsedExperience>) {
    onChange({ ...experience, ...patch });
  }

  const period = [experience.startDate, experience.endDate].filter(Boolean).join(' ~ ');

  return (
    <div className={['bg-white rounded-lg border shadow-sm transition-colors', checked ? 'border-blue-200' : 'border-slate-200'].join(' ')}>
      <div className="flex items-start gap-3 p-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckChange(e.target.checked)}
          className="mt-0.5 rounded border-slate-300 accent-blue-600"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={['rounded-full text-xs font-medium px-2.5 py-0.5', TYPE_COLOR[experience.type] ?? 'bg-slate-100 text-slate-600'].join(' ')}>
              {TYPE_LABEL[experience.type] ?? experience.type}
            </span>
            <span className="text-sm font-medium text-slate-900 truncate">{experience.title}</span>
          </div>
          {experience.companyName && (
            <p className="text-xs text-slate-500 mt-0.5">{experience.companyName}</p>
          )}
          {period && <p className="text-xs text-slate-400 mt-0.5">{period}</p>}
          {experience.tags && experience.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {experience.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-slate-100 text-slate-600 text-xs px-2 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-slate-400 hover:text-slate-600 shrink-0 p-1"
          aria-label={expanded ? '접기' : '펼치기'}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">제목</label>
            <Input
              value={experience.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="경험 제목"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">상황 (Situation)</label>
            <Textarea
              rows={2}
              value={experience.situation ?? ''}
              onChange={(e) => update({ situation: e.target.value })}
              placeholder="어떤 상황이었나요?"
              className="resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">과제 (Task)</label>
            <Textarea
              rows={2}
              value={experience.task ?? ''}
              onChange={(e) => update({ task: e.target.value })}
              placeholder="어떤 목표/과제가 있었나요?"
              className="resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">행동 (Action)</label>
            <Textarea
              rows={3}
              value={experience.action ?? ''}
              onChange={(e) => update({ action: e.target.value })}
              placeholder="구체적으로 어떤 행동을 했나요?"
              className="resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">결과 (Result)</label>
            <Textarea
              rows={2}
              value={experience.result ?? ''}
              onChange={(e) => update({ result: e.target.value })}
              placeholder="어떤 결과를 얻었나요?"
              className="resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
