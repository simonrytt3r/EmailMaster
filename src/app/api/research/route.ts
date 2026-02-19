import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, parseJSON } from '@/lib/anthropic';
import { ResearchRequest, ResearchResult } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest = await request.json();

    if (!body.name || !body.company) {
      return NextResponse.json(
        { error: 'Name and company are required' },
        { status: 400 }
      );
    }

    const client = getAnthropicClient();

    const prospectInfo = [
      `Person: ${body.name}`,
      body.jobTitle ? `Title: ${body.jobTitle}` : '',
      `Company: ${body.company}`,
      body.linkedinUrl ? `LinkedIn: ${body.linkedinUrl}` : '',
      body.websiteUrl ? `Website: ${body.websiteUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = `Research this sales prospect and return a JSON object with personalization data.

${prospectInfo}

Search the web for recent, accurate information. Focus on what a salesperson would actually use to personalise a cold email.

Return ONLY this JSON (no markdown, no extra text):
{
  "hooks": [
    { "text": "specific observation about them (e.g. recent news, role change, initiative)", "useIt": "short suggestion on how to use this in an email opener", "strength": "strong" }
  ],
  "company": {
    "name": "company name",
    "stats": "one key metric or fast-fact (size, revenue, founded, etc.)",
    "description": "one clear sentence on what the company does",
    "tags": ["industry", "sector", "type"],
    "bullets": ["key fact 1", "key fact 2", "key fact 3"],
    "recentNews": ["recent news item 1", "recent news item 2"]
  },
  "person": {
    "name": "full name",
    "title": "job title",
    "summary": "2-3 sentence bio — what they do, what they're responsible for",
    "tenure": "how long they've been in this role / at this company",
    "recentActivity": ["recent post, talk, or notable activity 1", "recent activity 2"]
  },
  "sources": ["url1", "url2"]
}

Rules:
- Include 3-5 hooks, ordered strongest first
- Keep all text brief and factual — no padding
- Only include recentNews / recentActivity items that are genuinely recent (last 12 months)
- If you can't find something, use an empty array [] or empty string ""`;

    // KEY FIX: Use claude-sonnet-4-20250514 (80,000 input tokens/min limit)
    // instead of haiku (10,000 input tokens/min limit) — 8× more headroom.
    // Also cap web searches at 3 to keep per-request token usage low.
    const response = await (client as any).beta.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      betas: ['web-search-2025-03-05'],
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
        },
      ],
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract the final text block from the response
    let finalText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        finalText = block.text;
      }
    }

    if (!finalText) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    const result = parseJSON<ResearchResult>(finalText);

    return NextResponse.json({ result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = msg.includes('rate_limit') ? 429 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
