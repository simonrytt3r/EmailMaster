import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, parseJSON } from '@/lib/anthropic';
import { ResearchRequest, ResearchResult } from '@/lib/types';

function buildResearchPrompt(
  personName?: string,
  jobTitle?: string,
  company?: string,
  linkedinUrl?: string,
  websiteUrl?: string
): string {
  return `Research the following prospect for a cold outreach email. Find specific, useful details that can be used to personalize an email.

Person: ${personName || 'Unknown'}
Title: ${jobTitle || 'Unknown'}
Organization: ${company}
${linkedinUrl ? `LinkedIn: ${linkedinUrl}` : ''}
${websiteUrl ? `Website: ${websiteUrl}` : ''}

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

Return your findings as JSON in this exact format:
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
      "strength": "strong|medium|weak"
    }
  ],
  "sources": ["URL 1", "URL 2"]
}

Return ONLY the JSON object. No markdown code blocks, no explanatory text.`;
}

async function callWithRetry(client: ReturnType<typeof getAnthropicClient>, params: Parameters<typeof client.messages.create>[0]) {
  const delays = [2000, 4000, 8000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('rate_limit') || err.message.includes('429'));
      if (isRateLimit && attempt < delays.length) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest = await request.json();
    const { personName, jobTitle, company, linkedinUrl, websiteUrl } = body;

    if (!company?.trim()) {
      return NextResponse.json(
        { error: 'Company / organization name is required' },
        { status: 400 }
      );
    }

    const client = getAnthropicClient();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const userPrompt = buildResearchPrompt(personName, jobTitle, company, linkedinUrl, websiteUrl);

          // Haiku keeps token usage well within free-tier rate limits
          const response = await callWithRetry(client, {
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1200,
            tools: [
              {
                type: 'web_search_20250305' as const,
                name: 'web_search',
              },
            ],
            messages: [
              {
                role: 'user',
                content: userPrompt,
              },
            ],
          });

          let accumulated = '';

          for (const block of response.content) {
            if (block.type === 'text') {
              accumulated += block.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ chunk: block.text })}\n\n`
                )
              );
            }
          }

          const result = parseJSON<ResearchResult>(accumulated);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, result })}\n\n`
            )
          );
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Research failed';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
