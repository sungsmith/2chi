interface ExperienceSummary {
  title: string;
  action?: string | null;
  result?: string | null;
  tags: string[];
}

export function buildMatchingPrompt(
  requiredCompetencies: string[],
  experiences: ExperienceSummary[],
): string {
  const expText = experiences
    .map(
      (e, i) =>
        `[이력 ${i + 1}] ${e.title}
행동: ${e.action || '미입력'}
결과: ${e.result || '미입력'}
태그: ${e.tags.join(', ') || '없음'}`,
    )
    .join('\n\n');

  return `당신은 취업 역량 매칭 전문가입니다. 지원자의 이력이 직무 필수역량과 얼마나 일치하는지 평가하세요.

필수 역량:
${requiredCompetencies.join(', ')}

지원자 이력:
${expText || '(이력 없음)'}

다음 JSON 형식으로 반환하세요:
{
  "score": 0~100 사이의 정수,
  "matchedKeywords": ["매칭된 역량1", "매칭된 역량2"],
  "missingKeywords": ["부족한 역량1", "부족한 역량2"],
  "summary": "매칭도 평가 한 줄 요약"
}

평가 기준:
- score: 필수역량 중 이력에서 증명된 역량의 비율 (0~100)
- matchedKeywords: 이력에서 확인 가능한 역량
- missingKeywords: 이력에 없거나 약한 역량
- summary: "~역량이 강점이나 ~역량 보강 필요" 형태로 한 문장`;
}
