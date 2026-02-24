// tests/nps-quotes.mjs
// Tests the NPS quote matching logic and CSV parser.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const NPS_PATH  = join(ROOT, 'src/lib/nps-data.json');
const BACKUP    = join(ROOT, 'src/lib/nps-data.json.bak');

let passed = 0;
let failed = 0;

function ok(label, value) {
  if (value) { console.log(`  ✓  ${label}`); passed++; }
  else        { console.error(`  ✗  ${label}`); failed++; }
}
function section(title) { console.log(`\n── ${title}`); }

// ─── Mirror the matching logic (from nps-quotes.ts) ──────────────────────────

const MAX_QUOTES = 3;

function normalise(s) { return (s ?? '').toLowerCase().trim(); }

function locationMatches(entry, stateOrCountry) {
  const loc = normalise(stateOrCountry);
  if (!loc) return false;
  return normalise(entry.state) === loc || normalise(entry.country ?? '') === loc;
}

function findMatchingQuotes(orgType, stateOrCountry, entries) {
  const withComment = entries.filter((e) => e.comment.trim().length > 0);
  if (withComment.length === 0 || (!orgType && !stateOrCountry)) {
    return { entries: [], matchType: 'none' };
  }
  const normType = normalise(orgType ?? '');
  const byScore  = (a, b) => b.npsScore - a.npsScore;

  if (normType && stateOrCountry) {
    const exact = withComment
      .filter((e) => normalise(e.orgType) === normType && locationMatches(e, stateOrCountry))
      .sort(byScore).slice(0, MAX_QUOTES);
    if (exact.length > 0) return { entries: exact, matchType: 'exact' };
  }
  if (normType) {
    const byType = withComment
      .filter((e) => normalise(e.orgType) === normType)
      .sort(byScore).slice(0, MAX_QUOTES);
    if (byType.length > 0) return { entries: byType, matchType: 'orgType' };
  }
  if (stateOrCountry) {
    const byLoc = withComment
      .filter((e) => locationMatches(e, stateOrCountry))
      .sort(byScore).slice(0, MAX_QUOTES);
    if (byLoc.length > 0) return { entries: byLoc, matchType: 'location' };
  }
  return { entries: [], matchType: 'none' };
}

// ─── Mirror the geographic helpers (from admin NPS route) ────────────────────

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]);

const EU_COUNTRIES = {
  AT:'Austria', BE:'Belgium', BG:'Bulgaria', CH:'Switzerland', CY:'Cyprus',
  CZ:'Czech Republic', DK:'Denmark', EE:'Estonia', ES:'Spain', FI:'Finland',
  FR:'France', GB:'United Kingdom', GR:'Greece', HR:'Croatia', HU:'Hungary',
  IE:'Ireland', IT:'Italy', LT:'Lithuania', LU:'Luxembourg', LV:'Latvia',
  MT:'Malta', NL:'Netherlands', NO:'Norway', PL:'Poland', PT:'Portugal',
  RO:'Romania', SE:'Sweden', SI:'Slovenia', SK:'Slovakia',
};

const AMBIGUOUS = new Set(['DE', 'IN', 'MT']);

function extractBracketCode(raw) {
  const m = raw.trim().match(/^\[([A-Za-z]{2,3})\]\s*/);
  if (!m) return { code: '', name: raw.trim() };
  return { code: m[1].toUpperCase(), name: raw.slice(m[0].length).trim() };
}

function detectLanguage(text) {
  if (!text || text.trim().length < 5) return 'en';
  const t = ` ${text.toLowerCase()} `;
  const score = (words) => words.reduce((n, w) => n + (t.includes(` ${w} `) ? 1 : 0), 0);
  const langs = [
    ['de', score(['und','der','die','das','ist','nicht','sehr','mit','für','ich','wir','gut'])],
    ['nl', score(['het','van','een','zijn','niet','met','voor','ook','bij','naar','goed'])],
    ['fr', score(['est','les','des','que','une','pour','pas','avec','qui','très','bon'])],
    ['da', score(['og','er','det','til','har','vi','på','ikke','med','som','godt'])],
    ['sv', score(['och','är','det','att','som','men','för','på','bra','mycket'])],
  ];
  const max = Math.max(...langs.map(([, n]) => n));
  if (max < 2) return 'en';
  return langs.find(([, n]) => n === max)?.[0] ?? 'en';
}

