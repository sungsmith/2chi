export function buildCompanyAnalysisPrompt(
  companyName: string,
  jobTitle?: string,
  additionalContext?: string,
): string {
  return `당신은 취업 컨설턴트입니다. 구직자가 ${companyName}에 지원하기 위한 심층 기업 분석을 JSON으로 작성하세요.
${jobTitle ? `\n지원 직무: ${jobTitle}` : ''}
${additionalContext ? `\n추가 정보:\n${additionalContext}` : ''}

다음 JSON 스키마를 정확히 따르세요:
{
  "summary": "200자 이상의 회사 소개 (설립연도, 주요 사업, 시장 위치 포함)",
  "products": ["주요 제품/서비스 5개 이상 (구체적인 이름과 설명 포함)"],
  "recentNews": ["최근 1~2년 주요 동향 5개 이상 (성장, 인수, 출시 등)"],
  "keyCompetencies": ["이 기업이 인재에게 요구하는 핵심 역량 7개 이상 (구체적)"],
  "culture": "조직 문화 설명 (일하는 방식, 가치관, 복지 등 100자 이상)"
}

⚠️ 중요 규칙:
- 기업명이 1~2글자 이하이거나 초성/특수문자/숫자로만 이루어진 무의미한 문자열인 경우에만 아래처럼 응답:
{"error": "invalid_company", "message": "유효한 기업명을 입력해주세요."}
- 한국어나 영어로 구성된 기업명이라면 실존 여부가 불확실해도 분석을 진행하세요
- 절대 허구의 내용을 사실인 것처럼 작성하지 마세요
- JSON 외의 텍스트 출력 금지`;
}
