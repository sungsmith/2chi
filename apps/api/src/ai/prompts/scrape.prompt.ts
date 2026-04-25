export function buildScrapeParsePrompt(text: string): string {
  return `당신은 채용공고 파싱 전문가입니다. 아래 채용공고 텍스트에서 구조화된 정보를 추출하세요.

채용공고 텍스트:
${text}

다음 JSON 형식으로 반환하세요:
{
  "title": "채용 공고 직무명 (예: 프론트엔드 개발자)",
  "company": "회사명",
  "requiredCompetencies": ["필수 역량 또는 기술 스택 목록 (예: React, TypeScript)"],
  "preferredCompetencies": ["우대 사항 역량 또는 기술 스택 목록"],
  "deadline": "지원 마감일 (YYYY-MM-DD 형식, 없으면 null)"
}

파싱 규칙:
- title: 공고에서 채용 직무명을 추출. 없으면 빈 문자열.
- company: 채용 기업명. 없으면 빈 문자열.
- requiredCompetencies: 필수 자격요건/기술스택을 개별 항목으로 분리. 없으면 빈 배열.
- preferredCompetencies: 우대사항을 개별 항목으로 분리. 없으면 빈 배열.
- deadline: YYYY-MM-DD 형식만 허용. 추출 불가시 null.
- JSON 외의 텍스트 출력 금지`;
}

export function buildCompetencyGapPrompt(
  requiredCompetencies: string[],
  preferredCompetencies: string[],
  myExperiences: Array<{ title: string; tags: string[]; situation?: string; action?: string }>,
): string {
  const expText = myExperiences
    .map(
      (e, i) =>
        `[이력 ${i + 1}] ${e.title}
태그: ${e.tags.join(', ') || '없음'}
상황: ${e.situation || '미입력'}
행동: ${e.action || '미입력'}`,
    )
    .join('\n\n');

  return `당신은 취업 역량 갭 분석 전문가입니다. 채용공고 요구 역량과 지원자의 이력을 비교하여 역량 갭을 분석하세요.

필수 역량:
${requiredCompetencies.join(', ') || '없음'}

우대 역량:
${preferredCompetencies.join(', ') || '없음'}

지원자 이력:
${expText || '(이력 없음)'}

다음 JSON 형식으로 반환하세요:
{
  "required": ["분석에 사용된 필수 역량 목록"],
  "preferred": ["분석에 사용된 우대 역량 목록"],
  "myMatched": ["지원자 이력에서 확인된 매칭 역량"],
  "myMissing": ["지원자 이력에 없거나 부족한 역량"],
  "score": 0~100 사이의 정수,
  "summary": "역량 갭 분석 한 줄 요약"
}

평가 기준:
- myMatched: 필수/우대 역량 중 이력의 태그, 상황, 행동에서 확인 가능한 역량
- myMissing: 필수 역량 중 이력에 없거나 약한 역량 우선, 우대 역량도 포함
- score: 필수 역량 대비 매칭 비율 (0~100). 우대 역량 일치 시 보너스 점수 부여
- summary: "~역량이 강점이나 ~역량 보강 필요" 형태로 한 문장
- JSON 외의 텍스트 출력 금지`;
}