const EU_LANGS = new Set(['de','nl','fr','da','sv','no','es','it','pt']);

function classifyLocation(code, orgName, comment) {
  if (!code) return { country: 'United States', state: '' };
  const upper = code.toUpperCase();

  if (AMBIGUOUS.has(upper)) {
    const orgUpper = orgName.toUpperCase();
    if (upper === 'IN' && orgUpper.includes('INDIANA')) return { country: 'United States', state: 'IN' };
    if (upper === 'DE' && orgUpper.includes('DELAWARE'))  return { country: 'United States', state: 'DE' };
    if (upper === 'MT' && orgUpper.includes('MONTANA'))   return { country: 'United States', state: 'MT' };
    // German club prefixes are a strong signal
    if (upper === 'DE' && /\b(TSV|SV|VFB|VFL|SPVGG|TUS|BFC|BSV|DSC)\b/i.test(orgName))
      return { country: 'Germany', state: '' };
    const lang = detectLanguage(comment);
    if (EU_LANGS.has(lang) && EU_COUNTRIES[upper]) return { country: EU_COUNTRIES[upper], state: '' };
    return { country: 'United States', state: upper };
  }

  if (US_STATES.has(upper)) return { country: 'United States', state: upper };
  if (EU_COUNTRIES[upper]) return { country: EU_COUNTRIES[upper], state: '' };
  return { country: 'United States', state: upper };
}

// ─── Mirror the new CSV parser (from admin NPS route) ────────────────────────

