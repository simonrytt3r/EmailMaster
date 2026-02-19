import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { KNOWLEDGE_BASE_VERSION } from '@/lib/knowledge-base';

export const runtime = 'nodejs';

const SEARCH_PROMPT = (lastUpdated: string) => `You are updating a cold email knowledge base last updated on ${lastUpdated}.

Search the web for the latest information on the following topics and return a JSON object with your findings:

1. Cold email benchmark data (open rates, reply rates, best send times) from 2024-2025
2. Any new email deliverability changes (ESP policy changes, Google/Yahoo/Microsoft requirements, spam filter updates)
3. New cold email frameworks or methodologies that have gained traction in 2024-2025
4. Updated best practices from Lavender, Gong, HubSpot, Apollo, or other B2B sales research
5. Any changes to email sending best practices (warm-up, volume, domain management, authentication)

Search for the most recent and authoritative sources. Focus on data and actionable advice, not fluff.

Return ONLY a valid JSON object matching this exact schema — no markdown, no explanatory text:

{
  "benchmarkUpdates": [
    {
      "metric": "name of the metric",
      "oldValue": "what we currently have or previously knew",
      "newValue": "what the latest data shows",
      "source": "publication or URL"
    }
  ],
  "deliverabilityChanges": [
    {
      "change": "description of what changed",
      "impact": "how this affects cold email strategy",
      "source": "publication or URL"
    }
  ],
  "newFrameworks": [
    {
      "name": "framework or methodology name",
      "summary": "2-3 sentence summary of what it is",
      "keyPrinciple": "the single most actionable takeaway",
      "source": "publication or URL"
    }
  ],
  "updatedBestPractices": [
    {
      "practice": "what area of best practice changed",
      "oldAdvice": "what we currently say or previously advised",
      "newAdvice": "what we should say now based on latest research",
      "source": "publication or URL"
    }
  ],
  "noChangesNeeded": [
    "list of areas where current knowledge is still accurate and up to date"
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
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
      max_tokens: 4096,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        } as unknown as Anthropic.Messages.Tool,
      ],
      messages: [
        {
          role: 'user',
          content: SEARCH_PROMPT(KNOWLEDGE_BASE_VERSION),
        },
      ],
    });

    // Extract the final text response (after tool use)
    let resultText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        resultText += block.text;
      }
    }

    // Parse the JSON result
    const cleaned = resultText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let updates;
    try {
      updates = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse Claude response as JSON.', raw: resultText },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, updates, lastUpdated: KNOWLEDGE_BASE_VERSION });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
