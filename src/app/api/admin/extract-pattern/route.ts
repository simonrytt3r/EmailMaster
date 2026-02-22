import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { SYSTEM_PROMPT } from '@/lib/prompts';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { password, reply } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!reply?.subject || !reply?.body) {
      return NextResponse.json({ error: 'reply.subject and reply.body are required' }, { status: 400 });
    }

    const client = getAnthropicClient();

    const prompt = `A cold email got a real reply. Analyze what made it work and extract a reusable best practice for the knowledge base.

EMAIL DETAILS:
- Label: ${reply.label ?? 'unknown'}
- Offering: ${reply.offering ?? 'unknown'}
- Target persona: ${reply.targetPersona ?? 'unknown'}
- Industry: ${reply.industry ?? 'unspecified'}
- Score: ${reply.score ?? 'unscored'}
- User note: ${reply.note ?? 'none'}

SUBJECT: ${reply.subject}

BODY:
${reply.body}

Analyze this email using the cold email knowledge base in your system prompt. Identify the specific technique, pattern, or combination that most likely drove the reply. Then express it as a reusable best practice update.

Return as valid JSON:
{
  "practice": "<what area of best practice this falls into>",
  "oldAdvice": "<what the knowledge base currently says or commonly recommends in this area>",
  "newAdvice": "<the refined, evidence-backed advice including what this email demonstrates — be specific and actionable>",
  "source": "Reply data: ${reply.label ?? ''} — ${reply.offering ?? ''}"
}

Return ONLY the JSON object. No markdown, no explanatory text.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let pattern;
    try {
      pattern = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Failed to parse Claude response', raw }, { status: 500 });
    }

    return NextResponse.json({ success: true, pattern });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