function detectColumns(headers) {
  const h = headers.map((s) => s.replace(/["\r]/g, '').toLowerCase().replace(/[_\s]+/g, ' ').trim());
  const find = (...patterns) => {
    for (const p of patterns) {
      const idx = h.findIndex((s) => s.includes(p));
      if (idx !== -1) return idx;
    }
    return -1;
  };
  return {
    orgName:      find('org name','organization name','company name','club name','school name','account name','customer name','organization','company','club','school','account','customer'),
    orgType:      find('org type','account type','organization type','type','category','segment'),
    npsScore:     find('nps score','nps rating','score','nps','rating','net promoter'),
    comment:      find('last nps survey comment','nps survey comment','nps comment','survey comment','comment','feedback','response','verbatim','message','notes','answer'),
    contactName:  find('contact name','respondent name','full name','first name','name'),
    contactTitle: find('job title','contact title','title','role','position'),
  };
}

function parseCSV(csv) {
  const normalized = csv.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
  const lines = normalized.split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const semiCount  = (headerLine.match(/;/g)  ?? []).length;
  const delim = semiCount > commaCount ? ';' : ',';

  function parseRow(line) {
    const fields = []; let cur = ''; let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQuote = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') { inQuote = true; }
        else if (ch === delim) { fields.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
    }
    fields.push(cur.trim());
    return fields;
  }

  const cols = detectColumns(parseRow(headerLine));
  const get = (row, key, fallback) => (cols[key] !== -1 ? row[cols[key]] : row[fallback]) ?? '';
  const seen = new Set();
  const entries = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const row = parseRow(line);
    const rawOrgName = get(row, 'orgName', 0);
    if (!rawOrgName) continue;
    const npsScore = parseInt(get(row, 'npsScore', 3), 10);
    if (isNaN(npsScore) || npsScore < 0 || npsScore > 10) continue;

    const comment      = get(row, 'comment', 4).trim();
    const orgTypeRaw   = get(row, 'orgType', 1).trim().toLowerCase();
    const contactName  = get(row, 'contactName', 5).trim();
    const contactTitle = get(row, 'contactTitle', 6).trim();

    const { code, name: cleanOrgName } = extractBracketCode(rawOrgName);
    const { country, state } = classifyLocation(code, cleanOrgName, comment);

    const key = `${cleanOrgName.toLowerCase()}|${npsScore}|${comment.slice(0,40)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    entries.push({
      id: 1000 + i,
      date: '2026-01-01',
      orgName:      cleanOrgName || rawOrgName.trim(),
      orgType:      orgTypeRaw,
      state,
      country,
      npsScore,
      comment,
      contactName:  contactName  || undefined,
      contactTitle: contactTitle || undefined,
    });
  }
  return entries;
}

// ─── Backup NPS data ──────────────────────────────────────────────────────────

if (existsSync(NPS_PATH)) copyFileSync(NPS_PATH, BACKUP);
writeFileSync(NPS_PATH, JSON.stringify({ entries: [] }, null, 2), 'utf-8');

try {

  // ─── 1. Empty store ──────────────────────────────────────────────────────────
  section('1. Empty store');
  const emptyResult = findMatchingQuotes('high school', 'FL', []);
  ok('returns empty entries', emptyResult.entries.length === 0);
  ok('matchType is none',     emptyResult.matchType === 'none');

  // ─── 2. No filters provided ──────────────────────────────────────────────────
  section('2. No orgType or location provided');
  const noFilter = findMatchingQuotes(undefined, undefined,
    [{ id:1, orgName:'Test', orgType:'high school', state:'FL', country:'United States', npsScore:9, comment:'Great.' }]);
  ok('returns none when no filter', noFilter.matchType === 'none');

  // ─── 3. Exact match — org type AND state ─────────────────────────────────────
  section('3. Exact match — org type AND state');
  const testUS = [
    { id:1, orgType:'high school', state:'FL', country:'United States', npsScore:9, comment:'Saved 3 hrs/week.', orgName:'Oak Park HS' },
    { id:2, orgType:'high school', state:'FL', country:'United States', npsScore:8, comment:'Great product.',   orgName:'Sunrise HS' },
    { id:3, orgType:'high school', state:'TX', country:'United States', npsScore:10, comment:'Love it.',        orgName:'Austin HS' },
    { id:4, orgType:'golf course', state:'FL', country:'United States', npsScore:9, comment:'Excellent.',      orgName:'FL Golf Club' },
  ];
  const exact = findMatchingQuotes('high school', 'FL', testUS);
  ok('matchType is exact',              exact.matchType === 'exact');
  ok('returns 2 FL high school entries',exact.entries.length === 2);
  ok('highest NPS first',               exact.entries[0].npsScore >= exact.entries[1].npsScore);
  ok('no TX entry included',            exact.entries.every((e) => e.state === 'FL'));

  // ─── 4. Org type fallback (no state match) ───────────────────────────────────
  section('4. Org type fallback — no state match');
  const typeMatch = findMatchingQuotes('high school', 'CA', testUS);
  ok('matchType is orgType',        typeMatch.matchType === 'orgType');
  ok('returns 3 high school entries', typeMatch.entries.length === 3);
  ok('all high schools',            typeMatch.entries.every((e) => e.orgType === 'high school'));

  // ─── 5. Location fallback (no org type match) ────────────────────────────────
  section('5. Location fallback — matchType is location');
  const locMatch = findMatchingQuotes('parks & rec', 'FL', testUS);
  ok('matchType is location',       locMatch.matchType === 'location');
  ok('all entries from FL',         locMatch.entries.every((e) => e.state === 'FL'));

  // ─── 6. EU country matching via country field ─────────────────────────────────
  section('6. EU country matching');
  const euEntries = [
    { id:10, orgType:'football club', state:'', country:'Germany',     npsScore:9, comment:'Super Produkt.',   orgName:'TSV München' },
    { id:11, orgType:'football club', state:'', country:'Germany',     npsScore:8, comment:'Sehr empfehlenswert.', orgName:'BFC Berlin' },
    { id:12, orgType:'football club', state:'', country:'Netherlands', npsScore:8, comment:'Heel goed!',       orgName:'Ajax Academy' },
    { id:13, orgType:'high school',   state:'', country:'Germany',     npsScore:10,comment:'Ausgezeichnet.',   orgName:'Berlin Schule' },
  ];
  const euExact = findMatchingQuotes('football club', 'Germany', euEntries);
  ok('EU: exact match on country',     euExact.matchType === 'exact');
  ok('EU: returns 2 German club entries', euExact.entries.length === 2);

  const euCountryNameMatch = findMatchingQuotes('high school', 'germany', euEntries);
  ok('EU: country match is case-insensitive', euCountryNameMatch.matchType === 'exact');
  ok('EU: returns Berlin Schule',             euCountryNameMatch.entries[0].orgName === 'Berlin Schule');

  // ─── 7. No match ─────────────────────────────────────────────────────────────
  section('7. No match');
  const none = findMatchingQuotes('university', 'WA', testUS);
  ok('matchType is none',   none.matchType === 'none');
  ok('entries array empty', none.entries.length === 0);

  // ─── 8. MAX_QUOTES cap ───────────────────────────────────────────────────────
  section('8. MAX_QUOTES cap (3)');
  const manyEntries = Array.from({ length: 6 }, (_, i) => ({
    id: i+1, orgType:'golf course', state:'TX', country:'United States',
    npsScore: 10-i, comment:`Comment ${i+1}`, orgName:`Club ${i+1}`,
  }));
  const capped = findMatchingQuotes('golf course', 'TX', manyEntries);
  ok('returns at most 3',       capped.entries.length === MAX_QUOTES);
  ok('highest NPS score first', capped.entries[0].npsScore === 10);

  // ─── 9. Empty comments excluded from QUOTES (but storable) ──────────────────
  section('9. Empty comment entries not returned as quotes');
  const withEmpty = [
    { id:1, orgType:'high school', state:'FL', country:'United States', npsScore:9, comment:'Great!', orgName:'A' },
    { id:2, orgType:'high school', state:'FL', country:'United States', npsScore:10,comment:'',       orgName:'B' },
    { id:3, orgType:'high school', state:'FL', country:'United States', npsScore:8, comment:'   ',    orgName:'C' },
  ];
  const noEmpty = findMatchingQuotes('high school', 'FL', withEmpty);
  ok('only entry with comment returned', noEmpty.entries.length === 1);
  ok('correct entry returned',           noEmpty.entries[0].orgName === 'A');

  // ─── 10. Case-insensitive org type + state ───────────────────────────────────
  section('10. Case-insensitive matching');
  const mixedCase = [{ id:1, orgType:'High School', state:'fl', country:'United States', npsScore:9, comment:'Works great.', orgName:'HS1' }];
  const caseResult = findMatchingQuotes('HIGH SCHOOL', 'FL', mixedCase);
  ok('org type match case-insensitive',  caseResult.matchType === 'exact');
  ok('state match case-insensitive',     caseResult.entries.length === 1);

  // ─── 11. Bracket code extraction ─────────────────────────────────────────────
  section('11. Bracket code extraction');
  ok('[FL] Tampa FC → code=FL',   extractBracketCode('[FL] Tampa FC').code === 'FL');
  ok('[FL] Tampa FC → name=Tampa FC', extractBracketCode('[FL] Tampa FC').name === 'Tampa FC');
  ok('No bracket → code empty',   extractBracketCode('Tampa FC').code === '');
  ok('No bracket → name unchanged', extractBracketCode('Tampa FC').name === 'Tampa FC');
  ok('[DE] TSV München → code=DE', extractBracketCode('[DE] TSV München').code === 'DE');
  ok('lowercase [in] normalised',  extractBracketCode('[in] Indiana Elite FC').code === 'IN');

  // ─── 12. US vs EU classification ─────────────────────────────────────────────
  section('12. US vs EU classification');
  ok('FL → United States, state=FL', (() => { const r = classifyLocation('FL','Tampa FC',''); return r.country === 'United States' && r.state === 'FL'; })());
  ok('TX → United States, state=TX', (() => { const r = classifyLocation('TX','Club',''); return r.country === 'United States' && r.state === 'TX'; })());
  ok('DE → Germany',                  classifyLocation('DE','TSV München','').country === 'Germany');
  ok('NL → Netherlands',              classifyLocation('NL','Club','').country === 'Netherlands');
  ok('GB → United Kingdom',           classifyLocation('GB','Club','').country === 'United Kingdom');
  ok('[IN] INDIANA ELITE FC → US',    (() => { const r = classifyLocation('IN','INDIANA ELITE FC',''); return r.country === 'United States' && r.state === 'IN'; })());
  ok('[IN] German comment → EU fallback → India not in EU_COUNTRIES, stays US',
    classifyLocation('IN','Mumbai Club','Das ist gut und sehr toll.').country === 'United States'); // IN not in EU_COUNTRIES
  ok('No code → United States default', classifyLocation('','Any Org','').country === 'United States');

  // ─── 13. CSV parser — basic header-aware ─────────────────────────────────────
  section('13. CSV parser — header-aware column detection');
  const basicCsv = `org_name,org_type,state,nps_score,comment,contact_name,contact_title
"[FL] Oak Park High School","high school","FL",9,"Saved us 3 hours a week.","Mike Johnson","Athletic Director"`;
  const parsed = parseCSV(basicCsv);
  ok('parses 1 entry',              parsed.length === 1);
  ok('bracket stripped from name',  parsed[0].orgName === 'Oak Park High School');
  ok('country is United States',    parsed[0].country === 'United States');
  ok('state is FL',                 parsed[0].state === 'FL');
  ok('orgType lowercase',           parsed[0].orgType === 'high school');
  ok('npsScore is 9',               parsed[0].npsScore === 9);
  ok('comment preserved',           parsed[0].comment === 'Saved us 3 hours a week.');
  ok('contactName extracted',       parsed[0].contactName === 'Mike Johnson');
  ok('contactTitle extracted',      parsed[0].contactTitle === 'Athletic Director');

  // ─── 14. CSV parser — column order independence ───────────────────────────────
  section('14. CSV parser — column order independence');
  const reorderedCsv = `nps_score,comment,org_name,org_type
10,"Works great.","[TX] Austin HS","high school"`;
  const reordered = parseCSV(reorderedCsv);
  ok('parses correctly with reordered columns', reordered.length === 1);
  ok('npsScore correct',  reordered[0].npsScore === 10);
  ok('orgName correct',   reordered[0].orgName === 'Austin HS');
  ok('orgType correct',   reordered[0].orgType === 'high school');

  // ─── 15. CSV parser — empty comment is stored ────────────────────────────────
  section('15. CSV parser — empty comment stored (not skipped)');
  const emptyCommentCsv = `org_name,nps_score,comment
"[FL] Sunrise HS",9,""
"[FL] Oak Park HS",8,"Great robot!"`;
  const emptyCommentResult = parseCSV(emptyCommentCsv);
  ok('both rows stored',            emptyCommentResult.length === 2);
  ok('empty comment entry has ""',  emptyCommentResult[0].comment === '');
  ok('entry with comment preserved',emptyCommentResult[1].comment === 'Great robot!');

  // ─── 16. CSV parser — invalid NPS score skipped, empty org name skipped ──────
  section('16. CSV parser — only truly invalid rows skipped');
  const badCsv = `org_name,nps_score,comment
"Valid Org",8,"Good comment."
"Bad Score",11,"Out of range."
,"7","Has comment but no org name."`;
  const badResult = parseCSV(badCsv);
  ok('skips npsScore > 10',     badResult.every((e) => e.npsScore <= 10));
  ok('skips empty org_name',    badResult.every((e) => e.orgName.length > 0));
  ok('keeps entries w/o comment', badResult.some((e) => e.comment === 'Good comment.'));
  ok('1 valid entry total',     badResult.length === 1);

  // ─── 17. CSV parser — CRLF line endings ─────────────────────────────────────
  section('17. CSV parser — CRLF (Windows) line endings');
  const crlfCsv = 'org_name,nps_score,comment\r\n"[CA] Sunset Golf",10,"Love it."\r\n"[TX] Austin HS",9,""\r\n';
  const crlfResult = parseCSV(crlfCsv);
  ok('parses both rows with CRLF', crlfResult.length === 2);
  ok('comment preserved',          crlfResult[0].comment === 'Love it.');

  // ─── 18. CSV parser — semicolon delimiter ────────────────────────────────────
  section('18. CSV parser — semicolon delimiter');
  const semiCsv = 'org_name;nps_score;comment\n"[NL] Ajax Academy";9;"Heel goed!"';
  const semiResult = parseCSV(semiCsv);
  ok('parses semicolon-delimited CSV', semiResult.length === 1);
  ok('orgName correct',               semiResult[0].orgName === 'Ajax Academy');
  ok('comment correct',               semiResult[0].comment === 'Heel goed!');

  // ─── 19. CSV parser — UTF-8 BOM ──────────────────────────────────────────────
  section('19. CSV parser — UTF-8 BOM stripped');
  const bomCsv = '\uFEFForg_name,nps_score,comment\n"[FL] Tampa FC",9,"Great!"';
  const bomResult = parseCSV(bomCsv);
  ok('parses BOM-prefixed CSV', bomResult.length === 1);
  ok('orgName correct',         bomResult[0].orgName === 'Tampa FC');

  // ─── 20. CSV parser — EU entry classified correctly ──────────────────────────
  section('20. CSV parser — EU org name classified as European');
  const euCsv = `org_name,nps_score,comment
"[DE] TSV München",9,"Super Produkt."
"[NL] Ajax Academy",8,"Heel goed product!"
"[GB] Oxford FC",10,"Brilliant piece of kit."`;
  const euResult = parseCSV(euCsv);
  ok('3 EU entries parsed',              euResult.length === 3);
  ok('[DE] TSV München → Germany',       euResult[0].country === 'Germany');
  ok('[NL] Ajax → Netherlands',          euResult[1].country === 'Netherlands');
  ok('[GB] Oxford → United Kingdom',     euResult[2].country === 'United Kingdom');
  ok('EU entries have empty state',      euResult.every((e) => e.state === ''));

  // ─── 21. CSV parser — deduplication ──────────────────────────────────────────
  section('21. CSV parser — duplicate rows deduplicated');
  const dupCsv = `org_name,nps_score,comment
"[FL] Tampa FC",9,"Love it."
"[FL] Tampa FC",9,"Love it."`;
  const dupResult = parseCSV(dupCsv);
  ok('duplicate row suppressed', dupResult.length === 1);

  // ─── 22. CSV parser — header-only returns empty ──────────────────────────────
  section('22. CSV parser — header-only');
  ok('returns []', parseCSV('org_name,nps_score,comment').length === 0);

  // ─── 23. NPS data file structure ─────────────────────────────────────────────
  section('23. NPS data file structure');
  const fileContent = JSON.parse(readFileSync(NPS_PATH, 'utf-8'));
  ok('nps-data.json readable',  fileContent !== null);
  ok('has entries array',       Array.isArray(fileContent.entries));
  ok('starts empty',            fileContent.entries.length === 0);

  // ─── 24. Admin NPS route source checks ───────────────────────────────────────
  section('24. Admin NPS route — structure');
  const routeSrc = readFileSync(join(ROOT, 'src/app/api/admin/nps/route.ts'), 'utf-8');
  ok('has read action',               routeSrc.includes("action === 'read'"));
  ok('has upload action',             routeSrc.includes("action === 'upload'"));
  ok('has append action',             routeSrc.includes("action === 'append'"));
  ok('has delete action',             routeSrc.includes("action === 'delete'"));
  ok('has clear action',              routeSrc.includes("action === 'clear'"));
  ok('checks admin password',         routeSrc.includes('Unauthorized'));
  ok('has extractBracketCode',        routeSrc.includes('extractBracketCode'));
  ok('has detectColumns',             routeSrc.includes('detectColumns'));
  ok('has classifyLocation',          routeSrc.includes('classifyLocation'));
  ok('has semicolon detection',       routeSrc.includes("semiCount > commaCount"));
  ok('strips BOM',                    routeSrc.includes('\\uFEFF'));
  ok('normalises CRLF',               routeSrc.includes('\\r\\n'));
  ok('comment not required',          !routeSrc.includes('!comment'));

} finally {
  if (existsSync(BACKUP)) {
    copyFileSync(BACKUP, NPS_PATH);
    const { unlinkSync } = await import('fs');
    unlinkSync(BACKUP);
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
