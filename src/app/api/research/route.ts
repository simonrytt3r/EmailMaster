import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ResearchRequest, ResearchResult } from '@/lib/types';

export const runtime = 'nodejs';

function buildResearchPrompt(params: ResearchRequest): string {
  return `Research the following prospect for a cold outreach email. Find specific, useful details that can be used to personalize an email.

Person: ${params.personName || 'Unknown'}
Title: ${params.jobTitle || 'Unknown'}
Organization: ${params.company}
${params.linkedinUrl ? `LinkedIn: ${params.linkedinUrl}` : ''}
${params.websiteUrl ? `Website: ${params.websiteUrl}` : ''}

Search for and compile:

**About the Organization:**
- What does the organization do? (school district size, number of fields/facilities, sports programs offered, recent news)
- Any recent announcements, expansions, new hires, or initiatives?
- What sports do they manage fields for?
- Any publicly mentioned challenges or priorities?
- Approximate size (number of schools, facilities, teams, or members)

**About the Person (if name provided):**
- Their role and responsibilities
- How long they've been in this role (if findable)
- Any recent public statements, interviews, articles, or social media posts
- Any awards, recognitions, or notable projects
- Conference appearances or published content

**Company Personalization Hooks:**
Suggest 3-5 angles based on the ORGANIZATION — recent news, expansions, facility changes, initiatives, sports programs, challenges. These open with something about the org itself. Examples:
- "I saw your district just added 3 new multi-purpose fields for the fall season"
- "Congrats on the new facility — that must mean a lot more field marking to manage"
- "Noticed your department recently took on managing the new stadium complex"

**Person Personalization Hooks:**
Suggest 2-4 angles based on the INDIVIDUAL — their role, tenure, LinkedIn activity, public statements, career history, job responsibilities, or anything that shows you researched them specifically. Examples:
- "Your LinkedIn post about managing tournament weekends with a small crew really resonated"
- "As someone who's been Athletic Director for 8 years, you've probably seen how much field prep has changed"
- "I noticed you recently moved from coaching into administration — that shift usually comes with a whole new set of logistics challenges"

Both types should be specific and show genuine research, not generic flattery.

Return your findings as JSON in this exact format (return ONLY the JSON object, no markdown, no explanatory text):

{
  "organization": {
    "summary": "Brief 2-3 sentence overview",
    "size": "e.g., 12 schools, 45 fields",
    "sports": ["football", "soccer", "lacrosse"],
    "recentNews": ["News item 1", "News item 2"],
    "challenges": ["Challenge 1", "Challenge 2"],
    "keyFacts": ["Fact 1", "Fact 2", "Fact 3"]
  },
  "person": {
    "summary": "Brief 2-3 sentence overview",
    "role": "Their title and what they oversee",
    "tenure": "How long in role if known",
    "recentActivity": ["Activity 1", "Activity 2"],
    "notableItems": ["Item 1", "Item 2"]
  },
  "personalizationHooks": [
    {
      "hook": "The specific observation or fact about the COMPANY/ORG",
      "emailAngle": "How to use this in an email opening or body",
      "strength": "strong"
    }
  ],
  "personHooks": [
    {
      "hook": "The specific observation or fact about the PERSON",
      "emailAngle": "How to use this in an email opening or body",
      "strength": "strong"
    }
  ],
  "sources": ["URL 1", "URL 2"]
}`;
}

async function callWithRetry(
  client: Anthropic,
  params: ResearchRequest,
  maxRetries = 3
): Promise<Anthropic.Messages.Message> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
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
        // Wait 20s, 40s, 60s before retrying
        const waitMs = (attempt + 1) * 20_000;
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
    } catch {
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
