export type SectionType = 'INTRO' | 'EXPERIENCE' | 'SKILL' | 'ACHIEVEMENT' | 'CUSTOM';

export interface SectionContent {
  heading: string;
  body: string;
}

export interface CareerDescriptionSectionDto {
  id: string;
  careerDescriptionId: string;
  experienceId: string | null;
  sectionType: SectionType;
  order: number;
  content: SectionContent;
}

export interface CareerDescriptionDto {
  id: string;
  userId: string;
  title: string;
  versionLabel: string | null;
  targetJobType: string | null;
  pdfUrl: string | null;
  sections: CareerDescriptionSectionDto[];
  createdAt: string;
  updatedAt: string;
}
