export function buildResumeParsePrompt(resumeText: string): string {
  return `당신은 이력서 파싱 전문가입니다. 아래 이력서 텍스트에서 각 경험 항목을 추출하고 STAR 구조로 변환하세요.

이력서 텍스트:
${resumeText}

다음 JSON 형식으로 반환하세요:
{
  "experiences": [
    {
      "title": "경험 제목 (예: 스타트업 백엔드 개발, 졸업 프로젝트 팀장)",
      "type": "WORK | PROJECT | ACTIVITY | EDUCATION",
      "companyName": "회사/기관명 (없으면 null)",
      "startDate": "시작일 (YYYY-MM 형식, 모를 경우 null)",
      "endDate": "종료일 (YYYY-MM 형식, 재직/진행 중이면 null)",
      "situation": "Situation: 당시 상황과 맥락 (1~3문장)",
      "task": "Task: 맡은 역할과 목표 (1~2문장)",
      "action": "Action: 구체적으로 취한 행동과 방법 (2~4문장)",
      "result": "Result: 정성적 결과와 배운 점 (1~2문장)",
      "resultMetric": "정량적 성과 (예: 처리 속도 30% 개선, 없으면 null)",
      "tags": ["추출된 기술 스택 또는 역량 키워드 목록"],
      "confidence": 0~100 사이의 정수
    }
  ],
  "overallConfidence": 0~100 사이의 정수
}

파싱 규칙:
- type 분류 기준:
  - WORK: 인턴, 정규직, 아르바이트 등 직장 경험
  - PROJECT: 개인/팀 프로젝트, 졸업 작품, 사이드 프로젝트
  - ACTIVITY: 동아리, 대외활동, 봉사, 공모전, 자격증
  - EDUCATION: 학교, 학위, 수강, 부트캠프
- 날짜는 반드시 YYYY-MM 형식으로 변환. 연도만 있으면 YYYY-01로 처리.
- STAR 구조가 이력서에 명시되지 않은 경우, 가용 정보로 합리적으로 추론하여 채워라.
- tags: 기술 스택(React, Python 등), 역량(리더십, 데이터 분석 등) 키워드를 최대 8개 추출.
- confidence: 각 경험 항목의 STAR 변환 완성도 (0=정보 부족, 100=완벽한 STAR).
- overallConfidence: 전체 이력서 파싱 신뢰도 평균.
- JSON 외의 텍스트 출력 금지.`;
}
