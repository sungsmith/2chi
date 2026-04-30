const SECTION_PURPOSE: Record<string, string> = {
  INTRO: '자기소개 — 지원자의 강점과 커리어 방향을 간결하게 소개한다.',
  PROJECT: '프로젝트 — STAR 구조를 바탕으로 프로젝트 경험을 구체적으로 기술한다.',
  SKILLS: '기술/역량 — 보유 기술과 역량을 구체적 근거와 함께 기술한다.',
  ACHIEVEMENT: '성과 — 수치와 결과 중심으로 주요 성과를 기술한다.',
  CUSTOM: '자유 형식 — 섹션 목적에 맞게 자유롭게 작성한다.',
};

export function buildPortfolioSectionDraftPrompt(
  sectionType: string,
  sectionTitle: string,
  experiences: Array<{ title: string; situation: string; task: string; action: string; result: string }>,
  targetField?: string,
): string {
  const purpose = SECTION_PURPOSE[sectionType] ?? SECTION_PURPOSE['CUSTOM'];

  const expText = experiences
    .map(
      (e, i) =>
        `[경험 ${i + 1}] ${e.title}\n` +
        `- 상황: ${e.situation || '-'}\n` +
        `- 과제: ${e.task || '-'}\n` +
        `- 행동: ${e.action || '-'}\n` +
        `- 결과: ${e.result || '-'}`,
    )
    .join('\n\n');

  const jobLine = targetField
    ? `\n목표 직무: ${targetField} — 해당 직무에 적합한 키워드와 역량 표현을 포함하라.`
    : '';

  return `당신은 취업 포트폴리오 작성 전문가입니다. 아래 지원자의 STAR 이력을 바탕으로 포트폴리오 섹션 초안을 한국어로 작성하세요.

## 섹션 정보
제목: ${sectionTitle}
유형: ${sectionType} — ${purpose}${jobLine}

## 지원자 이력
${expText || '이력 정보 없음'}

## 작성 지침
- 반드시 한국어로 작성한다.
- 포트폴리오 독자(채용 담당자)를 염두에 둔 전문적 문체를 사용한다.
- STAR 구조(상황·과제·행동·결과)를 자연스럽게 녹여낸다.
- 구체적 수치와 성과를 포함한다.
- 섹션 분량은 300~500자를 권장한다.
- 마크다운 형식 사용 가능 (굵게, 목록 등).

포트폴리오 섹션 초안:`;
}
