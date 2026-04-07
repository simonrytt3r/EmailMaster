import fs from 'fs';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SportDataEntry {
  sport: string;
  // Per-event time comparison
  manualTimeMin: number;       // human time for one manual marking (min)
  robotTimeMin: number;        // human monitoring time per TT marking event (min)
  timeSavedMin: number;        // time saved per event (min)
  timeSavedPct: number;        // % time saved per event
  // Annual savings from the Savings section
  laborSavingsDollar: number;  // annual labor cost savings ($)
  paintSavingsGal: number;     // annual paint saved (gallons)
  paintSavingsDollar: number;  // annual paint cost savings ($)
  totalSavingsDollar: number;  // total annual savings ($)
  // Legacy / optional
  paintSavingsPct: number;     // % paint saved (optional)
  fieldsPerDayManual: number;
  fieldsPerDayRobot: number;
  notes: string;
}

export interface SportTimeEntry {
  sport: string;
  manualTimeMin: number;
  ttTimeMin: number;
}

export interface SportPaintEntry {
  sport: string;
  time: string;
  paintUsGal: number;
  pricePerField: number;
  paintRowL: number;
}

export interface SportVariantEntry {
  category: string;
  variant: string;
  time: string;
  paintUsGal: number;
  pricePerField: number;
  paintRowL: number;
}

export interface SportFrequencyEntry {
  sport: string;
  initialPerYear: number;
  overmarksPerYear: number;
}

export interface FieldMarkingData {
  standardSports: SportPaintEntry[];
  variants: SportVariantEntry[];
  frequency: SportFrequencyEntry[];
}

export interface TTKnowledge {
  narrative: string;
  sports: SportDataEntry[];
  sportTimes: SportTimeEntry[];
  fieldMarkingData: FieldMarkingData;
  updatedAt: string;
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

const DATA_PATH = path.join(process.cwd(), 'src', 'lib', 'tt-knowledge.json');

export function getTTKnowledge(): TTKnowledge {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw) as TTKnowledge;
  } catch {
    return { narrative: '', sports: [], sportTimes: [], fieldMarkingData: { standardSports: [], variants: [], frequency: [] }, updatedAt: '' };
  }
}

export function saveTTKnowledge(data: TTKnowledge): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Prompt helpers ──────────────────────────────────────────────────────────

/**
 * Parses "H:MM:SS" into a human-readable display string and total minutes.
 * e.g. "0:23:56" → "24 min", "3:29:14" → "3h 29min"
 */
function parseFieldMarkingTime(time: string): { totalMin: number; display: string } {
  const parts = time.split(':').map(Number);
  if (parts.length !== 3) return { totalMin: 0, display: '' };
  const [h, m, s] = parts;
  const totalMin = h * 60 + m + Math.round(s / 60);
  if (h > 0) return { totalMin, display: `${h}h ${m > 0 ? `${m}min` : ''}`.trim() };
  return { totalMin, display: `${totalMin} min` };
}

/**
 * Returns the full TT context block for the system prompt.
 * Appends any saved narrative content below the static base context.
 */
export function buildTTContextBlock(): string {
  const base = `## TURF TANK CONTEXT

Turf Tank makes GPS-guided, autonomous robots that mark athletic fields and golf courses with paint. Key selling points:
- Eliminates manual field marking (typically 2–6 hours per field, done by hand)
- Robots mark a full soccer field in ~30 minutes (vs. 2–3 hours manually)
- Precision: sub-centimeter accuracy — lines are perfect every time
- Operators: parks & recreation departments, sports complexes, golf courses, universities, professional teams
- Pain points solved: labor scarcity, inconsistent line quality, time-consuming manual work, costly re-marking after rain/events
- Key proof points: thousands of fields marked, used by professional and collegiate programs, significant labor savings
- Sales context: selling to directors of operations, facility managers, head groundskeepers, sports turf managers, golf course superintendents

When analyzing or generating emails for the Turf Tank sales team, apply all knowledge base principles with this context in mind. The prospect knows their pain (marking lines is tedious) — the email should make them realize the cost of NOT solving it.`;

  const knowledge = getTTKnowledge();

  if (!knowledge.narrative?.trim()) return base;

  return base + `\n\n## TURF TANK SALES INTELLIGENCE\n\n${knowledge.narrative.trim()}`;
}

