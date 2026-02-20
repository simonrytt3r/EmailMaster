import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ResearchRequest, ResearchResult } from '@/lib/types';

export const runtime = 'nodejs';

function buildResearchPrompt(params: ResearchRequest): string {
  return `Research this prospect for a cold outreach email. Be concise.

Person: ${params.personName || 'Unknown'}
Title: ${params.jobTitle || 'Unknown'}
Org: ${params.company}
${params.linkedinUrl ? `LinkedIn: ${params.linkedinUrl}` : ''}
${params.websiteUrl ? `Website: ${params.websiteUrl}` : ''}

Do ONE focused search. Return ONLY this JSON (no markdown, no extra text):
{"organization":{"summary":"2-3 sentences","size":"e.g. 12 schools","sports":["sport1"],"recentNews":["item1"],"challenges":["item1"],"keyFacts":["fact1"]},"person":{"summary":"2-3 sentences","role":"title and scope","tenure":"if known","recentActivity":["item1"],"notableItems":["item1"]},"personalizationHooks":[{"hook":"specific org fact","emailAngle":"how to use it","strength":"strong"}],"personHooks":[{"hook":"specific person fact","emailAngle":"how to use it","strength":"strong"}],"sources":["url1"]}`;
}

async function callWithRetry(
  client: Anthropic,
  params: ResearchRequest,
  maxRetries = 1
): Promise<Anthropic.Messages.Message> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1300,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 2,
          } as unknown as Anthropic.Messages.Tool,
        ],
        messages: [
          {
            role: 'user',
            content: buildResearchPrompt(params),
          },
        ],
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isRateLimit =
        lastError.message.includes('rate limit') ||
        lastError.message.includes('429') ||
        (error as { status?: number })?.status === 429;

      if (isRateLimit && attempt < maxRetries) {
        const waitMs = 5_000;
        console.log(`Rate limited. Waiting ${waitMs / 1000}s before retry ${attempt + 1}/${maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError!;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest = await request.json();

    if (!body.company?.trim()) {
      return NextResponse.json(
        { error: 'Company or organization name is required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY environment variable is not set.' },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });
    const response = await callWithRetry(client, body);

    let resultText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        resultText += block.text;
      }
    }

    const cleaned = resultText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let result: ResearchResult;
    try {
      result = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Research parse error. Raw output:\n', resultText);
      console.error('Parse error:', parseErr);
      return NextResponse.json(
        { error: 'Research completed but result could not be parsed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isRateLimit = message.includes('rate limit') || message.includes('429');
    return NextResponse.json(
      {
        error: isRateLimit
          ? 'Rate limit reached. Please wait 60 seconds before trying again.'
          : message,
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
