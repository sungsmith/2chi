interface ExperienceSummary {
  title: string;
  type: string;
  situation?: string | null;
  task?: string | null;
  action?: string | null;
  result?: string | null;
  tags: string[];
}

export function buildDraftPrompt(
  question: string,
  charLimit: number | null,
  experiences: ExperienceSummary[],
  jobTitle?: string,
  companyName?: string,
  companyInfo?: { summary?: string; keyCompetencies?: string[] },
): string {
  const limitGuide = charLimit ? `글자 수 제한: ${charLimit}자 이내` : '글자 수 제한 없음';
  const target = [companyName, jobTitle].filter(Boolean).join(' ');
  const expText = experiences
    .map(
      (e) =>
        `[${e.type}] ${e.title}\n` +
        `상황: ${e.situation || '-'}\n` +
        `과제: ${e.task || '-'}\n` +
        `행동: ${e.action || '-'}\n` +
        `결과: ${e.result || '-'}\n` +
        `역량 태그: ${e.tags.join(', ') || '-'}`,
    )
    .join('\n\n');

  const companySection =
    companyInfo
      ? `\n## 기업 정보 (참고)\n${companyInfo.summary || ''}\n핵심 역량: ${(companyInfo.keyCompetencies ?? []).join(', ') || '-'}\n`
      : '';

  return `당신은 취업 자소서 전문 작가입니다. 아래 지원자의 이력을 바탕으로 자소서 항목의 초안을 작성하세요.

${target ? `지원 대상: ${target}` : ''}
${limitGuide}
${companySection}
## 지원자 이력
${expText || '이력 정보 없음'}

## 자소서 항목
${question}

## 작성 지침
- 지원자의 실제 경험을 바탕으로 구체적으로 작성
- STAR(상황-과제-행동-결과) 구조를 자연스럽게 녹여낼 것
- 수치와 구체적 성과를 포함할 것
- 글자 수 제한을 반드시 준수할 것
- 자소서 본문만 출력하고 별도 설명 금지

자소서 초안:`;
}
