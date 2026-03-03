'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  heading: string;
  wordCount: number;
}

interface UpdateLogEntry {
  id: number;
  date: string;
  updateType: string;
  summary: string;
  data: object;
}

interface AdminData {
  version: string;
  kbContent: string;
  sections: Section[];
  totalWords: number;
  updateLog: UpdateLogEntry[];
}

interface BenchmarkUpdate {
  metric: string;
  oldValue: string;
  newValue: string;
  source: string;
}

interface DeliverabilityChange {
  change: string;
  impact: string;
  source: string;
}

interface NewFramework {
  name: string;
  summary: string;
  keyPrinciple: string;
  source: string;
}

interface UpdatedBestPractice {
  practice: string;
  oldAdvice: string;
  newAdvice: string;
  source: string;
}

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

interface ExtractState {
  status: 'idle' | 'extracting' | 'done' | 'error';
  pattern?: UpdatedBestPractice;
  error?: string;
  applyKey?: string;
}

interface NpsEntryLocal {
  id: number;
  date: string;
  orgName: string;
  orgType: string;
  sentiment: string;
  state: string;
  country: string;
  npsScore: number;
  comment: string;
  firstName?: string;
  lastName?: string;
}

interface SportRow {
  sport: string;
  // Per-event time comparison
  manualTimeMin: number;
  robotTimeMin: number;
  timeSavedMin: number;
  timeSavedPct: number;
  // Annual savings (from the Savings section of the sheet)
  laborSavingsDollar: number;
  paintSavingsGal: number;
  paintSavingsDollar: number;
  totalSavingsDollar: number;
  // Optional / legacy
  paintSavingsPct: number;
  fieldsPerDayManual: number;
  fieldsPerDayRobot: number;
  notes: string;
}

interface FetchedUpdates {
  benchmarkUpdates: BenchmarkUpdate[];
  deliverabilityChanges: DeliverabilityChange[];
  newFrameworks: NewFramework[];
  updatedBestPractices: UpdatedBestPractice[];
  noChangesNeeded: string[];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PasswordGate({ onSuccess }: { onSuccess: (pw: string) => void }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(pw);
      } else {
        setError(data.error || 'Incorrect password.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl mb-2">🔒</div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Admin Access</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Knowledge Base Management
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Admin password"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !pw}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {loading ? 'Verifying…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}

function UpdateCard({
  title,
  fields,
  onApply,
  onSkip,
  applying,
  applied,
  skipped,
}: {
  title: string;
  fields: { label: string; value: string }[];
  onApply: () => void;
  onSkip: () => void;
  applying: boolean;
  applied: boolean;
  skipped: boolean;
}) {
  if (skipped) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 opacity-40">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>⊘</span> <span>Skipped: {title}</span>
        </div>
      </div>
    );
  }

  if (applied) {
    return (
      <div className="border border-green-300 dark:border-green-700 rounded-xl p-4 bg-green-50 dark:bg-green-950/30">
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <span>✓</span> <span>Applied: {title}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3 bg-white dark:bg-gray-900">
      <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{title}</h4>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.label} className="text-sm">
            <span className="text-gray-500 dark:text-gray-400 font-medium">{f.label}: </span>
            <span className="text-gray-800 dark:text-gray-200">{f.value}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onApply}
          disabled={applying}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {applying ? 'Applying…' : 'Apply This Update'}
        </button>
        <button
          onClick={onSkip}
          disabled={applying}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// ─── TTKnowledgePanel ─────────────────────────────────────────────────────────

function TTKnowledgePanel({ password }: { password: string }) {
  const [ttOpen, setTtOpen] = useState(false);
  const [ttTab, setTtTab] = useState<'narrative' | 'sports'>('narrative');
  const [ttNarrative, setTtNarrative] = useState('');
  const [ttSports, setTtSports] = useState<SportRow[]>([]);
  const [ttUpdatedAt, setTtUpdatedAt] = useState('');
  const [ttLoading, setTtLoading] = useState(false);
  const [ttNarrativeSaving, setTtNarrativeSaving] = useState(false);
  const [ttNarrativeSaved, setTtNarrativeSaved] = useState(false);
  const [ttCsvText, setTtCsvText] = useState('');
  const [ttCsvParsed, setTtCsvParsed] = useState<SportRow[] | null>(null);
  const [ttCsvError, setTtCsvError] = useState('');
  const [ttSportsSaving, setTtSportsSaving] = useState(false);
  const [ttSportsSaved, setTtSportsSaved] = useState(false);
  const [ttDragging, setTtDragging] = useState(false);
  const [ttImportMode, setTtImportMode] = useState<'replace' | 'merge'>('replace');
  const [ttFileName, setTtFileName] = useState('');
  // maps field label → raw header string that was matched, or '' if not found
  const [ttColsFound, setTtColsFound] = useState<Record<string, string>>({});
  const [ttRawHeaders, setTtRawHeaders] = useState<string[]>([]);
  const [ttGSheetsUrl, setTtGSheetsUrl] = useState('');
  const [ttGSheetsLoading, setTtGSheetsLoading] = useState(false);
  const csvFileRef = useRef<HTMLInputElement>(null);

  async function loadTTKnowledge() {
    setTtLoading(true);
    try {
      const res = await fetch('/api/admin/tt-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'read' }),
      });
      const json = await res.json();
      if (json.success) {
        setTtNarrative(json.narrative ?? '');
        setTtSports(json.sports ?? []);
        setTtUpdatedAt(json.updatedAt ?? '');
      }
    } catch { /* silent */ }
    finally { setTtLoading(false); }
  }

  async function saveTTNarrative() {
    setTtNarrativeSaving(true);
    setTtNarrativeSaved(false);
    try {
      const res = await fetch('/api/admin/tt-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'save-narrative', narrative: ttNarrative }),
      });
      const json = await res.json();
      if (json.success) {
        setTtNarrativeSaved(true);
        setTtUpdatedAt(json.updatedAt ?? '');
        setTimeout(() => setTtNarrativeSaved(false), 3000);
      }
    } catch { /* silent */ }
    finally { setTtNarrativeSaving(false); }
  }

