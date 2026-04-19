import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { buildCompanyAnalysisPrompt } from './prompts/company.prompt';
import { buildMatchingPrompt } from './prompts/matching.prompt';

@Injectable()
export class AiService {
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async analyzeCompany(
    companyName: string,
    jobTitle?: string,
    additionalContext?: string,
  ): Promise<{
    summary: string;
    products: string[];
    recentNews: string[];
    keyCompetencies: string[];
    culture: string | null;
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: buildCompanyAnalysisPrompt(companyName, jobTitle, additionalContext) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });
    const content = response.choices[0].message.content;
    if (!content) throw new Error('AI 응답이 없습니다.');
    return JSON.parse(content);
  }

  async calculateMatchingScore(
    requiredCompetencies: string[],
    experiences: Array<{
      title: string;
      action?: string | null;
      result?: string | null;
      tags: string[];
    }>,
  ): Promise<{ score: number; matchedKeywords: string[]; missingKeywords: string[]; summary: string }> {
    if (!requiredCompetencies.length) {
      return { score: 0, matchedKeywords: [], missingKeywords: [], summary: '역량 정보가 없습니다.' };
    }
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: buildMatchingPrompt(requiredCompetencies, experiences) }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });
    const content = response.choices[0].message.content;
    if (!content) throw new Error('AI 응답이 없습니다.');
    return JSON.parse(content);
  }
}
