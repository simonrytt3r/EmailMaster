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

// ─── Geographic classification ────────────────────────────────────────────────

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

const EU_COUNTRIES: Record<string, string> = {
  AT: 'Austria', BE: 'Belgium', BG: 'Bulgaria', CH: 'Switzerland', CY: 'Cyprus',
  CZ: 'Czech Republic', DK: 'Denmark', EE: 'Estonia', ES: 'Spain', FI: 'Finland',
  FR: 'France', GB: 'United Kingdom', GR: 'Greece', HR: 'Croatia', HU: 'Hungary',
  IE: 'Ireland', IT: 'Italy', LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia',
  MT: 'Malta', NL: 'Netherlands', NO: 'Norway', PL: 'Poland', PT: 'Portugal',
  RO: 'Romania', SE: 'Sweden', SI: 'Slovenia', SK: 'Slovakia',
};

/** Codes that exist as BOTH a US state abbreviation and an ISO country code. */
const AMBIGUOUS_CODES = new Set(['DE', 'IN', 'MT']);

/**
 * Minimal language detection using stopword frequency.
 * Returns an ISO 639-1 language code, defaulting to 'en'.
 */
function detectLanguage(text: string): string {
  if (!text || text.trim().length < 5) return 'en';
  const t = ` ${text.toLowerCase()} `;
  const score = (words: string[]) =>
    words.reduce((n, w) => n + (t.includes(` ${w} `) ? 1 : 0), 0);
  const langs: [string, number][] = [
    ['de', score(['und','der','die','das','ist','nicht','sehr','mit','für','ich','wir','gut','danke','super','tolle'])],
    ['nl', score(['het','van','een','zijn','niet','met','voor','ook','bij','naar','goed','dank','maar','heel'])],
    ['fr', score(['est','les','des','que','une','pour','pas','avec','qui','très','bon','merci','nous','tout'])],
    ['da', score(['og','er','det','til','har','vi','på','ikke','med','som','godt','tak','men','kan'])],
    ['sv', score(['och','är','det','att','som','men','för','på','bra','mycket','tack','bara','kan'])],
    ['no', score(['og','er','det','til','har','vi','på','ikke','med','som','bra','takk','kan','bare'])],
    ['es', score(['que','los','las','una','para','con','muy','más','por','como','bien','gracias','nos','todo'])],
    ['it', score(['che','per','con','una','molto','sono','più','bene','questo','grazie','tutto','come'])],
    ['pt', score(['que','para','com','uma','muito','são','mais','por','como','bem','obrigado','todo'])],
  ];
  const max = Math.max(...langs.map(([, n]) => n));
  if (max < 2) return 'en';
  return langs.find(([, n]) => n === max)?.[0] ?? 'en';
}

const EU_LANG_CODES = new Set(['de','nl','fr','da','sv','no','es','it','pt']);

/**
 * Extract a 2–3 letter bracket code from the start of an org name.
 * "[FL] Tampa FC" → { code: 'FL', name: 'Tampa FC' }
 * "Tampa FC"      → { code: '', name: 'Tampa FC' }
 */
function extractBracketCode(raw: string): { code: string; name: string } {
  const m = raw.trim().match(/^\[([A-Za-z]{2,3})\]\s*/);
  if (!m) return { code: '', name: raw.trim() };
  return { code: m[1].toUpperCase(), name: raw.slice(m[0].length).trim() };
}

/**
 * Given a bracket code and context, determine country + US state.
 * For ambiguous codes (DE/IN/MT) language detection breaks the tie.
 */
function classifyLocation(
  code: string,
  orgName: string,
  comment: string,
): { country: string; state: string } {
  if (!code) return { country: 'United States', state: '' };

  const upper = code.toUpperCase();

  if (AMBIGUOUS_CODES.has(upper)) {
    const orgUpper = orgName.toUpperCase();
    // If the org name contains the full US state name, it's definitely US
    if (upper === 'DE' && (orgUpper.includes('DELAWARE') || orgUpper.includes('DEL ')))
      return { country: 'United States', state: 'DE' };
    if (upper === 'MT' && orgUpper.includes('MONTANA'))
      return { country: 'United States', state: 'MT' };
    if (upper === 'IN' && (orgUpper.includes('INDIANA') || orgUpper.includes('INDIA') === false && orgUpper.includes(' IN')))
      return { country: 'United States', state: 'IN' };

    // Language signal: non-English → EU
    const lang = detectLanguage(comment);
    if (EU_LANG_CODES.has(lang) && EU_COUNTRIES[upper])
      return { country: EU_COUNTRIES[upper], state: '' };

    // Org name check for known European terms
    if (upper === 'DE') {
      // German clubs often have TSV, FC, SV, VfB, VfL, SpVgg, etc.
      if (/\b(TSV|SV|VFB|VFL|SPVGG|TUS|BFC|BSV|DSC)\b/i.test(orgName))
        return { country: 'Germany', state: '' };
    }

    // Default to US
    return { country: 'United States', state: upper };
  }

  if (US_STATES[upper]) return { country: 'United States', state: upper };
  if (EU_COUNTRIES[upper]) return { country: EU_COUNTRIES[upper], state: '' };

  // Unknown code — store as state, treat as US
  return { country: 'United States', state: upper };
}

