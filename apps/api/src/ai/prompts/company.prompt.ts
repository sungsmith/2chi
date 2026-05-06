export function buildCompanyAnalysisPrompt(
  companyName: string,
  jobPostingText?: string,
  additionalContext?: string,
): string {
  const jobSection = jobPostingText
    ? `\n채용공고 전문:\n"""\n${jobPostingText.slice(0, 8000)}\n"""\n`
    : '';

  const contextSection = additionalContext
    ? `\n추가 정보:\n${additionalContext}\n`
    : '';

  return `당신은 취업 컨설턴트입니다. 아래 정보를 바탕으로 기업과 채용 직무를 통합 분석하여 JSON을 반환하세요.

기업명: ${companyName}
${jobSection}${contextSection}
다음 JSON 스키마를 정확히 따르세요:
{
  "summary": "200자 이상의 회사 소개 (설립연도, 주요 사업, 시장 위치 포함)",
  "products": ["주요 제품/서비스 5개 이상 (구체적인 이름과 설명 포함)"],
  "recentNews": ["최근 1~2년 주요 동향 5개 이상 (성장, 인수, 출시 등)"],
  "culture": "조직 문화 설명 (일하는 방식, 가치관, 복지 등 100자 이상)",
  "keyCompetencies": ["기업이 전반적으로 요구하는 핵심 역량 5개 이상 (구체적)"],
  "jobTitle": "채용공고에서 추출한 직무명. 공고 없으면 빈 문자열",
  "requiredCompetencies": ["채용공고 기반 필수 역량 목록. 공고 없으면 빈 배열"],
  "preferredCompetencies": ["채용공고 기반 우대 역량 목록. 공고 없으면 빈 배열"],
  "jobSummary": "직무 한 줄 요약. 공고 없으면 빈 문자열"
}

분석 규칙:
- keyCompetencies: 기업 문화·전략에서 도출한 공통 역량 (공고 유무 무관)
- requiredCompetencies / preferredCompetencies: 채용공고가 있을 때만 채움
- 공고와 기업 분석이 모두 있을 때: 두 소스를 종합해 keyCompetencies를 더 구체화할 것
- 절대 허구의 내용을 사실인 것처럼 작성하지 마라
- 기업명이 무의미한 문자열인 경우에만 아래처럼 응답:
  {"error": "invalid_company", "message": "유효한 기업명을 입력해주세요."}
- JSON 외의 텍스트 출력 금지`;
}
