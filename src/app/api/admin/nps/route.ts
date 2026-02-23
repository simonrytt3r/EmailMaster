import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { NpsEntry, NpsStore } from '@/lib/types';

export const runtime = 'nodejs';

const NPS_PATH = join(process.cwd(), 'src/lib/nps-data.json');

function readStore(): NpsStore {
  try {
    return JSON.parse(readFileSync(NPS_PATH, 'utf-8')) as NpsStore;
  } catch {
    return { entries: [] };
  }
}

function writeStore(store: NpsStore): void {
  writeFileSync(NPS_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Parse a CSV string exported from Google Sheets.
 *
 * Expected columns (order matters, header row required):
 *   org_name | org_type | state | nps_score | comment | contact_name | contact_title
 *
 * The parser is deliberately lenient:
 * - Extra/missing trailing columns are handled gracefully.
 * - Double-quoted fields with embedded commas/newlines are supported.
 * - Rows with empty comment are skipped.
 */
function parseCSV(csv: string): NpsEntry[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  // Minimal RFC 4180 field parser
  function parseRow(line: string): string[] {
    const fields: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQuote = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') { inQuote = true; }
        else if (ch === ',') { fields.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
    }
    fields.push(cur.trim());
    return fields;
  }

  // Skip header row
  const entries: NpsEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    const [orgName, orgType, state, npsScoreRaw, comment, contactName, contactTitle] = row;

    if (!orgName || !comment) continue;

    const npsScore = parseInt(npsScoreRaw ?? '', 10);
    if (isNaN(npsScore) || npsScore < 0 || npsScore > 10) continue;

    entries.push({
      id: Date.now() + i,
      date: new Date().toISOString().split('T')[0],
      orgName: orgName.trim(),
      orgType: (orgType ?? '').trim().toLowerCase(),
      state: (state ?? '').trim().toUpperCase(),
      npsScore,
      comment: comment.trim(),
      contactName: contactName?.trim() || undefined,
      contactTitle: contactTitle?.trim() || undefined,
    });
  }
  return entries;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, action } = body;

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // ── READ ────────────────────────────────────────────────────────────────────
    if (action === 'read') {
      const store = readStore();
      return NextResponse.json({ success: true, entries: store.entries });
    }

    // ── UPLOAD (replace all entries) ────────────────────────────────────────────
    if (action === 'upload') {
      const { csv } = body as { csv: string };
      if (!csv || typeof csv !== 'string') {
        return NextResponse.json({ error: 'csv field is required.' }, { status: 400 });
      }
      const entries = parseCSV(csv);
      if (entries.length === 0) {
        return NextResponse.json(
          { error: 'No valid rows found. Check the CSV format.' },
          { status: 400 },
        );
      }
      writeStore({ entries });
      return NextResponse.json({ success: true, count: entries.length });
    }

    // ── APPEND (add entries without clearing existing) ──────────────────────────
    if (action === 'append') {
      const { csv } = body as { csv: string };
      if (!csv || typeof csv !== 'string') {
        return NextResponse.json({ error: 'csv field is required.' }, { status: 400 });
      }
      const newEntries = parseCSV(csv);
      if (newEntries.length === 0) {
        return NextResponse.json(
          { error: 'No valid rows found. Check the CSV format.' },
          { status: 400 },
        );
      }
      const store = readStore();
      store.entries = [...store.entries, ...newEntries];
      writeStore(store);
      return NextResponse.json({ success: true, count: newEntries.length, total: store.entries.length });
    }

    // ── DELETE ONE ──────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { id } = body as { id: number };
      const store = readStore();
      store.entries = store.entries.filter((e) => e.id !== id);
      writeStore(store);
      return NextResponse.json({ success: true, total: store.entries.length });
    }

    // ── CLEAR ALL ───────────────────────────────────────────────────────────────
    if (action === 'clear') {
      writeStore({ entries: [] });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
