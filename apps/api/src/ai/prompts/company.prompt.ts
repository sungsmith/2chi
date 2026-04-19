export function buildCompanyAnalysisPrompt(
  companyName: string,
  jobTitle?: string,
  additionalContext?: string,
): string {
  return `당신은 취업 정보 분석가입니다. 아래 기업과 직무에 대해 분석하세요.

기업명: ${companyName}
${jobTitle ? `지원 직무: ${jobTitle}` : ''}
${additionalContext ? `추가 정보:\n${additionalContext}` : ''}

다음 JSON 형식으로 반환하세요:
{
  "summary": "기업 한 줄 요약 (사업 모델, 규모, 특징)",
  "products": ["주요 제품/서비스1", "주요 제품/서비스2"],
  "recentNews": ["최근 이슈/동향1", "최근 이슈/동향2"],
  "keyCompetencies": ["필요 역량1", "필요 역량2", "필요 역량3", "필요 역량4", "필요 역량5"],
  "culture": "기업 문화 한 줄 설명 (없으면 null)"
}

주의사항:
- 한국어로 작성
- keyCompetencies는 이 기업·직무에서 실제로 중요시하는 역량을 5~8개
- 확실하지 않은 정보는 포함하지 말 것
- 학습 데이터 기준으로 알고 있는 정보만 사용`;
}
