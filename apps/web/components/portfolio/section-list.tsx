'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PortfolioSectionDto } from '@2chi/shared';

const SECTION_TYPE_LABEL: Record<string, string> = {
  INTRO: '소개',
  PROJECT: '프로젝트',
  SKILLS: '기술',
  ACHIEVEMENT: '성과',
  CUSTOM: '기타',
};

const SECTION_TYPE_COLOR: Record<string, string> = {
  INTRO: 'bg-blue-50 text-blue-700',
  PROJECT: 'bg-green-50 text-green-700',
  SKILLS: 'bg-amber-50 text-amber-700',
  ACHIEVEMENT: 'bg-purple-50 text-purple-700',
  CUSTOM: 'bg-slate-100 text-slate-600',
};

interface SectionListProps {
  sections: PortfolioSectionDto[];
  selectedId: string | null;
  onSelect: (section: PortfolioSectionDto) => void;
  onMoveUp: (sectionId: string) => void;
  onMoveDown: (sectionId: string) => void;
}

export function SectionList({
  sections,
  selectedId,
  onSelect,
  onMoveUp,
  onMoveDown,
}: SectionListProps) {
  const sorted = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-1">
      {sorted.map((section, idx) => {
        const isSelected = section.id === selectedId;
        const typeLabel = SECTION_TYPE_LABEL[section.type] ?? section.type;
        const typeColor = SECTION_TYPE_COLOR[section.type] ?? SECTION_TYPE_COLOR.CUSTOM;

        return (
          <div
            key={section.id}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
              isSelected
                ? 'bg-slate-100 border border-slate-300'
                : 'hover:bg-slate-50 border border-transparent'
            }`}
            onClick={() => onSelect(section)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-block rounded-full text-xs font-medium px-2 py-0.5 ${typeColor}`}
                >
                  {typeLabel}
                </span>
                <span className="text-sm text-slate-700 truncate">{section.title}</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp(section.id);
                }}
                disabled={idx === 0}
                className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="위로"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown(section.id);
                }}
                disabled={idx === sorted.length - 1}
                className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="아래로"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