// ─── Header-aware CSV parser ──────────────────────────────────────────────────

/**
 * Given a header row, return the column index for each semantic field.
 * Returns -1 when a column cannot be found.
 */
function detectColumns(headers: string[]): Record<string, number> {
  // Normalise header labels: lowercase, strip quotes, collapse whitespace
  const h = headers.map((s) =>
    s.replace(/["\r]/g, '').toLowerCase().replace(/[_\s]+/g, ' ').trim(),
  );

  const find = (...patterns: string[]): number => {
    for (const p of patterns) {
      const idx = h.findIndex((s) => s.includes(p));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  return {
    orgName: find(
      'org name', 'organization name', 'company name', 'club name',
      'school name', 'account name', 'customer name',
      'organization', 'company', 'club', 'school', 'account', 'customer',
    ),
    orgType: find('org type', 'account type', 'organization type', 'type', 'category', 'segment'),
    npsScore: find('nps score', 'nps rating', 'score', 'nps', 'rating', 'net promoter'),
    comment: find(
      'last nps survey comment', 'nps survey comment', 'nps comment',
      'survey comment', 'comment', 'feedback', 'response', 'verbatim',
      'message', 'notes', 'answer',
    ),
    contactName: find('contact name', 'respondent name', 'full name', 'first name', 'name'),
    contactTitle: find('job title', 'contact title', 'title', 'role', 'position'),
  };
}

export interface ParseStats {
  detectedColumns: Record<string, number>;
  headerFields: string[];
  totalDataRows: number;
  skippedEmpty: number;
  skippedNoOrgName: number;
  skippedDuplicates: number;
  parsed: number;
}

/**
 * Full RFC 4180–compliant CSV parser.
 *
 * Key fixes vs. previous version:
 * - Parses the ENTIRE CSV as a character stream (no pre-split on \n) so that
 *   quoted fields containing newlines (e.g. multi-line NPS comments) are
 *   handled correctly as a single field.
 * - NPS score is now OPTIONAL — rows without a detectable score are stored
 *   with npsScore = -1 rather than being discarded.
 * - Returns a ParseStats object alongside entries for UI diagnostics.
 *
 * Handles: UTF-8 BOM, \r\n / \r line endings, comma and semicolon delimiters
 * (auto-detected), header-aware column mapping, [STATE]/[COUNTRY] prefixes,
 * US vs EU classification, deduplication.
 */
function parseCSV(csv: string): { entries: NpsEntry[]; stats: ParseStats } {
  // 1. Normalise encoding
  const text = csv.replace(/^\uFEFF/, ''); // strip UTF-8 BOM

  // 2. Auto-detect delimiter from the first line
  let firstLineEnd = text.indexOf('\n');
  if (firstLineEnd === -1) firstLineEnd = text.length;
  const firstLine = text.slice(0, firstLineEnd);
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semiCount  = (firstLine.match(/;/g)  ?? []).length;
  const delim = semiCount > commaCount ? ';' : ',';

  // 3. Full RFC 4180 tokeniser — produces an array of rows (each row = string[])
  function tokenise(src: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuote = false;
    let i = 0;

    while (i < src.length) {
      const ch = src[i];

      if (inQuote) {
        if (ch === '"') {
          if (src[i + 1] === '"') { field += '"'; i += 2; continue; } // escaped quote
          inQuote = false; i++; continue;                              // closing quote
        }
        field += ch; i++; continue;
      }

      // Not in a quoted field
      if (ch === '"') { inQuote = true; i++; continue; }

      if (ch === delim) {
        row.push(field.trim());
        field = '';
        i++;
        continue;
      }

      // Line ending — end of record
      if (ch === '\r' || ch === '\n') {
        row.push(field.trim());
        field = '';
        // normalise \r\n
        if (ch === '\r' && src[i + 1] === '\n') i++;
        if (row.some((f) => f !== '')) rows.push(row); // skip blank lines
        row = [];
        i++;
        continue;
      }

      field += ch;
      i++;
    }

    // Final field / row
    if (field.trim() || row.length > 0) {
      row.push(field.trim());
      if (row.some((f) => f !== '')) rows.push(row);
    }

    return rows;
  }

  const rows = tokenise(text);
  if (rows.length < 2) return { entries: [], stats: { detectedColumns: {}, headerFields: [], totalDataRows: 0, skippedEmpty: 0, skippedNoOrgName: 0, skippedDuplicates: 0, parsed: 0 } };

  // 4. Detect column positions from header row
  const headerFields = rows[0];
  const cols = detectColumns(headerFields);

  // Helper: get a field value by semantic name, falling back to positional index
  const get = (row: string[], key: string, fallback: number): string =>
    (cols[key] !== -1 ? row[cols[key]] : row[fallback]) ?? '';

  // 5. Parse data rows
  const entries: NpsEntry[] = [];
  const seen = new Set<string>();
  const stats: ParseStats = {
    detectedColumns: cols,
    headerFields,
    totalDataRows: rows.length - 1,
    skippedEmpty: 0,
    skippedNoOrgName: 0,
    skippedDuplicates: 0,
    parsed: 0,
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    // --- org name (required) ---
    const rawOrgName = get(row, 'orgName', 0);
    if (!rawOrgName) { stats.skippedNoOrgName++; continue; }

    // --- NPS score (optional — store -1 when not found) ---
    const npsScoreRaw = get(row, 'npsScore', 3);
    const parsed = parseInt(npsScoreRaw, 10);
    const npsScore = (!isNaN(parsed) && parsed >= 0 && parsed <= 10) ? parsed : -1;

    // --- optional fields ---
    const comment      = get(row, 'comment', 4).trim();
    const orgTypeRaw   = get(row, 'orgType', 1).trim().toLowerCase();
    const contactName  = get(row, 'contactName', 5).trim();
    const contactTitle = get(row, 'contactTitle', 6).trim();

    // --- geographic classification ---
    const { code, name: cleanOrgName } = extractBracketCode(rawOrgName);
    const { country, state } = classifyLocation(code, cleanOrgName, comment);

    // --- dedup ---
    const key = `${cleanOrgName.toLowerCase()}|${npsScore}|${comment.slice(0, 40)}`;
    if (seen.has(key)) { stats.skippedDuplicates++; continue; }
    seen.add(key);

    entries.push({
      id: Date.now() + i,
      date: new Date().toISOString().split('T')[0],
      orgName:       cleanOrgName || rawOrgName.trim(),
      orgType:       orgTypeRaw,
      state,
      country,
      npsScore,
      comment,
      contactName:   contactName  || undefined,
      contactTitle:  contactTitle || undefined,
    });

    stats.parsed++;
  }

  return { entries, stats };
}

// ─── Route handler ────────────────────────────────────────────────────────────

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

    // ── PREVIEW (parse without saving — returns stats for diagnostics) ──────────
    if (action === 'preview') {
      const { csv } = body as { csv: string };
      if (!csv || typeof csv !== 'string') {
        return NextResponse.json({ error: 'csv field is required.' }, { status: 400 });
      }
      const { entries, stats } = parseCSV(csv);
      return NextResponse.json({ success: true, count: entries.length, stats, sample: entries.slice(0, 5) });
    }

    // ── UPLOAD (replace all entries) ────────────────────────────────────────────
    if (action === 'upload') {
      const { csv } = body as { csv: string };
      if (!csv || typeof csv !== 'string') {
        return NextResponse.json({ error: 'csv field is required.' }, { status: 400 });
      }
      const { entries, stats } = parseCSV(csv);
      if (entries.length === 0) {
        return NextResponse.json(
          { error: 'No valid rows found. Check that the file has an org name column.', stats },
          { status: 400 },
        );
      }
      writeStore({ entries });
      return NextResponse.json({ success: true, count: entries.length, stats });
    }

    // ── APPEND (add without clearing existing) ──────────────────────────────────
    if (action === 'append') {
      const { csv } = body as { csv: string };
      if (!csv || typeof csv !== 'string') {
        return NextResponse.json({ error: 'csv field is required.' }, { status: 400 });
      }
      const { entries: newEntries, stats } = parseCSV(csv);
      if (newEntries.length === 0) {
        return NextResponse.json(
          { error: 'No valid rows found. Check that the file has an org name column.', stats },
          { status: 400 },
        );
      }
      const store = readStore();
      store.entries = [...store.entries, ...newEntries];
      writeStore(store);
      return NextResponse.json({ success: true, count: newEntries.length, total: store.entries.length, stats });
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
