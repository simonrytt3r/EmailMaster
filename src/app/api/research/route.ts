import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ResearchRequest, ResearchResult } from '@/lib/types';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Tavily search (dedicated search API — no Anthropic quota consumed)
// ---------------------------------------------------------------------------
async function tavilySearch(query: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 5,
      search_depth: 'basic',
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed: ${res.status}`);
  }

  const data = await res.json() as {
    results: { title: string; url: string; content: string }[];
  };

  // Condense to ~2000 chars so the Claude extraction call stays small
  return data.results
    .map((r) => `[${r.title}]\n${r.content?.slice(0, 400) ?? ''}`)
    .join('\n\n')
    .slice(0, 2000);
}

// ---------------------------------------------------------------------------
// Claude extraction prompt — receives pre-fetched text, no search calls
// ---------------------------------------------------------------------------
function buildExtractionPrompt(params: ResearchRequest, searchResults: string): string {
  return `Extract structured prospect info from these search results for a cold outreach email.

Person: ${params.personName || 'Unknown'}
Title: ${params.jobTitle || 'Unknown'}
Org: ${params.company}

SEARCH RESULTS:
${searchResults}

Return ONLY this JSON (no markdown, no extra text):
{"organization":{"summary":"2-3 sentences","size":"e.g. 12 schools","sports":["sport1"],"recentNews":["item1"],"challenges":["item1"],"keyFacts":["fact1"]},"person":{"summary":"2-3 sentences","role":"title and scope","tenure":"if known","recentActivity":["item1"],"notableItems":["item1"]},"personalizationHooks":[{"hook":"specific org fact","emailAngle":"how to open an email with this","strength":"strong"}],"personHooks":[{"hook":"specific person fact","emailAngle":"how to open an email with this","strength":"strong"}],"sources":["url1"]}`;
}

// ---------------------------------------------------------------------------
// Fallback: Anthropic built-in web_search (used if no TAVILY_API_KEY)
// ---------------------------------------------------------------------------
function buildFallbackPrompt(params: ResearchRequest): string {
  return `Research this prospect for a cold outreach email.

Person: ${params.personName || 'Unknown'}
Title: ${params.jobTitle || 'Unknown'}
Org: ${params.company}
${params.linkedinUrl ? `LinkedIn: ${params.linkedinUrl}` : ''}
${params.websiteUrl ? `Website: ${params.websiteUrl}` : ''}

Search for org facts, recent news, person background, and personalization angles.
Return ONLY this JSON (no markdown):
{"organization":{"summary":"2-3 sentences","size":"e.g. 12 schools","sports":["sport1"],"recentNews":["item1"],"challenges":["item1"],"keyFacts":["fact1"]},"person":{"summary":"2-3 sentences","role":"title and scope","tenure":"if known","recentActivity":["item1"],"notableItems":["item1"]},"personalizationHooks":[{"hook":"specific org fact","emailAngle":"how to open an email with this","strength":"strong"}],"personHooks":[{"hook":"specific person fact","emailAngle":"how to open an email with this","strength":"strong"}],"sources":["url1"]}`;
}

// ---------------------------------------------------------------------------
// Main research function — Tavily path (preferred)
// ---------------------------------------------------------------------------
async function researchWithTavily(
  client: Anthropic,
  params: ResearchRequest,
  tavilyKey: string
): Promise<Anthropic.Messages.Message> {
  // Run both searches in parallel
  const orgQuery = `${params.company} organization sports fields athletic department`;
  const personQuery = params.personName
    ? `${params.personName} ${params.jobTitle ?? ''} ${params.company}`
    : null;

  const [orgResults, personResults] = await Promise.all([
    tavilySearch(orgQuery, tavilyKey),
    personQuery ? tavilySearch(personQuery, tavilyKey) : Promise.resolve(''),
  ]);

  const combined = [orgResults, personResults].filter(Boolean).join('\n\n---\n\n');

  return client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [
      {
        role: 'user',
        content: buildExtractionPrompt(params, combined),
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Fallback research — Anthropic web_search tool (no Tavily key)
// ---------------------------------------------------------------------------
async function researchWithWebSearch(
  client: Anthropic,
  params: ResearchRequest
): Promise<Anthropic.Messages.Message> {
  return client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1300,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 3,
      } as unknown as Anthropic.Messages.Tool,
    ],
    messages: [
      {
        role: 'user',
        content: buildFallbackPrompt(params),
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
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
    const tavilyKey = process.env.TAVILY_API_KEY;

    let response: Anthropic.Messages.Message;
    if (tavilyKey) {
      console.log('Using Tavily search path');
      response = await researchWithTavily(client, body, tavilyKey);
    } else {
      console.log('Using Anthropic web_search fallback (add TAVILY_API_KEY for better performance)');
      response = await researchWithWebSearch(client, body);
    }

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
          ? 'Rate limit reached. Please wait a moment and try again.'
          : message,
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
