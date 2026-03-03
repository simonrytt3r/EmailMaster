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

    // ── Fetch Google Sheets as CSV (server-side proxy to avoid CORS) ─────────
    if (action === 'fetch-gsheets') {
      const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
      const idMatch = rawUrl.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (!idMatch) {
        return NextResponse.json({
          success: false,
          error: 'Could not find a spreadsheet ID in that URL. Copy the full URL from your browser address bar.',
        });
      }
      const sheetId = idMatch[1];
      const gidMatch = rawUrl.match(/[#?&]gid=(\d+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      try {
        const sheetRes = await fetch(csvUrl, { redirect: 'follow' });
        if (!sheetRes.ok) {
          const hint = sheetRes.status === 401 || sheetRes.status === 403
            ? 'Make sure the sheet is shared as "Anyone with the link can view".'
            : `HTTP ${sheetRes.status}.`;
          return NextResponse.json({ success: false, error: `Could not access the sheet. ${hint}` });
        }
        const csv = await sheetRes.text();
        return NextResponse.json({ success: true, csv });
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        return NextResponse.json({ success: false, error: `Network error fetching sheet: ${msg}` });
      }
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
