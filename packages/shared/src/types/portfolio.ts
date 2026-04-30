export type PortfolioSectionType = 'INTRO' | 'PROJECT' | 'SKILLS' | 'ACHIEVEMENT' | 'CUSTOM';

export interface PortfolioSectionDto {
  id: string;
  portfolioId: string;
  type: PortfolioSectionType;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioDto {
  id: string;
  userId: string;
  title: string;
  templateId: string;
  versionLabel: string;
  sections: PortfolioSectionDto[];
  createdAt: string;
  updatedAt: string;
}
