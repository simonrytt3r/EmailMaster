import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const LOG_PATH = join(process.cwd(), 'src/lib/reply-log.json');

interface ReplyEntry {
  id: number;
  date: string;
  source: 'generate' | 'sequence';
  label: string;
  touchNumber?: number;
  subject: string;
  body: string;
  score?: number;
  offering: string;
  targetPersona: string;
  industry?: string;
  emailType?: string;
  note?: string;
}

function readLog(): { replies: ReplyEntry[] } {
  try {
    return JSON.parse(readFileSync(LOG_PATH, 'utf-8'));
  } catch {
    return { replies: [] };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.subject || !body.body || !body.source) {
      return NextResponse.json({ error: 'subject, body, and source are required' }, { status: 400 });
    }

    const entry: ReplyEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      source: body.source,
      label: body.label ?? '',
      touchNumber: body.touchNumber ?? undefined,
      subject: body.subject,
      body: body.body,
      score: typeof body.score === 'number' ? body.score : undefined,
      offering: body.offering ?? '',
      targetPersona: body.targetPersona ?? '',
      industry: body.industry ?? undefined,
      emailType: body.emailType ?? undefined,
      note: body.note?.trim() ?? undefined,
    };

    const log = readLog();
    log.replies.unshift(entry);
    writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), 'utf-8');

    return NextResponse.json({ success: true, id: entry.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
