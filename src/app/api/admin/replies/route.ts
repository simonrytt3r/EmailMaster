import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const LOG_PATH = join(process.cwd(), 'src/lib/reply-log.json');

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    let data = { replies: [] as object[] };
    try {
      data = JSON.parse(readFileSync(LOG_PATH, 'utf-8'));
    } catch {
      // file may not exist yet
    }

    return NextResponse.json({ success: true, replies: data.replies });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
