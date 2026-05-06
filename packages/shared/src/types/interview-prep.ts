export type InterviewQuestionType = 'COMPETENCY' | 'BEHAVIORAL' | 'TECHNICAL' | 'SITUATIONAL';

export interface InterviewAnswerDto {
  id: string;
  interviewPrepId: string;
  question: string;
  questionType: InterviewQuestionType;
  answer: string;
  aiFeedback: string | null;
  score: number | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewPrepDto {
  id: string;
  userId: string;
  jobPostingId: string | null;
  title: string;
  answers: InterviewAnswerDto[];
  createdAt: string;
  updatedAt: string;
}
