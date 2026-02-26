import { NextRequest, NextResponse } from 'next/server';
import { getTTKnowledge, saveTTKnowledge } from '@/lib/tt-knowledge';
import type { SportDataEntry } from '@/lib/tt-knowledge';

export const runtime = 'nodejs';

function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return password === adminPassword;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, action } = body;

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // ── Read all TT knowledge ─────────────────────────────────────────────────
    if (action === 'read') {
      const data = getTTKnowledge();
      return NextResponse.json({ success: true, ...data });
    }

    // ── Save narrative content ────────────────────────────────────────────────
    if (action === 'save-narrative') {
      const data = getTTKnowledge();
      data.narrative = typeof body.narrative === 'string' ? body.narrative : '';
      data.updatedAt = new Date().toISOString();
      saveTTKnowledge(data);
      return NextResponse.json({ success: true, updatedAt: data.updatedAt });
    }

    // ── Save sports data ──────────────────────────────────────────────────────
    if (action === 'save-sports') {
      const sports: SportDataEntry[] = Array.isArray(body.sports) ? body.sports : [];
      const data = getTTKnowledge();
      data.sports = sports;
      data.updatedAt = new Date().toISOString();
      saveTTKnowledge(data);
      return NextResponse.json({ success: true, count: sports.length, updatedAt: data.updatedAt });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