/**
 * Returns a sport-specific proof point block to inject into user prompts.
 * Matches the industry/sport string against the saved sports data.
 * Returns an empty string if no match is found or sports data is empty.
 */
export function getSportProofPoints(industry?: string): string {
  if (!industry?.trim()) return '';

  const knowledge = getTTKnowledge();
  const lowerIndustry = industry.toLowerCase();

  const sportMatch = (name: string) =>
    lowerIndustry.includes(name.toLowerCase()) ||
    name.toLowerCase().includes(lowerIndustry.split(',')[0].trim());

  // Look up full savings entry
  const match = knowledge.sports?.find((s) => sportMatch(s.sport));

  // Look up time-only entry (separate sport times table)
  const timeMatch = knowledge.sportTimes?.find((s) => sportMatch(s.sport));

  // Look up robot painting time from field marking data
  const paintMatch = knowledge.fieldMarkingData?.standardSports?.find((s) => sportMatch(s.sport));

  if (!match && !timeMatch && !paintMatch) return '';

  const sportName = match?.sport ?? timeMatch?.sport ?? paintMatch!.sport;
  const lines: string[] = [
    `\n## SPORT-SPECIFIC PROOF POINTS: ${sportName}`,
    `Use these exact numbers in subject lines, opening lines, and proof points:`,
  ];

  // Robot field marking time — how long the robot takes to paint the full field
  if (paintMatch?.time) {
    const { display } = parseFieldMarkingTime(paintMatch.time);
    if (display) lines.push(`- Turf Tank marks a ${sportName} field in ${display} (robot operates autonomously)`);
  }

  // Operator time comparison from sportTimes (separate from painting duration)
  const manualMin = timeMatch?.manualTimeMin ?? match?.manualTimeMin;
  const ttMin     = timeMatch?.ttTimeMin     ?? match?.robotTimeMin;
  const savedMin  = manualMin && ttMin ? Math.round(manualMin - ttMin) : match?.timeSavedMin;
  const savedPct  = manualMin && savedMin ? Math.round((savedMin / manualMin) * 100) : match?.timeSavedPct;

  if (manualMin) lines.push(`- Manual marking time: ${manualMin} min per field`);
  if (ttMin)     lines.push(`- Turf Tank operator time: ~${ttMin} min per field (robot marks autonomously)`);
  if (savedMin)  lines.push(`- Time saved per marking: ${savedMin} min${savedPct ? ` (${savedPct}%)` : ''}`);

  // Savings data (from the full savings import if available)
  if (match?.laborSavingsDollar) lines.push(`- Annual labor cost savings: $${Math.round(match.laborSavingsDollar).toLocaleString()}`);
  if (match?.paintSavingsGal)    lines.push(`- Annual paint saved: ${match.paintSavingsGal.toFixed(0)} gallons`);
  if (match?.paintSavingsDollar) lines.push(`- Annual paint cost savings: $${Math.round(match.paintSavingsDollar).toLocaleString()}`);
  if (match?.totalSavingsDollar) lines.push(`- TOTAL annual savings with Turf Tank: $${Math.round(match.totalSavingsDollar).toLocaleString()}`);
  if (match?.paintSavingsPct)    lines.push(`- Paint savings: ${match.paintSavingsPct}%`);
  if (match?.fieldsPerDayManual && match?.fieldsPerDayRobot) {
    lines.push(`- Daily field capacity: from ${match.fieldsPerDayManual} to ${match.fieldsPerDayRobot} fields/day`);
  }
  if (match?.notes?.trim()) lines.push(`- Context: ${match.notes.trim()}`);

  lines.push('');
  return lines.join('\n');
}
