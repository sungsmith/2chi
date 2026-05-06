interface StarExperience {
  title: string;
  type: string;
  companyName?: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  resultMetric?: string;
  tags?: string[];
}

const SECTION_PURPOSE: Record<string, string> = {
  INTRO: '자기소개 — 지원자의 역량 요약과 지원 동기를 간결하게 소개한다.',
  EXPERIENCE: '경력 기술 — STAR 구조의 경험을 직무 연관성이 드러나도록 서술한다.',
  SKILL: '기술/역량 — 보유 기술과 역량을 구체적 근거와 함께 기술한다.',
  ACHIEVEMENT: '성과 — 수치와 결과 중심으로 주요 성과를 기술한다.',
  CUSTOM: '자유 형식 — 섹션 목적에 맞게 자유롭게 작성한다.',
};

export function buildCareerDescSectionDraftPrompt(
  sectionType: string,
  experiences: StarExperience[],
  targetJobType?: string,
): string {
  const purpose = SECTION_PURPOSE[sectionType] ?? SECTION_PURPOSE['CUSTOM'];

  const expText = experiences
    .map((e) => {
      const company = e.companyName ? ` (${e.companyName})` : '';
      return (
        `[${e.type}] ${e.title}${company}\n` +
        `상황: ${e.situation || '-'}\n` +
        `과제: ${e.task || '-'}\n` +
        `행동: ${e.action || '-'}\n` +
        `결과: ${e.result || '-'}${e.resultMetric ? ` (${e.resultMetric})` : ''}\n` +
        `역량 태그: ${(e.tags ?? []).join(', ') || '-'}`
      );
    })
    .join('\n\n');

  const jobLine = targetJobType
    ? `\n지원 직무: ${targetJobType} — 해당 직무에 적합한 키워드와 역량 표현을 포함하라.`
    : '';

  return `당신은 경력기술서 전문 작가입니다. 아래 지원자의 STAR 이력을 바탕으로 경력기술서 섹션 초안을 한국어로 작성하세요.

## 섹션 유형
${sectionType}: ${purpose}${jobLine}

## 지원자 이력
${expText || '이력 정보 없음'}

## 작성 지침
- 반드시 한국어로 작성한다.
- 경력기술서 특유의 간결하고 전문적인 문체를 사용한다 (자소서와 달리 서술형 감정 표현 최소화).
- STAR 구조(상황·과제·행동·결과)를 자연스럽게 녹여낸다.
- 수치와 구체적 성과를 포함한다.
- 섹션 분량은 300~500자를 권장한다.
- 본문만 출력하고 제목·설명·마크다운 기호는 추가하지 않는다.

경력기술서 섹션 초안:`;
}
