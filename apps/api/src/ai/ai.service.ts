import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { buildCompanyAnalysisPrompt } from './prompts/company.prompt';
import { buildMatchingPrompt } from './prompts/matching.prompt';
import { buildCareerDescSectionDraftPrompt } from './prompts/career-description.prompt';
import { buildScrapeParsePrompt, buildCompetencyGapPrompt } from './prompts/scrape.prompt';

interface CompetencyGapDto {
  required: string[];
  preferred: string[];
  myMatched: string[];
  myMissing: string[];
  score: number;
  summary: string;
}

interface StarExperience {
  title: string;
  type: string;
  companyName?: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  resultMetric?: string;
  tags?: string[];
}

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
  ): Promise<
    | {
        summary: string;
        products: string[];
        recentNews: string[];
        keyCompetencies: string[];
        culture: string | null;
      }
    | { error: string; message: string }
  > {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: buildCompanyAnalysisPrompt(companyName, jobTitle, additionalContext) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });
      const content = response.choices[0].message.content;
      if (!content) throw new Error('AI 응답이 없습니다.');
      return JSON.parse(content) as
        | {
            summary: string;
            products: string[];
            recentNews: string[];
            keyCompetencies: string[];
            culture: string | null;
          }
        | { error: string; message: string };
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error('AI 응답 파싱에 실패했습니다.');
      }
      throw err;
    }
  }

  async streamChatCompletion(prompt: string) {
    return this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      stream: true as const,
      temperature: 0.7,
    });
  }

  async rankExperiences(
    question: string,
    experiences: Array<{
      id: string;
      title: string;
      type: string;
      situation?: string | null;
      task?: string | null;
      action?: string | null;
      result?: string | null;
      tags: string[];
    }>,
  ): Promise<Array<{ experienceId: string; score: number; reason: string }>> {
    const expText = experiences
      .map(
        (e) =>
          `id: ${e.id}\n제목: ${e.title}\n유형: ${e.type}\n` +
          `핵심 키워드: ${e.tags.join(', ') || '-'}`,
      )
      .join('\n\n');

    const prompt = `자소서 문항과 지원자의 경험 목록이 주어집니다.
각 경험이 해당 문항 답변에 얼마나 적합한지 0-100 점수를 매기고, 이유를 한 줄로 설명하세요.

자소서 문항:
${question}

경험 목록:
${expText}

반드시 아래 JSON 형식으로만 응답하세요:
{"rankings": [
  {"experienceId": "...", "score": 85, "reason": "팀 협업 경험이 직접적으로 적용 가능"},
  ...
]}
모든 경험에 대해 점수를 매기되, score 내림차순으로 정렬하세요.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('AI 응답이 없습니다.');

    const parsed = JSON.parse(content) as { rankings: Array<{ experienceId: string; score: number; reason: string }> };
    return (parsed.rankings ?? []).sort((a, b) => b.score - a.score);
  }

  async *streamCareerDescSectionDraft(
    sectionType: string,
    experiences: StarExperience[],
    targetJobType?: string,
  ): AsyncGenerator<string> {
    const prompt = buildCareerDescSectionDraftPrompt(sectionType, experiences, targetJobType);
    const stream = await this.streamChatCompletion(prompt);
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) yield delta;
    }
  }

  private extractTextFromHtml(html: string): string {
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    return text.slice(0, 8000);
  }

  async parseJobPostingFromHtml(htmlText: string): Promise<{
    title: string;
    company: string;
    requiredCompetencies: string[];
    preferredCompetencies: string[];
    deadline?: string;
    rawText: string;
  }> {
    const rawText = this.extractTextFromHtml(htmlText);
    const prompt = buildScrapeParsePrompt(rawText);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });
      const content = response.choices[0].message.content;
      if (!content) throw new Error('AI 응답이 없습니다.');
      const parsed = JSON.parse(content) as {
        title: string;
        company: string;
        requiredCompetencies: string[];
        preferredCompetencies: string[];
        deadline?: string | null;
      };
      return {
        title: parsed.title ?? '',
        company: parsed.company ?? '',
        requiredCompetencies: parsed.requiredCompetencies ?? [],
        preferredCompetencies: parsed.preferredCompetencies ?? [],
        ...(parsed.deadline ? { deadline: parsed.deadline } : {}),
        rawText,
      };
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error('AI 응답 파싱에 실패했습니다.');
      }
      throw err;
    }
  }

  async analyzeCompetencyGap(
    requiredCompetencies: string[],
    preferredCompetencies: string[],
    myExperiences: Array<{ title: string; tags: string[]; situation?: string; action?: string }>,
  ): Promise<CompetencyGapDto> {
    const prompt = buildCompetencyGapPrompt(requiredCompetencies, preferredCompetencies, myExperiences);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });
      const content = response.choices[0].message.content;
      if (!content) throw new Error('AI 응답이 없습니다.');
      return JSON.parse(content) as CompetencyGapDto;
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error('AI 응답 파싱에 실패했습니다.');
      }
      throw err;
    }
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
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: buildMatchingPrompt(requiredCompetencies, experiences) }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });
      const content = response.choices[0].message.content;
      if (!content) throw new Error('AI 응답이 없습니다.');
      return JSON.parse(content) as {
        score: number;
        matchedKeywords: string[];
        missingKeywords: string[];
        summary: string;
      };
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error('AI 응답 파싱에 실패했습니다.');
      }
      throw err;
    }
  }
}