  async function saveTTSports(incoming: SportRow[], mode: 'replace' | 'merge' = 'replace') {
    setTtSportsSaving(true);
    setTtSportsSaved(false);
    try {
      let final: SportRow[];
      if (mode === 'merge') {
        // Keep existing entries not in incoming, update/add incoming entries
        const incomingNames = new Set(incoming.map(r => r.sport.toLowerCase()));
        const kept = ttSports.filter(r => !incomingNames.has(r.sport.toLowerCase()));
        final = [...kept, ...incoming];
      } else {
        final = incoming;
      }
      const res = await fetch('/api/admin/tt-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'save-sports', sports: final }),
      });
      const json = await res.json();
      if (json.success) {
        setTtSports(final);
        setTtCsvParsed(null);
        setTtCsvText('');
        setTtFileName('');
        setTtColsFound({});
        setTtRawHeaders([]);
        setTtSportsSaved(true);
        setTtUpdatedAt(json.updatedAt ?? '');
        setTimeout(() => setTtSportsSaved(false), 3000);
      }
    } catch { /* silent */ }
    finally { setTtSportsSaving(false); }
  }

  function parseSportsCSV(csvText: string, fileName?: string) {
    setTtCsvError('');
    setTtCsvParsed(null);
    setTtFileName(fileName ?? '');
    setTtRawHeaders([]);
    setTtColsFound({});

    // Normalize line endings (\r\n → \n, lone \r → \n)
    const normalized = csvText.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Keep empty lines — they're structural separators between sections
    const allLines = normalized.split('\n');
    if (allLines.filter(Boolean).length < 2) {
      setTtCsvError('CSV appears empty. Make sure the sheet is shared publicly before importing.');
      return;
    }

    // ── RFC 4180 CSV line parser (handles quoted fields with commas inside) ──
    function parseCSVLine(line: string): string[] {
      const fields: string[] = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else { inQ = !inQ; }
        } else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      fields.push(cur.trim());
      return fields;
    }

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    // Strip $ , % and other non-numeric chars before parseFloat
    const getNum = (row: string[], idx: number) =>
      idx < 0 ? 0 : parseFloat((row[idx]?.trim() ?? '').replace(/[^0-9.-]/g, '')) || 0;
    const getStr = (row: string[], idx: number) =>
      idx < 0 ? '' : (row[idx]?.trim() ?? '');

    // ── Section header detection ──────────────────────────────────────────────
    // A section header has ≥2 non-empty cells that collectively contain column keywords.
    // Title-only rows (like "MANUAL MARKINGS") have only 1 non-empty cell → excluded.
    const COL_KEYWORDS = ['time','labor','labour','paint','cost','saving','employee','gal',
                          'overmark','marking','initial','turftank','nr of','per year','per field'];
    function looksLikeHeaderRow(fields: string[]): boolean {
      const nonEmpty = fields.filter(f => f.trim());
      if (nonEmpty.length < 2) return false;
      return COL_KEYWORDS.some(kw => nonEmpty.some(f => f.toLowerCase().includes(kw)));
    }

    // Determine section type from the first non-empty cell's normalized value
    function getSectionType(fields: string[]): string {
      const first = norm(fields.find(f => f.trim()) ?? '');
      if (first === 'initialmarking' || first === 'marking') return 'manual_initial';
      if (first === 'overmarking')                           return 'overmarking';
      if (first.startsWith('manualperyear') || first === 'manualperyear') return 'manual_year';
      if (first.startsWith('turftank'))                      return 'tt_year';
      // Savings section: first cell is "Savings" AND other cells contain "saving"
      if (first === 'savings') {
        const normFields = fields.map(f => norm(f));
        if (normFields.some((f, i) => i > 0 && f.includes('saving'))) return 'savings';
      }
      return 'unknown';
    }

    // Collect all section headers and their line positions
    type SectionInfo = { lineIdx: number; type: string; fields: string[]; normFields: string[] };
    const sections: SectionInfo[] = [];
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i].trim();
      if (!line) continue;
      const fields = parseCSVLine(line);
      if (!looksLikeHeaderRow(fields)) continue;
      const type = getSectionType(fields);
      if (type !== 'unknown') {
        sections.push({ lineIdx: i, type, fields, normFields: fields.map(f => norm(f)) });
      }
    }

    if (sections.length === 0) {
      setTtCsvError(
        'Could not detect any data sections. ' +
        'Expected sections like "Initial Marking", "Turf Tank Per Year", or "Savings". ' +
        'If using CSV export, make sure you exported the correct sheet tab.'
      );
      return;
    }

    // Returns data rows for section s (lines between its header and the next section header)
    function getDataRows(sIdx: number): string[][] {
      const { lineIdx } = sections[sIdx];
      const end = sIdx + 1 < sections.length ? sections[sIdx + 1].lineIdx : allLines.length;
      return allLines.slice(lineIdx + 1, end).filter(l => l.trim()).map(parseCSVLine);
    }

    // findCol helper scoped to a section's normalized headers
    function makeFindCol(normHeaders: string[]) {
      return (...candidates: string[]): number => {
        for (const c of candidates) {
          const n = norm(c);
          const exact = normHeaders.findIndex(h => h === n);
          if (exact !== -1) return exact;
        }
        for (const c of candidates) {
          const n = norm(c);
          const sub = normHeaders.findIndex(h => h.includes(n));
          if (sub !== -1) return sub;
        }
        return -1;
      };
    }

    // ── Per-section data maps keyed by sport name ─────────────────────────────
    const manualInitialMap = new Map<string, { manualTimeMin: number }>();
    const ttYearMap = new Map<string, { laborTimeH: number; imPerYear: number; omPerYear: number }>();
    const savingsMap = new Map<string, {
      laborSavedH: number; laborSavingsDollar: number;
      paintSavingsGal: number; paintSavingsDollar: number; totalSavingsDollar: number;
    }>();

    // For the column-mapping display in the validation panel
    let colsFoundRecord: Record<string, string> = {};
    const detectedSectionTypes: string[] = [];

    for (let s = 0; s < sections.length; s++) {
      const { type, fields, normFields } = sections[s];
      detectedSectionTypes.push(type);
      const fc = makeFindCol(normFields);
      const dataRows = getDataRows(s);

      if (type === 'manual_initial') {
        // Labor Time (m) = marking time in minutes (human labor per marking event)
        const colTimeMin = fc('labor time (m)', 'labor time m', 'labour time m', 'time (m)', 'time m', 'time min');
        for (const row of dataRows) {
          const sport = getStr(row, 0);
          if (!sport) continue;
          manualInitialMap.set(sport, { manualTimeMin: getNum(row, colTimeMin) });
        }
      }

      if (type === 'tt_year') {
        // Labor Time (h) = total annual human hours with TT (setup + monitoring)
        // IM per Year + OM per Year = total marking events → derive per-event time
        const colLaborH = fc('labor time (h)', 'labor time h', 'labour time h', 'time (h)');
        const colIM     = fc('im per year', 'im/year', 'imperyear', 'initial per year', 'initial marking (im)', 'initial marking');
        const colOM     = fc('om per year', 'om/year', 'omperyear', 'overmarking per year', 'overmarking (om)', 'overmarking');
        for (const row of dataRows) {
          const sport = getStr(row, 0);
          if (!sport) continue;
          ttYearMap.set(sport, {
            laborTimeH:  getNum(row, colLaborH),
            imPerYear:   getNum(row, colIM),
            omPerYear:   getNum(row, colOM),
          });
        }
      }

      if (type === 'savings') {
        const colLaborH   = fc('labor time (h)', 'labor time h', 'labour time h');
        const colLaborSav = fc('labor savings', 'labour savings', 'labor cost savings');
        const colPaintGal = fc('paint (gal)', 'paint gal');
        const colPaintSav = fc('paint savings', 'paint cost savings', 'paint saving');
        const colTotal    = fc('savings per sport', 'savings per field', 'total savings', 'savings total');

        // Record the savings section's column mapping for display
        colsFoundRecord = {
          'Sport':                fields[0]                         ?? '',
          'Labor Saved (h/yr)':   colLaborH   >= 0 ? fields[colLaborH]   : '',
          'Labor Savings ($/yr)': colLaborSav >= 0 ? fields[colLaborSav] : '',
          'Paint Saved (gal/yr)': colPaintGal >= 0 ? fields[colPaintGal] : '',
          'Paint Savings ($/yr)': colPaintSav >= 0 ? fields[colPaintSav] : '',
          'Total Savings ($/yr)': colTotal    >= 0 ? fields[colTotal]    : '',
        };
        setTtRawHeaders(fields.filter(Boolean));

        for (const row of dataRows) {
          const sport = getStr(row, 0);
          if (!sport) continue;
          savingsMap.set(sport, {
            laborSavedH:         getNum(row, colLaborH),
            laborSavingsDollar:  getNum(row, colLaborSav),
            paintSavingsGal:     getNum(row, colPaintGal),
            paintSavingsDollar:  getNum(row, colPaintSav),
            totalSavingsDollar:  getNum(row, colTotal),
          });
        }
      }
    }

    setTtColsFound(colsFoundRecord);

    // ── Merge sections into SportRow[] ────────────────────────────────────────
    // Prefer sport names from savings section (most complete), fall back to others
    const allSportNames = new Set<string>();
    savingsMap.forEach((_, s) => allSportNames.add(s));
    manualInitialMap.forEach((_, s) => allSportNames.add(s));
    if (allSportNames.size === 0) ttYearMap.forEach((_, s) => allSportNames.add(s));

    // Words that appear as section header text but get picked up as sport names
    const SKIP_NAMES = new Set(['savings','overmarking','initialmarking','manualperyear',
                                'turftankperyear','total','totals','sport','marking']);

    const entries: SportRow[] = [];
    for (const sportName of Array.from(allSportNames)) {
      if (SKIP_NAMES.has(norm(sportName))) continue;

      const manual = manualInitialMap.get(sportName);
      const tt     = ttYearMap.get(sportName);
      const sav    = savingsMap.get(sportName);

      const manualTimeMin = manual?.manualTimeMin ?? 0;
      // Derive per-event robot operator time: annual TT hours ÷ total annual events × 60
      const totalEvents = (tt?.imPerYear ?? 0) + (tt?.omPerYear ?? 0);
      const robotTimeMin = tt && totalEvents > 0
        ? Math.round((tt.laborTimeH / totalEvents) * 60 * 10) / 10
        : 0;
      const timeSavedMin = manualTimeMin > 0 && robotTimeMin > 0
        ? Math.round(manualTimeMin - robotTimeMin)
        : 0;
      const timeSavedPct = manualTimeMin > 0 && timeSavedMin > 0
        ? Math.round((timeSavedMin / manualTimeMin) * 100)
        : 0;

      entries.push({
        sport:              sportName,
        manualTimeMin,
        robotTimeMin,
        timeSavedMin,
        timeSavedPct,
        laborSavingsDollar: sav?.laborSavingsDollar  ?? 0,
        paintSavingsGal:    sav?.paintSavingsGal     ?? 0,
        paintSavingsDollar: sav?.paintSavingsDollar  ?? 0,
        totalSavingsDollar: sav?.totalSavingsDollar  ?? 0,
        paintSavingsPct:    0,
        fieldsPerDayManual: 0,
        fieldsPerDayRobot:  0,
        notes:              '',
      });
    }

    if (entries.length === 0) {
      setTtCsvError(
        `Sections detected (${detectedSectionTypes.join(', ')}) but no sport rows found. ` +
        'Check that sport names appear in the first column of each section.'
      );
      return;
    }
    setTtCsvParsed(entries);
  }

  async function loadFromGSheets(url: string) {
    setTtCsvError('');
    setTtGSheetsLoading(true);
    try {
      const res = await fetch('/api/admin/tt-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'fetch-gsheets', url }),
      });
      const json = await res.json();
      if (!json.success) {
        setTtCsvError(json.error ?? 'Failed to fetch sheet.');
        return;
      }
      setTtCsvText(json.csv);
      parseSportsCSV(json.csv, 'Google Sheets');
    } catch {
      setTtCsvError('Network error. Check your connection and try again.');
    } finally {
      setTtGSheetsLoading(false);
    }
  }

  useEffect(() => {
    loadTTKnowledge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <button
        onClick={() => setTtOpen(!ttOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="text-left">
          <h2 className="font-semibold">Turf Tank Knowledge</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Sales intelligence injected into every generation — personas, proof points, objections, sport-specific numbers.
            {ttUpdatedAt && ` · Updated ${new Date(ttUpdatedAt).toLocaleDateString()}`}
          </p>
        </div>
        <span className="text-gray-400 text-sm shrink-0 ml-4">{ttOpen ? '▲' : '▼'}</span>
      </button>

      {ttOpen && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          {ttLoading && (
            <p className="text-sm text-gray-400 py-6 text-center">Loading TT knowledge…</p>
          )}
          {!ttLoading && (
            <>
              {/* Tab bar */}
              <div className="flex border-b border-gray-200 dark:border-gray-800">
                {(['narrative', 'sports'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTtTab(tab)}
                    className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                      ttTab === tab
                        ? 'border-green-500 text-green-600 dark:text-green-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab === 'narrative'
                      ? 'Sales Intelligence'
                      : `Sports Data${ttSports.length > 0 ? ` (${ttSports.length})` : ''}`}
                  </button>
                ))}
              </div>

              {/* Sales Intelligence tab */}
              {ttTab === 'narrative' && (
                <div className="px-6 py-5 space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Write anything Claude should know about Turf Tank — personas, objection handling, named customers, proof points, pricing context, competitive positioning. Markdown supported. This is appended to every system prompt.
                  </p>
                  <textarea
                    value={ttNarrative}
                    onChange={(e) => setTtNarrative(e.target.value)}
                    rows={20}
                    placeholder={`## Buyer Personas\n\n### Parks & Rec Director\n- Manages X fields...\n\n## Proof Points\n\n- City of [X] saved 8 hours/week...\n\n## Objection Handling\n\n- "Too expensive" → ROI pays back in Y months...`}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 font-mono leading-relaxed resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {ttNarrative.length.toLocaleString()} chars · {ttNarrative.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words
                    </span>
                    <button
                      onClick={saveTTNarrative}
                      disabled={ttNarrativeSaving}
                      className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        ttNarrativeSaved
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white'
                      }`}
                    >
                      {ttNarrativeSaving ? 'Saving…' : ttNarrativeSaved ? '✓ Saved' : 'Save to Knowledge Base'}
                    </button>
                  </div>
                </div>
              )}

              {/* Sports Data tab */}
              {ttTab === 'sports' && (
                <div className="px-6 py-5 space-y-5">

                  {/* Hidden file input — always present */}
                  <input
                    ref={csvFileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const text = ev.target?.result as string;
                        setTtCsvText(text);
                        parseSportsCSV(text, file.name);
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />

                  {/* ── Upload zone (hidden once a file is parsed) ── */}
                  {!ttCsvParsed && (
                    <div className="space-y-4">

                      {/* ── Option A: Google Sheets URL (preferred) ── */}
                      <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                          </svg>
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">Import directly from Google Sheets (easiest)</p>
                        </div>
                        <ol className="text-xs text-green-700 dark:text-green-500 space-y-1 list-decimal list-inside">
                          <li>Open your Google Sheet → click <strong>Share</strong> → set to <strong>&ldquo;Anyone with the link can view&rdquo;</strong></li>
                          <li>Copy the URL from your browser address bar</li>
                          <li>Paste it below and click Load</li>
                        </ol>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={ttGSheetsUrl}
                            onChange={(e) => setTtGSheetsUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/…"
                            className="flex-1 px-3 py-2 rounded-lg border border-green-200 dark:border-green-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 font-mono text-xs"
                          />
                          <button
                            onClick={() => loadFromGSheets(ttGSheetsUrl)}
                            disabled={!ttGSheetsUrl.trim() || ttGSheetsLoading}
                            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-medium whitespace-nowrap transition-colors"
                          >
                            {ttGSheetsLoading ? 'Loading…' : 'Load Sheet'}
                          </button>
                        </div>
                      </div>

                      {/* ── Divider ── */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                        <span className="text-xs text-gray-400 dark:text-gray-500">or upload a CSV file</span>
                        <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                      </div>

                      {/* ── Option B: CSV drop zone ── */}
                      <div
                        onClick={() => csvFileRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setTtDragging(true); }}
                        onDragLeave={() => setTtDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setTtDragging(false);
                          const file = e.dataTransfer.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const text = ev.target?.result as string;
                            setTtCsvText(text);
                            parseSportsCSV(text, file.name);
                          };
                          reader.readAsText(file);
                        }}
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-6 cursor-pointer transition-colors ${
                          ttDragging
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <svg className={`w-7 h-7 ${ttDragging ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                        <div className="text-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop .csv here</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400"> or </span>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">browse</span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Google Sheets → File → Download → Comma Separated Values (.csv)</p>
                      </div>

                      {/* ── Recommended column format ── */}
                      <details className="group">
                        <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-300 list-none flex items-center gap-1">
                          <span className="group-open:hidden">▶</span>
                          <span className="hidden group-open:inline">▼</span>
                          Recommended column format for your sheet
                        </summary>
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            For best results, structure your sheet as a flat table with these column headers. You can use your own names — the system detects by keyword. Only <strong>Sport</strong> is required.
                          </p>
                          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                            <table className="min-w-full text-xs">
                              <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                  {['Column header', 'What it stores', 'Example value'].map(h => (
                                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                                {[
                                  ['Sport', 'Sport name', 'Football'],
                                  ['Manual Time (min)', 'Manual marking time in minutes', '1440'],
                                  ['Robot Time (min)', 'TT robot marking time in minutes', '90'],
                                  ['Time Saved (min)', 'Minutes saved per marking', '1350'],
                                  ['Time Saved (%)', '% time reduction', '94'],
                                  ['Paint Savings (%)', '% less paint used', '15'],
                                  ['Fields/Day Manual', 'Fields a human can mark per day', '1'],
                                  ['Fields/Day Robot', 'Fields TT can mark per day', '8'],
                                  ['Notes', 'Any context for Claude', 'Based on 11v11 pitch'],
                                ].map(([col, desc, ex]) => (
                                  <tr key={col}>
                                    <td className="px-3 py-2 font-mono text-green-700 dark:text-green-400 whitespace-nowrap">{col}</td>
                                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{desc}</td>
                                    <td className="px-3 py-2 text-gray-500 dark:text-gray-500 font-mono">{ex}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Tip: column names are matched by keyword so &ldquo;Labor Time (m)&rdquo;, &ldquo;Manual Marking Time&rdquo;, or &ldquo;Time Manual (min)&rdquo; all map to <em>Manual Time</em>.
                          </p>
                        </div>
                      </details>

                      {/* Paste fallback */}
                      <details className="group">
                        <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-300 list-none flex items-center gap-1">
                          <span className="group-open:hidden">▶</span>
                          <span className="hidden group-open:inline">▼</span>
                          Or paste CSV text manually
                        </summary>
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={ttCsvText}
                            onChange={(e) => setTtCsvText(e.target.value)}
                            rows={6}
                            placeholder="Paste CSV here…"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 font-mono resize-none"
                          />
                          <button
                            onClick={() => parseSportsCSV(ttCsvText)}
                            disabled={!ttCsvText.trim()}
                            className="px-4 py-2 rounded-lg bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-40 text-white text-sm font-medium transition-colors"
                          >
                            Preview Import
                          </button>
                        </div>
                      </details>

                      {ttCsvError && (
                        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">{ttCsvError}</p>
                      )}
                    </div>
                  )}

                  {/* ── Validation panel (shown after a file is parsed) ── */}
                  {ttCsvParsed && (
                    <div className="space-y-4">

                      {/* File header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {ttFileName || 'Pasted CSV'} — {ttCsvParsed.length} sport{ttCsvParsed.length !== 1 ? 's' : ''} detected
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setTtCsvParsed(null);
                            setTtCsvText('');
                            setTtFileName('');
                            setTtColsFound({});
                            setTtRawHeaders([]);
                            setTtCsvError('');
                          }}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
                        >
                          Discard
                        </button>
                      </div>

                      {/* Column mapping table */}
                      {Object.keys(ttColsFound).length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Column mapping</p>

                          {/* Raw headers from the file */}
                          {ttRawHeaders.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">
                              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 font-medium">Headers detected in your file:</p>
                              <p className="font-mono text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                {ttRawHeaders.map((h, i) => (
                                  <span key={i}>
                                    {i > 0 && <span className="text-gray-300 dark:text-gray-600">, </span>}
                                    <span className="text-blue-600 dark:text-blue-400">&ldquo;{h}&rdquo;</span>
                                  </span>
                                ))}
                              </p>
                            </div>
                          )}

                          {/* Field → matched header mapping */}
                          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="min-w-full text-xs">
                              <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 w-1/3">Field used in prompts</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">Matched to column in your CSV</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {Object.entries(ttColsFound).map(([field, rawHeader]) => (
                                  <tr key={field} className="bg-white dark:bg-gray-900">
                                    <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{field}</td>
                                    <td className="px-3 py-2">
                                      {rawHeader
                                        ? <span className="inline-flex items-center gap-1.5 font-mono bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-md">✓ &ldquo;{rawHeader}&rdquo;</span>
                                        : <span className="text-gray-400 dark:text-gray-600 italic">not found — will be 0</span>
                                      }
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            If a field mapped to the wrong column, rename that column header in Google Sheets and re-upload.
                          </p>
                        </div>
                      )}

                      {/* Preview table */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Data preview</p>
                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                {['Sport', 'Manual (min)', 'Robot (min)', 'Time Saved (min)', 'Time Saved (%)', 'Labor Savings ($/yr)', 'Paint Saved (gal)', 'Paint Savings ($/yr)', 'Total Savings ($/yr)'].map(col => (
                                  <th key={col} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {ttCsvParsed.map((row, i) => (
                                <tr key={i} className="bg-white dark:bg-gray-900">
                                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{row.sport}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.manualTimeMin || '—'}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.robotTimeMin || '—'}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.timeSavedMin || '—'}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.timeSavedPct ? `${row.timeSavedPct}%` : '—'}</td>
                                  <td className="px-3 py-2 text-green-700 dark:text-green-400 font-medium">{row.laborSavingsDollar ? `$${Math.round(row.laborSavingsDollar).toLocaleString()}` : '—'}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.paintSavingsGal ? `${row.paintSavingsGal.toFixed(0)} gal` : '—'}</td>
                                  <td className="px-3 py-2 text-green-700 dark:text-green-400">{row.paintSavingsDollar ? `$${Math.round(row.paintSavingsDollar).toLocaleString()}` : '—'}</td>
                                  <td className="px-3 py-2 text-green-700 dark:text-green-400 font-semibold">{row.totalSavingsDollar ? `$${Math.round(row.totalSavingsDollar).toLocaleString()}` : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Import mode — only shown when existing data present */}
                      {ttSports.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            You already have {ttSports.length} sport{ttSports.length !== 1 ? 's' : ''} stored. How do you want to import?
                          </p>
                          <div className="space-y-2">
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name="ttImportMode"
                                value="replace"
                                checked={ttImportMode === 'replace'}
                                onChange={() => setTtImportMode('replace')}
                                className="mt-0.5 accent-green-600"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Replace all</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Delete existing sports data and use only this file&apos;s data.</p>
                              </div>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name="ttImportMode"
                                value="merge"
                                checked={ttImportMode === 'merge'}
                                onChange={() => setTtImportMode('merge')}
                                className="mt-0.5 accent-green-600"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Merge</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Keep sports not in this file; update or add sports that are.</p>
                              </div>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Confirm & save */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => saveTTSports(ttCsvParsed, ttSports.length > 0 ? ttImportMode : 'replace')}
                          disabled={ttSportsSaving}
                          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                            ttSportsSaved
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white'
                          }`}
                        >
                          {ttSportsSaving
                            ? 'Saving…'
                            : ttSportsSaved
                            ? `✓ Saved`
                            : `Confirm & Save ${ttCsvParsed.length} sport${ttCsvParsed.length !== 1 ? 's' : ''}`}
                        </button>
                        <button
                          onClick={() => {
                            setTtCsvParsed(null);
                            setTtCsvText('');
                            setTtFileName('');
                            setTtColsFound({});
                            setTtRawHeaders([]);
                            setTtCsvError('');
                          }}
                          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm transition-colors"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Currently stored (shown when no pending import) ── */}
                  {ttSports.length > 0 && !ttCsvParsed && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                        Currently stored — {ttSports.length} sports
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              {['Sport', 'Manual (min)', 'Robot (min)', 'Time Saved', 'Labor Savings/yr', 'Paint Savings/yr', 'Total Savings/yr'].map(col => (
                                <th key={col} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {ttSports.map((row, i) => (
                              <tr key={i} className="bg-white dark:bg-gray-900">
                                <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{row.sport}</td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.manualTimeMin || '—'}</td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.robotTimeMin || '—'}</td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                  {row.timeSavedMin ? `${row.timeSavedMin} min` : row.timeSavedPct ? `${row.timeSavedPct}%` : '—'}
                                </td>
                                <td className="px-3 py-2 text-green-700 dark:text-green-400 font-medium">
                                  {row.laborSavingsDollar ? `$${Math.round(row.laborSavingsDollar).toLocaleString()}` : '—'}
                                </td>
                                <td className="px-3 py-2 text-green-700 dark:text-green-400">
                                  {row.paintSavingsDollar ? `$${Math.round(row.paintSavingsDollar).toLocaleString()}` : '—'}
                                </td>
                                <td className="px-3 py-2 text-green-700 dark:text-green-400 font-semibold">
                                  {row.totalSavingsDollar ? `$${Math.round(row.totalSavingsDollar).toLocaleString()}` : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Clear all sports data?')) saveTTSports([], 'replace');
                        }}
                        className="mt-2 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      >
                        Clear all sports data
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function AdminDashboard({ password }: { password: string }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  const [kbOpen, setKbOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(true);
  const [repliesOpen, setRepliesOpen] = useState(true);

  const [replies, setReplies] = useState<ReplyEntry[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesError, setRepliesError] = useState('');
  const [expandedReply, setExpandedReply] = useState<number | null>(null);
  const [extractStates, setExtractStates] = useState<Record<number, ExtractState>>({});

  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [updates, setUpdates] = useState<FetchedUpdates | null>(null);
  const [fetchedDate, setFetchedDate] = useState('');

  // Track state per individual update item: null | 'applying' | 'applied' | 'skipped'
  const [itemStates, setItemStates] = useState<Record<string, string>>({});

  const [npsOpen, setNpsOpen] = useState(true);
  const [npsEntries, setNpsEntries] = useState<NpsEntryLocal[]>([]);
  const [npsLoading, setNpsLoading] = useState(false);
  const [npsError, setNpsError] = useState('');
  const [npsCsvText, setNpsCsvText] = useState('');
  const [npsUploading, setNpsUploading] = useState(false);
  const [npsUploadMode, setNpsUploadMode] = useState<'upload' | 'append'>('append');
  const [npsUploadError, setNpsUploadError] = useState('');
  const [npsUploadResult, setNpsUploadResult] = useState<{ count: number; total?: number } | null>(null);
  const [npsFileName, setNpsFileName] = useState('');
  const npsFileRef = useRef<HTMLInputElement>(null);
  const [npsSelectedRegion, setNpsSelectedRegion] = useState<string | null>(null);
  const [npsExpandedRow, setNpsExpandedRow] = useState<number | null>(null);
  const [npsParseStats, setNpsParseStats] = useState<{
    detectedColumns: Record<string, number>;
    headerFields: string[];
    totalDataRows: number;
    skippedNoOrgName: number;
    skippedDetractors: number;
    skippedDuplicates: number;
    parsed: number;
  } | null>(null);

  // ── Research Cache ──────────────────────────────────────────────────────────
  const [cacheOpen, setCacheOpen] = useState(false);
  const [cacheEntries, setCacheEntries] = useState<Array<{
    key: string; personName?: string; company: string;
    cachedAt: string; expiresAt: string; hasNewInfo: boolean; newInfoFields: string[];
  }>>([]);
  const [cacheSettings, setCacheSettings] = useState<{ allowUserRefresh: boolean; cacheDays: number }>({
    allowUserRefresh: true, cacheDays: 30,
  });
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheSaving, setCacheSaving] = useState(false);

  async function loadCacheData() {
    setCacheLoading(true);
    try {
      const res = await fetch('/api/admin/research-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'read' }),
      });
      const json = await res.json();
      if (json.success) {
        setCacheEntries(json.entries ?? []);
        setCacheSettings(json.settings ?? { allowUserRefresh: true, cacheDays: 30 });
      }
    } catch { /* silent */ }
    finally { setCacheLoading(false); }
  }

  async function saveCacheSettings(patch: Partial<{ allowUserRefresh: boolean; cacheDays: number }>) {
    setCacheSaving(true);
    try {
      const res = await fetch('/api/admin/research-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'update-settings', ...patch }),
      });
      const json = await res.json();
      if (json.success) setCacheSettings(json.settings);
    } catch { /* silent */ }
    finally { setCacheSaving(false); }
  }

  async function deleteCacheEntry(key: string) {
    await fetch('/api/admin/research-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, action: 'delete', key }),
    });
    setCacheEntries((prev) => prev.filter((e) => e.key !== key));
  }

  async function clearAllCache() {
    if (!confirm('Delete all cached research entries? This cannot be undone.')) return;
    await fetch('/api/admin/research-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, action: 'clear' }),
    });
    setCacheEntries([]);
  }

  async function loadData() {
    setDataLoading(true);
    setDataError('');
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setDataError(json.error || 'Failed to load data.');
      }
    } catch {
      setDataError('Network error loading data.');
    } finally {
      setDataLoading(false);
    }
  }

  async function loadReplies() {
    setRepliesLoading(true);
    setRepliesError('');
    try {
      const res = await fetch('/api/admin/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        setReplies(json.replies ?? []);
      } else {
        setRepliesError(json.error || 'Failed to load replies.');
      }
    } catch {
      setRepliesError('Network error loading replies.');
    } finally {
      setRepliesLoading(false);
    }
  }

  async function handleExtractPattern(reply: ReplyEntry) {
    setExtractStates((prev) => ({ ...prev, [reply.id]: { status: 'extracting' } }));
    try {
      const res = await fetch('/api/admin/extract-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, reply }),
      });
      const json = await res.json();
      if (json.success) {
        const applyKey = `reply-pattern-${reply.id}`;
        setExtractStates((prev) => ({
          ...prev,
          [reply.id]: { status: 'done', pattern: json.pattern, applyKey },
        }));
      } else {
        setExtractStates((prev) => ({
          ...prev,
          [reply.id]: { status: 'error', error: json.error || 'Failed to extract pattern.' },
        }));
      }
    } catch {
      setExtractStates((prev) => ({
        ...prev,
        [reply.id]: { status: 'error', error: 'Network error extracting pattern.' },
      }));
    }
  }

  useEffect(() => {
    loadData();
    loadReplies();
    loadNpsEntries();
    loadCacheData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFetchUpdates() {
    setFetching(true);
    setFetchError('');
    setUpdates(null);
    setItemStates({});
    try {
      const res = await fetch('/api/admin/fetch-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        setUpdates(json.updates);
        setFetchedDate(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
      } else {
        setFetchError(json.error || 'Failed to fetch updates.');
      }
    } catch {
      setFetchError('Network error fetching updates.');
    } finally {
      setFetching(false);
    }
  }

  async function handleApply(updateType: string, updateData: object, key: string) {
    setItemStates((prev) => ({ ...prev, [key]: 'applying' }));
    try {
      const res = await fetch('/api/admin/apply-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, updateType, updateData }),
      });
      const json = await res.json();
      if (json.success) {
        setItemStates((prev) => ({ ...prev, [key]: 'applied' }));
        // Reload admin data to reflect new version date
        await loadData();
      } else {
        setItemStates((prev) => ({ ...prev, [key]: '' }));
        alert(`Failed to apply update: ${json.error}`);
      }
    } catch {
      setItemStates((prev) => ({ ...prev, [key]: '' }));
      alert('Network error applying update.');
    }
  }

  function handleSkip(key: string) {
    setItemStates((prev) => ({ ...prev, [key]: 'skipped' }));
  }

  async function loadNpsEntries() {
    setNpsLoading(true);
    setNpsError('');
    try {
      const res = await fetch('/api/admin/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'read' }),
      });
      const json = await res.json();
      if (json.success) {
        setNpsEntries(json.entries ?? []);
      } else {
        setNpsError(json.error || 'Failed to load NPS data.');
      }
    } catch {
      setNpsError('Network error loading NPS data.');
    } finally {
      setNpsLoading(false);
    }
  }

  async function handleNpsUpload() {
    if (!npsCsvText.trim()) return;
    setNpsUploading(true);
    setNpsUploadError('');
    setNpsUploadResult(null);
    setNpsParseStats(null);
    try {
      const res = await fetch('/api/admin/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: npsUploadMode, csv: npsCsvText }),
      });
      const json = await res.json();
      if (json.stats) setNpsParseStats(json.stats);
      if (json.success) {
        setNpsUploadResult({ count: json.count, total: json.total ?? json.count });
        setNpsCsvText('');
        setNpsFileName('');
        if (npsFileRef.current) npsFileRef.current.value = '';
        await loadNpsEntries();
      } else {
        setNpsUploadError(json.error || 'Upload failed.');
      }
    } catch {
      setNpsUploadError('Network error during upload.');
    } finally {
      setNpsUploading(false);
    }
  }

  async function handleNpsDelete(id: number) {
    try {
      const res = await fetch('/api/admin/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'delete', id }),
      });
      const json = await res.json();
      if (json.success) {
        setNpsEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } catch {
      // silent
    }
  }

  async function handleNpsClear() {
    if (!confirm('Delete all NPS entries? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'clear' }),
      });
      const json = await res.json();
      if (json.success) setNpsEntries([]);
    } catch {
      // silent
    }
  }

  const appliedCount = Object.values(itemStates).filter((s) => s === 'applied').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Knowledge Base Admin</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              EmailMaster · Hidden from navigation
            </p>
          </div>
          {data && (
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">Last updated</div>
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {data.version}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {dataLoading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="text-sm">Loading knowledge base…</div>
          </div>
        )}

        {dataError && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-600 dark:text-red-400">
            {dataError}
          </div>
        )}

        <TTKnowledgePanel password={password} />

        {data && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {data.totalWords.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total words</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {data.sections.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sections</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {data.updateLog.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Updates applied</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {replies.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Replies logged</div>
              </div>
            </div>


            {/* Update Knowledge Base */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-semibold">Update Knowledge Base</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Uses Claude with web search to find new cold email research, benchmarks, and best
                    practices since{' '}
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {data.version}
                    </span>
                    .
                  </p>
                </div>
                <button
                  onClick={handleFetchUpdates}
                  disabled={fetching}
                  className="shrink-0 ml-4 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {fetching ? (
                    <>
                      <span className="animate-spin inline-block">⟳</span>
                      Searching web…
                    </>
                  ) : (
                    <>🔍 Check for Updates</>
                  )}
                </button>
              </div>

              {fetchError && (
                <div className="mt-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                  {fetchError}
                </div>
              )}

              {updates && (
                <div className="mt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Results from {fetchedDate}
                    </h3>
                    {appliedCount > 0 && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full">
                        {appliedCount} update{appliedCount !== 1 ? 's' : ''} applied
                      </span>
                    )}
                  </div>

                  {/* Benchmark Updates */}
                  {updates.benchmarkUpdates?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                        Benchmark Updates ({updates.benchmarkUpdates.length})
                      </h4>
                      <div className="space-y-3">
                        {updates.benchmarkUpdates.map((u, i) => {
                          const key = `benchmark-${i}`;
                          return (
                            <UpdateCard
                              key={key}
                              title={u.metric}
                              fields={[
                                { label: 'Old value', value: u.oldValue },
                                { label: 'New value', value: u.newValue },
                                { label: 'Source', value: u.source },
                              ]}
                              onApply={() =>
                                handleApply('benchmarkUpdate', u, key)
                              }
                              onSkip={() => handleSkip(key)}
                              applying={itemStates[key] === 'applying'}
                              applied={itemStates[key] === 'applied'}
                              skipped={itemStates[key] === 'skipped'}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Deliverability Changes */}
                  {updates.deliverabilityChanges?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                        Deliverability Changes ({updates.deliverabilityChanges.length})
                      </h4>
                      <div className="space-y-3">
                        {updates.deliverabilityChanges.map((u, i) => {
                          const key = `deliverability-${i}`;
                          return (
                            <UpdateCard
                              key={key}
                              title={u.change?.slice(0, 80) + (u.change?.length > 80 ? '…' : '')}
                              fields={[
                                { label: 'Change', value: u.change },
                                { label: 'Impact', value: u.impact },
                                { label: 'Source', value: u.source },
                              ]}
                              onApply={() =>
                                handleApply('deliverabilityChange', u, key)
                              }
                              onSkip={() => handleSkip(key)}
                              applying={itemStates[key] === 'applying'}
                              applied={itemStates[key] === 'applied'}
                              skipped={itemStates[key] === 'skipped'}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* New Frameworks */}
                  {updates.newFrameworks?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                        New Frameworks ({updates.newFrameworks.length})
                      </h4>
                      <div className="space-y-3">
                        {updates.newFrameworks.map((u, i) => {
                          const key = `framework-${i}`;
                          return (
                            <UpdateCard
                              key={key}
                              title={u.name}
                              fields={[
                                { label: 'Summary', value: u.summary },
                                { label: 'Key principle', value: u.keyPrinciple },
                                { label: 'Source', value: u.source },
                              ]}
                              onApply={() => handleApply('newFramework', u, key)}
                              onSkip={() => handleSkip(key)}
                              applying={itemStates[key] === 'applying'}
                              applied={itemStates[key] === 'applied'}
                              skipped={itemStates[key] === 'skipped'}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Updated Best Practices */}
                  {updates.updatedBestPractices?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                        Updated Best Practices ({updates.updatedBestPractices.length})
                      </h4>
                      <div className="space-y-3">
                        {updates.updatedBestPractices.map((u, i) => {
                          const key = `practice-${i}`;
                          return (
                            <UpdateCard
                              key={key}
                              title={u.practice}
                              fields={[
                                { label: 'Old advice', value: u.oldAdvice },
                                { label: 'New advice', value: u.newAdvice },
                                { label: 'Source', value: u.source },
                              ]}
                              onApply={() =>
                                handleApply('updatedBestPractice', u, key)
                              }
                              onSkip={() => handleSkip(key)}
                              applying={itemStates[key] === 'applying'}
                              applied={itemStates[key] === 'applied'}
                              skipped={itemStates[key] === 'skipped'}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* No Changes Needed */}
                  {updates.noChangesNeeded?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                        Still Accurate — No Changes Needed
                      </h4>
                      <ul className="space-y-1">
                        {updates.noChangesNeeded.map((item, i) => (
                          <li
                            key={i}
                            className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                          >
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Table of Contents */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setTocOpen((v) => !v)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <h2 className="font-semibold">Table of Contents</h2>
                <span className="text-gray-400 text-sm">{tocOpen ? '▲' : '▼'}</span>
              </button>
              {tocOpen && (
                <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4">
                  <div className="space-y-1">
                    {data.sections.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 text-sm border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <span className="text-gray-700 dark:text-gray-300">{s.heading}</span>
                        <span className="text-gray-400 dark:text-gray-500 text-xs">
                          ~{s.wordCount.toLocaleString()} words
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Knowledge Base Viewer */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setKbOpen((v) => !v)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <h2 className="font-semibold">Knowledge Base — Full Content</h2>
                <span className="text-gray-400 text-sm">{kbOpen ? '▲ Hide' : '▼ Show'}</span>
              </button>
              {kbOpen && (
                <div className="border-t border-gray-200 dark:border-gray-800">
                  <pre className="p-6 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono max-h-[600px] overflow-y-auto">
                    {data.kbContent}
                  </pre>
                </div>
              )}
            </div>

            {/* Update Log */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setLogOpen((v) => !v)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <h2 className="font-semibold">Update History</h2>
                <span className="text-gray-400 text-sm">{logOpen ? '▲' : '▼'}</span>
              </button>
              {logOpen && (
                <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4">
                  {data.updateLog.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                      No updates applied yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {data.updateLog.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-4 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                        >
                          <div className="shrink-0 text-xs text-gray-400 dark:text-gray-500 w-24 pt-0.5">
                            {entry.date}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-800 dark:text-gray-200">
                              {entry.summary}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
                              {entry.updateType}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NPS Social Proof */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setNpsOpen((v) => !v)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div>
                  <h2 className="font-semibold">NPS Social Proof</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Upload customer NPS comments. The email generator will automatically match and inject peer quotes.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {npsEntries.length > 0 && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-full">
                      {npsEntries.length} entries
                    </span>
                  )}
                  <span className="text-gray-400 text-sm">{npsOpen ? '▲' : '▼'}</span>
                </div>
              </button>
              {npsOpen && (
                <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-5 space-y-5">

                  {/* CSV upload */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Upload CSV file
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Export your Google Sheet as a <strong>.csv</strong> file. Required columns in order:{' '}
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                        org_name, org_type, state, nps_score, comment, contact_name (optional), contact_title (optional)
                      </code>
                    </p>

                    {/* File drop zone */}
                    <label
                      htmlFor="nps-csv-input"
                      className={`flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed cursor-pointer transition-colors px-6 py-8 ${
                        npsFileName
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-500'
                          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {npsFileName ? (
                        <>
                          <svg className="w-8 h-8 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300 text-center break-all">
                            {npsFileName}
                          </span>
                          <span className="text-xs text-blue-500 dark:text-blue-400 mt-1">Click to choose a different file</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Click to choose your CSV file</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">or drag and drop</span>
                        </>
                      )}
                      <input
                        id="nps-csv-input"
                        ref={npsFileRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setNpsFileName(file.name);
                          setNpsUploadError('');
                          setNpsUploadResult(null);
                          setNpsParseStats(null);
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setNpsCsvText((ev.target?.result as string) ?? '');
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </label>

                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <div className="flex items-center gap-3 text-sm">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="uploadMode"
                            value="append"
                            checked={npsUploadMode === 'append'}
                            onChange={() => setNpsUploadMode('append')}
                            className="accent-blue-600"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Append to existing</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="uploadMode"
                            value="upload"
                            checked={npsUploadMode === 'upload'}
                            onChange={() => setNpsUploadMode('upload')}
                            className="accent-blue-600"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Replace all</span>
                        </label>
                      </div>
                      <button
                        onClick={handleNpsUpload}
                        disabled={npsUploading || !npsCsvText.trim()}
                        className="ml-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                      >
                        {npsUploading ? 'Saving…' : `Save${npsFileName ? '' : ' NPS Data'}`}
                      </button>
                    </div>
                    {npsUploadError && (
                      <p className="mt-2 text-sm text-red-500">{npsUploadError}</p>
                    )}
                    {npsUploadResult && (
                      <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                        ✓ {npsUploadResult.count} new entries saved
                        {npsUploadResult.total !== undefined && npsUploadResult.total !== npsUploadResult.count
                          ? ` · ${npsUploadResult.total} total`
                          : ''}
                      </p>
                    )}
                    {npsParseStats && (
                      <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs space-y-1.5">
                        <p className="font-semibold text-gray-700 dark:text-gray-300">Parse diagnostics</p>
                        <p className="text-gray-500 dark:text-gray-400">
                          Total rows: <strong>{npsParseStats.totalDataRows}</strong> &nbsp;·&nbsp;
                          Saved: <span className="text-green-600 dark:text-green-400 font-semibold">{npsParseStats.parsed}</span> &nbsp;·&nbsp;
                          Detractors excluded: {npsParseStats.skippedDetractors} &nbsp;·&nbsp;
                          No org name: {npsParseStats.skippedNoOrgName} &nbsp;·&nbsp;
                          Duplicates: {npsParseStats.skippedDuplicates}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Detected columns:</span>{' '}
                          {Object.entries(npsParseStats.detectedColumns)
                            .map(([k, v]) => `${k}→col${v === -1 ? '?' : v}`)
                            .join(', ')}
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 truncate">
                          <span className="font-medium">Headers found:</span>{' '}
                          {npsParseStats.headerFields.join(' · ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Entries table */}
                  {npsLoading && (
                    <p className="text-sm text-gray-400 py-2 text-center">Loading…</p>
                  )}
                  {npsError && (
                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">{npsError}</p>
                  )}
                  {!npsLoading && npsEntries.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
                      No NPS entries yet. Upload a CSV above to get started.
                    </p>
                  )}
                  {npsEntries.length > 0 && (() => {
                    const withComment = npsEntries.filter((e) => e.comment.trim().length > 0);
                    const promoters   = npsEntries.filter((e) => e.sentiment === 'Promoter');
                    const passives    = npsEntries.filter((e) => e.sentiment === 'Passive');
                    const usEntries   = npsEntries.filter((e) => e.country === 'United States');
                    const euMap = new Map<string, number>();
                    npsEntries.filter((e) => e.country !== 'United States').forEach((e) => {
                      euMap.set(e.country, (euMap.get(e.country) ?? 0) + 1);
                    });

                    // Apply region filter
                    const filteredEntries = npsSelectedRegion
                      ? npsEntries.filter((e) =>
                          npsSelectedRegion === 'United States'
                            ? e.country === 'United States'
                            : e.country === npsSelectedRegion || e.state === npsSelectedRegion,
                        )
                      : npsEntries;

                    const toggleRegion = (region: string) =>
                      setNpsSelectedRegion((prev) => (prev === region ? null : region));

                    return (
                      <div className="space-y-4">
                        {/* Summary / filter row */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {npsSelectedRegion
                                ? `${filteredEntries.length} / ${npsEntries.length} entries`
                                : `${npsEntries.length} entries`}
                            </span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400">
                              Promoters: {promoters.length}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">
                              Passives: {passives.length}
                            </span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {withComment.length} with quotes
                            </span>
                            <span className="text-xs text-gray-400">·</span>
                            {/* Clickable US badge */}
                            <button
                              onClick={() => toggleRegion('United States')}
                              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${npsSelectedRegion === 'United States' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'}`}
                            >
                              US: {usEntries.length}
                            </button>
                            {/* Clickable country badges */}
                            {Array.from(euMap.entries()).sort((a, b) => b[1] - a[1]).map(([country, count]) => (
                              <button
                                key={country}
                                onClick={() => toggleRegion(country)}
                                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${npsSelectedRegion === country ? 'bg-purple-600 text-white' : 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40'}`}
                              >
                                {country}: {count}
                              </button>
                            ))}
                            {npsSelectedRegion && (
                              <button
                                onClick={() => setNpsSelectedRegion(null)}
                                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
                              >
                                Clear filter
                              </button>
                            )}
                          </div>
                          <button
                            onClick={handleNpsClear}
                            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors shrink-0"
                          >
                            Clear all
                          </button>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Sentiment</th>
                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Organisation</th>
                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">First Name</th>
                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Last Name</th>
                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Region</th>
                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                                  Comment <span className="font-normal text-gray-400">(click to expand)</span>
                                </th>
                                <th className="px-3 py-2" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {filteredEntries.map((e) => {
                                const region = e.country === 'United States'
                                  ? (e.state || 'US')
                                  : e.country;
                                const isEU = e.country !== 'United States';
                                const isExpanded = npsExpandedRow === e.id;
                                const sentimentColor = e.sentiment === 'Promoter'
                                  ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                                  : 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400';
                                return (
                                  <tr key={e.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                      <span className={`px-1.5 py-0.5 rounded font-medium ${sentimentColor}`}>
                                        {e.sentiment || 'Promoter'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 font-medium whitespace-nowrap max-w-[180px] truncate">
                                      {e.orgName}
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                      {e.firstName || <span className="text-gray-300 dark:text-gray-600">—</span>}
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                      {e.lastName || <span className="text-gray-300 dark:text-gray-600">—</span>}
                                    </td>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                      {/* Region badge — also clickable to filter */}
                                      <button
                                        onClick={() => toggleRegion(e.country === 'United States' ? 'United States' : e.country)}
                                        className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                                          isEU
                                            ? npsSelectedRegion === e.country
                                              ? 'bg-purple-600 text-white'
                                              : 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                                            : npsSelectedRegion === 'United States'
                                              ? 'bg-blue-600 text-white'
                                              : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                                        }`}
                                      >
                                        {region}
                                      </button>
                                    </td>
                                    {/* Comment cell — click to expand/collapse */}
                                    <td
                                      className="px-3 py-2.5 text-gray-600 dark:text-gray-400 cursor-pointer select-none"
                                      style={{ minWidth: '240px', maxWidth: '480px' }}
                                      onClick={() => setNpsExpandedRow(isExpanded ? null : e.id)}
                                    >
                                      {e.comment ? (
                                        <span className={isExpanded ? 'whitespace-pre-wrap break-words' : 'line-clamp-2 break-words'}>
                                          {e.comment}
                                        </span>
                                      ) : (
                                        <span className="text-gray-300 dark:text-gray-600 italic">no comment</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                      <button
                                        onClick={() => handleNpsDelete(e.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                                        title="Delete"
                                      >
                                        ✕
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Research Cache */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => { setCacheOpen((v) => !v); if (!cacheOpen) loadCacheData(); }}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div>
                  <h2 className="font-semibold">Research Cache</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Cached prospect lookups · saves tokens · {cacheEntries.length} stored
                  </p>
                </div>
                <span className="text-gray-400 text-sm shrink-0 ml-4">{cacheOpen ? '▲' : '▼'}</span>
              </button>
              {cacheOpen && (
                <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 space-y-5">

                  {/* Settings */}
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-4">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cache Settings</p>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Allow users to refresh before 30 days</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          When on, a &quot;Refresh now&quot; button appears on cached results so users can force a new search.
                        </p>
                      </div>
                      <button
                        onClick={() => saveCacheSettings({ allowUserRefresh: !cacheSettings.allowUserRefresh })}
                        disabled={cacheSaving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${cacheSettings.allowUserRefresh ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'} disabled:opacity-50`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${cacheSettings.allowUserRefresh ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">Cache duration (days)</label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={cacheSettings.cacheDays}
                        onChange={(e) => setCacheSettings((s) => ({ ...s, cacheDays: Number(e.target.value) }))}
                        onBlur={(e) => saveCacheSettings({ cacheDays: Number(e.target.value) })}
                        className="w-20 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                      />
                      <span className="text-xs text-gray-400">default: 30</span>
                    </div>
                  </div>

                  {/* Cache entries */}
                  {cacheLoading && <p className="text-sm text-gray-400 text-center py-2">Loading…</p>}
                  {!cacheLoading && cacheEntries.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No cached lookups yet. Results will be cached automatically when users run research.</p>
                  )}
                  {!cacheLoading && cacheEntries.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cacheEntries.length} cached lookups</p>
                        <button onClick={clearAllCache} className="text-xs text-red-500 hover:text-red-700 transition-colors">Clear all</button>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                              <th className="text-left px-3 py-2 font-medium">Lookup</th>
                              <th className="text-left px-3 py-2 font-medium">Cached</th>
                              <th className="text-left px-3 py-2 font-medium">Expires</th>
                              <th className="text-left px-3 py-2 font-medium">Status</th>
                              <th className="px-3 py-2" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {cacheEntries.map((e) => {
                              const cachedAt = new Date(e.cachedAt);
                              const expiresAt = new Date(e.expiresAt);
                              const now = new Date();
                              const daysAgo = Math.floor((now.getTime() - cachedAt.getTime()) / 86_400_000);
                              const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000);
                              const expired = daysLeft <= 0;
                              return (
                                <tr key={e.key} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                  <td className="px-3 py-2.5">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{e.company}</p>
                                    {e.personName && <p className="text-gray-400">{e.personName}</p>}
                                  </td>
                                  <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    {expired
                                      ? <span className="text-red-500">Expired</span>
                                      : <span className="text-gray-500 dark:text-gray-400">in {daysLeft}d</span>
                                    }
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {e.hasNewInfo
                                      ? <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-medium">New info</span>
                                      : <span className="text-gray-400">—</span>
                                    }
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <button
                                      onClick={() => deleteCacheEntry(e.key)}
                                      className="text-gray-400 hover:text-red-500 transition-colors"
                                      title="Delete"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reply Feedback */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setRepliesOpen((v) => !v)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div>
                  <h2 className="font-semibold">Reply Feedback</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Emails marked &ldquo;Got a reply&rdquo; by users. Extract patterns to improve the knowledge base.
                  </p>
                </div>
                <span className="text-gray-400 text-sm shrink-0 ml-4">{repliesOpen ? '▲' : '▼'}</span>
              </button>
              {repliesOpen && (
                <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4">
                  {repliesLoading && (
                    <p className="text-sm text-gray-400 py-4 text-center">Loading replies…</p>
                  )}
                  {repliesError && (
                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">{repliesError}</p>
                  )}
                  {!repliesLoading && !repliesError && replies.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                      No replies logged yet. Use the &ldquo;Got a reply&rdquo; button on generated emails.
                    </p>
                  )}
                  {replies.length > 0 && (
                    <div className="space-y-4">
                      {replies.map((reply) => {
                        const extract = extractStates[reply.id];
                        const patternKey = `reply-pattern-${reply.id}`;
                        const isExpanded = expandedReply === reply.id;
                        return (
                          <div
                            key={reply.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                          >
                            {/* Reply header */}
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                                    {reply.source === 'sequence'
                                      ? `Sequence · ${reply.label}`
                                      : reply.label}
                                  </span>
                                  <span className="text-xs text-gray-400">{reply.date}</span>
                                  {reply.score !== undefined && (
                                    <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                      Score {reply.score}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1 truncate">
                                  Subject: {reply.subject}
                                </p>
                                {reply.offering && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                    {reply.offering} → {reply.targetPersona}
                                  </p>
                                )}
                                {reply.note && (
                                  <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-0.5">
                                    &ldquo;{reply.note}&rdquo;
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => setExpandedReply(isExpanded ? null : reply.id)}
                                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                              >
                                {isExpanded ? 'Hide' : 'Show email'}
                              </button>
                            </div>

                            {/* Email body (expandable) */}
                            {isExpanded && (
                              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                                  {reply.body}
                                </pre>
                              </div>
                            )}

                            {/* Extract pattern section */}
                            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                              {!extract || extract.status === 'idle' ? (
                                <button
                                  onClick={() => handleExtractPattern(reply)}
                                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
                                >
                                  Extract Pattern → KB
                                </button>
                              ) : extract.status === 'extracting' ? (
                                <p className="text-sm text-gray-500 italic">Analyzing with Claude…</p>
                              ) : extract.status === 'error' ? (
                                <div className="flex items-center gap-3 flex-wrap">
                                  <p className="text-sm text-red-500">{extract.error}</p>
                                  <button
                                    onClick={() => handleExtractPattern(reply)}
                                    className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-500 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                  >
                                    Retry
                                  </button>
                                </div>
                              ) : extract.status === 'done' && extract.pattern ? (
                                <div className="space-y-3">
                                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                    Extracted Pattern
                                  </h4>
                                  <UpdateCard
                                    title={extract.pattern.practice}
                                    fields={[
                                      { label: 'Old advice', value: extract.pattern.oldAdvice },
                                      { label: 'New advice', value: extract.pattern.newAdvice },
                                      { label: 'Source', value: extract.pattern.source },
                                    ]}
                                    onApply={() =>
                                      handleApply('updatedBestPractice', extract.pattern!, patternKey)
                                    }
                                    onSkip={() => handleSkip(patternKey)}
                                    applying={itemStates[patternKey] === 'applying'}
                                    applied={itemStates[patternKey] === 'applied'}
                                    skipped={itemStates[patternKey] === 'skipped'}
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [password, setPassword] = useState<string | null>(null);

  if (!password) {
    return <PasswordGate onSuccess={setPassword} />;
  }

  return <AdminDashboard password={password} />;
}
