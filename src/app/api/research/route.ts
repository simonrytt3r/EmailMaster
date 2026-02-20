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

**Personalization Hooks:**
Based on your research, suggest 3-5 specific personalization angles that could be used in a cold email. These should be specific observations that show genuine research, not generic flattery. Examples:
- "I saw your district just added 3 new multi-purpose fields for the fall season"
- "Your LinkedIn post about managing tournament weekends with a small crew really resonated"
- "Congrats on the new facility — that must mean a lot more field marking to manage"

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
      "hook": "The specific observation or fact",
      "emailAngle": "How to use this in an email opening or body",
      "strength": "strong"
    }
  ],
  "sources": ["URL 1", "URL 2"]
}`;
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

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        } as unknown as Anthropic.Messages.Tool,
      ],
      messages: [
        {
          role: 'user',
          content: buildResearchPrompt(body),
        },
      ],
    });

    // Extract the final text response (after tool use rounds)
    let resultText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        resultText += block.text;
      }
    }

    // Clean and parse JSON
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
