import { ExperienceDto } from './experience';

export interface ResumeProfileDto {
  id: string;
  userId: string;
  name: string;
  description: string;
  selectedExperienceIds: string[];
  experiences?: ExperienceDto[];
  createdAt: string;
  updatedAt: string;
}
