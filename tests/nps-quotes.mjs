// tests/nps-quotes.mjs
// Tests the NPS quote matching logic and CSV parsing without requiring Next.js server.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NPS_PATH = join(ROOT, 'src/lib/nps-data.json');
const BACKUP_PATH = join(ROOT, 'src/lib/nps-data.json.bak');

let passed = 0;
let failed = 0;

function ok(label, value) {
  if (value) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n── ${title}`);
}

// ─── Mirror the matching logic from nps-quotes.ts ────────────────────────────

const MAX_QUOTES = 3;

function normalise(s) {
  return s.toLowerCase().trim();
}

function findMatchingQuotes(orgType, state, entries) {
  const allEntries = entries.filter((e) => e.comment.trim().length > 0);
  if (allEntries.length === 0 || (!orgType && !state)) {
    return { entries: [], matchType: 'none' };
  }

  const normType = orgType ? normalise(orgType) : '';
  const normState = state ? normalise(state) : '';

  const byScore = (a, b) => b.npsScore - a.npsScore;

  if (normType && normState) {
    const exact = allEntries
      .filter((e) => normalise(e.orgType) === normType && normalise(e.state) === normState)
      .sort(byScore)
      .slice(0, MAX_QUOTES);
    if (exact.length > 0) return { entries: exact, matchType: 'exact' };
  }

  if (normType) {
    const byType = allEntries
      .filter((e) => normalise(e.orgType) === normType)
      .sort(byScore)
      .slice(0, MAX_QUOTES);
    if (byType.length > 0) return { entries: byType, matchType: 'orgType' };
  }

  if (normState) {
    const byState = allEntries
      .filter((e) => normalise(e.state) === normState)
      .sort(byScore)
      .slice(0, MAX_QUOTES);
    if (byState.length > 0) return { entries: byState, matchType: 'state' };
  }

  return { entries: [], matchType: 'none' };
}

// ─── Mirror the CSV parser from admin NPS route ───────────────────────────────

function parseRow(line) {
  const fields = [];
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

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    const [orgName, orgType, state, npsScoreRaw, comment, contactName, contactTitle] = row;
    if (!orgName || !comment) continue;
    const npsScore = parseInt(npsScoreRaw ?? '', 10);
    if (isNaN(npsScore) || npsScore < 0 || npsScore > 10) continue;
    entries.push({
      id: 1000 + i,
      date: '2026-01-01',
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

// ─── Backup original NPS data ────────────────────────────────────────────────

if (existsSync(NPS_PATH)) {
  copyFileSync(NPS_PATH, BACKUP_PATH);
}
writeFileSync(NPS_PATH, JSON.stringify({ entries: [] }, null, 2), 'utf-8');

try {
  // ─── 1. Empty store ─────────────────────────────────────────────────────────
  section('1. Empty store');
  const emptyResult = findMatchingQuotes('high school', 'FL', []);
  ok('returns empty entries', emptyResult.entries.length === 0);
  ok('matchType is none', emptyResult.matchType === 'none');

  // ─── 2. No orgType/state provided ───────────────────────────────────────────
  section('2. No orgType or state provided');
  const noFilterResult = findMatchingQuotes(undefined, undefined, [{ id: 1, orgName: 'Test', orgType: 'high school', state: 'FL', npsScore: 9, comment: 'Great.' }]);
  ok('returns none when no filter', noFilterResult.matchType === 'none');

  // ─── 3. Exact match (type + state) ──────────────────────────────────────────
  section('3. Exact match — org type AND state');
  const testEntries = [
    { id: 1, orgType: 'high school', state: 'FL', npsScore: 9, comment: 'Saved 3 hours/week.', orgName: 'Oak Park HS' },
    { id: 2, orgType: 'high school', state: 'FL', npsScore: 8, comment: 'Great product.', orgName: 'Sunrise HS' },
    { id: 3, orgType: 'high school', state: 'TX', npsScore: 10, comment: 'Love it.', orgName: 'Austin HS' },
    { id: 4, orgType: 'golf course', state: 'FL', npsScore: 9, comment: 'Excellent.', orgName: 'FL Golf Club' },
  ];
  const exactMatch = findMatchingQuotes('high school', 'FL', testEntries);
  ok('matchType is exact', exactMatch.matchType === 'exact');
  ok('returns 2 FL high school entries', exactMatch.entries.length === 2);
  ok('highest NPS first', exactMatch.entries[0].npsScore >= exactMatch.entries[1].npsScore);
  ok('no TX entry included', exactMatch.entries.every((e) => e.state === 'FL'));

  // ─── 4. Org type fallback (no state match) ───────────────────────────────────
  section('4. Org type fallback — no state match');
  const typeMatch = findMatchingQuotes('high school', 'CA', testEntries);
  ok('matchType is orgType', typeMatch.matchType === 'orgType');
  ok('returns high school entries from any state', typeMatch.entries.length === 3);
  ok('all entries are high schools', typeMatch.entries.every((e) => e.orgType === 'high school'));

  // ─── 5. State fallback (no org type match) ───────────────────────────────────
  section('5. State fallback — no org type match');
  const stateMatch = findMatchingQuotes('parks & rec', 'FL', testEntries);
  ok('matchType is state', stateMatch.matchType === 'state');
  ok('returns FL entries of any type (3 FL entries, capped at MAX_QUOTES)', stateMatch.entries.length === 3);
  ok('all entries are from FL', stateMatch.entries.every((e) => e.state === 'FL'));

  // ─── 6. No match at all ──────────────────────────────────────────────────────
  section('6. No match');
  const noneMatch = findMatchingQuotes('university', 'WA', testEntries);
  ok('matchType is none', noneMatch.matchType === 'none');
  ok('entries array is empty', noneMatch.entries.length === 0);

  // ─── 7. MAX_QUOTES cap (max 3 returned) ─────────────────────────────────────
  section('7. MAX_QUOTES cap');
  const manyEntries = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1, orgType: 'golf course', state: 'TX', npsScore: 10 - i,
    comment: `Comment ${i + 1}`, orgName: `Club ${i + 1}`,
  }));
  const capped = findMatchingQuotes('golf course', 'TX', manyEntries);
  ok('returns at most 3 entries', capped.entries.length === MAX_QUOTES);
  ok('top 3 by NPS score returned', capped.entries[0].npsScore === 10);

  // ─── 8. Empty comment entries excluded ──────────────────────────────────────
  section('8. Empty comment filtering');
  const withEmpty = [
    { id: 1, orgType: 'high school', state: 'FL', npsScore: 9, comment: 'Great!', orgName: 'A' },
    { id: 2, orgType: 'high school', state: 'FL', npsScore: 10, comment: '', orgName: 'B' },
    { id: 3, orgType: 'high school', state: 'FL', npsScore: 8, comment: '   ', orgName: 'C' },
  ];
  const noEmpty = findMatchingQuotes('high school', 'FL', withEmpty);
  ok('empty comment entry excluded', noEmpty.entries.length === 1);
  ok('only entry with real comment returned', noEmpty.entries[0].orgName === 'A');

  // ─── 9. Case insensitivity ───────────────────────────────────────────────────
  section('9. Case-insensitive matching');
  const mixedCase = [
    { id: 1, orgType: 'High School', state: 'fl', npsScore: 9, comment: 'Works great.', orgName: 'HS1' },
  ];
  const caseResult = findMatchingQuotes('HIGH SCHOOL', 'FL', mixedCase);
  ok('org type match is case-insensitive', caseResult.matchType === 'exact');
  ok('state match is case-insensitive', caseResult.entries.length === 1);

  // ─── 10. CSV parsing — basic ─────────────────────────────────────────────────
  section('10. CSV parsing — basic row');
  const basicCsv = `org_name,org_type,state,nps_score,comment,contact_name,contact_title
"Oak Park High School","high school","FL",9,"Saved us 3 hours a week.","Mike Johnson","Athletic Director"`;
  const parsed = parseCSV(basicCsv);
  ok('parses 1 entry', parsed.length === 1);
  ok('orgName correct', parsed[0].orgName === 'Oak Park High School');
  ok('orgType lowercase', parsed[0].orgType === 'high school');
  ok('state uppercase', parsed[0].state === 'FL');
  ok('npsScore parsed as number', parsed[0].npsScore === 9);
  ok('comment preserved', parsed[0].comment === 'Saved us 3 hours a week.');
  ok('contactName extracted', parsed[0].contactName === 'Mike Johnson');
  ok('contactTitle extracted', parsed[0].contactTitle === 'Athletic Director');

  // ─── 11. CSV parsing — quoted field with comma ───────────────────────────────
  section('11. CSV parsing — embedded commas in quoted field');
  const commaCsv = `org_name,org_type,state,nps_score,comment
"Sunset CC","golf course","CA",10,"Faster, cleaner, and our crew loves it."`;
  const commaResult = parseCSV(commaCsv);
  ok('parses entry with comma in comment', commaResult.length === 1);
  ok('full comment preserved', commaResult[0].comment === 'Faster, cleaner, and our crew loves it.');

  // ─── 12. CSV parsing — invalid NPS score skipped ────────────────────────────
  section('12. CSV parsing — invalid rows skipped');
  const badCsv = `org_name,org_type,state,nps_score,comment
"Valid Org","high school","FL",8,"Good comment."
"Bad Score","golf course","TX",11,"Out of range."
"No Comment","parks & rec","CA",9,""
,"university","FL",7,"Has comment but no org name."`;
  const cleanResult = parseCSV(badCsv);
  ok('skips entry with nps_score > 10', cleanResult.every((e) => e.npsScore <= 10));
  ok('skips entry with empty comment', cleanResult.every((e) => e.comment.length > 0));
  ok('skips entry with empty org_name', cleanResult.every((e) => e.orgName.length > 0));
  ok('only valid entry passes', cleanResult.length === 1);
  ok('valid entry is the high school', cleanResult[0].orgType === 'high school');

  // ─── 13. CSV parsing — header only ──────────────────────────────────────────
  section('13. CSV parsing — header-only returns empty');
  const headerOnly = `org_name,org_type,state,nps_score,comment`;
  ok('header-only CSV returns empty array', parseCSV(headerOnly).length === 0);

  // ─── 14. NPS data file structure ────────────────────────────────────────────
  section('14. NPS data file structure');
  const fileContent = JSON.parse(readFileSync(NPS_PATH, 'utf-8'));
  ok('nps-data.json is readable', fileContent !== null);
  ok('has entries array', Array.isArray(fileContent.entries));
  ok('starts empty', fileContent.entries.length === 0);

  // ─── 15. Admin NPS route model/structure check ──────────────────────────────
  section('15. Admin NPS route — actions exist');
  const { readFileSync: rfs } = await import('fs');
  const routeSource = rfs(join(ROOT, 'src/app/api/admin/nps/route.ts'), 'utf-8');
  ok('route has "read" action', routeSource.includes("action === 'read'"));
  ok('route has "upload" action', routeSource.includes("action === 'upload'"));
  ok('route has "append" action', routeSource.includes("action === 'append'"));
  ok('route has "delete" action', routeSource.includes("action === 'delete'"));
  ok('route has "clear" action', routeSource.includes("action === 'clear'"));
  ok('route checks admin password', routeSource.includes('Unauthorized'));

} finally {
  // ─── Restore original NPS data ───────────────────────────────────────────────
  if (existsSync(BACKUP_PATH)) {
    copyFileSync(BACKUP_PATH, NPS_PATH);
    const { unlinkSync } = await import('fs');
    unlinkSync(BACKUP_PATH);
  } else {
    writeFileSync(NPS_PATH, JSON.stringify({ entries: [] }, null, 2), 'utf-8');
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
if (failed === 0) {
  console.log(`✓ All ${passed} tests passed`);
} else {
  console.log(`${passed} passed, ${failed} FAILED`);
  process.exit(1);
}
