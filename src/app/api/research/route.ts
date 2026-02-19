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

    const prompt = `You are a sales research assistant. Use web search to research the prospect below, then output ONLY a raw JSON object — no prose, no markdown, no "Here is..." preamble. Your entire response must be parseable by JSON.parse().

${prospectInfo}

Output this exact JSON structure:
{
  "hooks": [
    { "text": "specific observation (recent news, initiative, award, role change)", "useIt": "one sentence on how to open a cold email with this", "strength": "strong" }
  ],
  "company": {
    "name": "company name",
    "stats": "one key fact (size, founded, revenue, etc.)",
    "description": "one sentence — what the company does",
    "tags": ["industry tag", "sector tag"],
    "bullets": ["key fact 1", "key fact 2", "key fact 3"],
    "recentNews": ["recent news item (last 12 months only)"]
  },
  "person": {
    "name": "full name",
    "title": "job title",
    "summary": "2-3 sentences on their role and responsibilities",
    "tenure": "time in current role/company",
    "recentActivity": ["recent post, talk, or activity (last 12 months only)"]
  },
  "sources": ["url1", "url2"]
}

Rules:
- 3–5 hooks, strongest first
- If data is unavailable use [] or ""
- No commentary before or after the JSON`;

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

    // Collect all text blocks (Claude may emit text before/after tool calls)
    const allText = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');

    if (!allText) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Extract the outermost {...} JSON object — handles any preamble/postamble
    const jsonMatch = allText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'AI did not return a JSON object' },
        { status: 500 }
      );
    }

    const result = parseJSON<ResearchResult>(jsonMatch[0]);

    return NextResponse.json({ result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = msg.includes('rate_limit') ? 429 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
