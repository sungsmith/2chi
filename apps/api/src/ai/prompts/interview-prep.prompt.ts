export function buildInterviewQuestionsPrompt(
  jobTitle: string,
  jobDescription: string,
  experienceSummaries: string[],
  count: number,
  questionTypes?: string[],
): string {
  const typeConstraint =
    questionTypes && questionTypes.length > 0
      ? `다음 유형에서만 질문을 생성하세요: ${questionTypes.join(', ')}`
      : '모든 유형(COMPETENCY, BEHAVIORAL, TECHNICAL, SITUATIONAL)을 고르게 포함하세요.';

  const expText =
    experienceSummaries.length > 0
      ? experienceSummaries.map((s, i) => `[경험 ${i + 1}] ${s}`).join('\n')
      : '(이력 정보 없음)';

  return `당신은 채용 면접 전문가입니다. 아래 직무와 지원자 이력을 바탕으로 예상 면접 질문 ${count}개를 생성하세요.

직무: ${jobTitle}

채용공고 내용:
${jobDescription}

지원자 이력 요약:
${expText}

질문 유형 조건:
${typeConstraint}

질문 유형 정의:
- COMPETENCY: 역량·전문성 확인 질문 (예: "~경험에 대해 말해주세요")
- BEHAVIORAL: 과거 행동 기반 질문 (예: "~했던 상황을 설명해주세요")
- TECHNICAL: 직무 기술·지식 질문 (예: "~기술을 어떻게 활용하셨나요")
- SITUATIONAL: 가상 상황 판단 질문 (예: "~상황이라면 어떻게 하시겠습니까")

반드시 아래 JSON 배열 형식으로만 응답하세요:
[
  { "question": "질문 내용", "questionType": "COMPETENCY", "order": 0 },
  { "question": "질문 내용", "questionType": "BEHAVIORAL", "order": 1 }
]

주의사항:
- order는 0부터 시작하는 순번
- questionType은 COMPETENCY | BEHAVIORAL | TECHNICAL | SITUATIONAL 중 하나
- 지원자의 실제 이력과 직무 요건을 연결한 구체적인 질문 생성
- 총 ${count}개 생성`;
}

export function buildInterviewFeedbackPrompt(
  question: string,
  questionType: string,
  answer: string,
): string {
  return `당신은 채용 면접 코치입니다. 지원자의 면접 답변을 평가하고 구체적인 개선 방향을 제시하세요.

면접 질문 (유형: ${questionType}):
${question}

지원자 답변:
${answer}

평가 기준:
- 구체성 (30점): 수치·사실 기반의 구체적 근거 제시 여부
- 논리성 (30점): STAR 구조의 명확한 흐름 (상황→과제→행동→결과)
- 직무 연관성 (40점): 질문 의도와 직무 요건에 부합하는 내용

반드시 아래 JSON 형식으로만 응답하세요:
{
  "feedback": "구체적 개선 제안 (잘된 점 1~2가지 + 보완할 점 1~2가지 포함, 200자 이내)",
  "score": 0~100 사이의 정수
}

주의사항:
- feedback은 칭찬만 하지 말고 실질적 개선 방향을 포함할 것
- score는 세 기준 점수의 합산 (구체성 30 + 논리성 30 + 직무연관성 40)`;
}
