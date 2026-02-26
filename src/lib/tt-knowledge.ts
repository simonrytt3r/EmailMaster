import fs from 'fs';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SportDataEntry {
  sport: string;
  manualTimeMin: number;
  robotTimeMin: number;
  timeSavedMin: number;
  timeSavedPct: number;
  paintSavingsPct: number;
  fieldsPerDayManual: number;
  fieldsPerDayRobot: number;
  notes: string;
}

export interface TTKnowledge {
  narrative: string;
  sports: SportDataEntry[];
  updatedAt: string;
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

const DATA_PATH = path.join(process.cwd(), 'src', 'lib', 'tt-knowledge.json');

export function getTTKnowledge(): TTKnowledge {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw) as TTKnowledge;
  } catch {
    return { narrative: '', sports: [], updatedAt: '' };
  }
}

export function saveTTKnowledge(data: TTKnowledge): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Prompt helpers ──────────────────────────────────────────────────────────

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
  if (!knowledge.sports?.length) return '';

  const lowerIndustry = industry.toLowerCase();
  const match = knowledge.sports.find(
    (s) =>
      lowerIndustry.includes(s.sport.toLowerCase()) ||
      s.sport.toLowerCase().includes(lowerIndustry.split(',')[0].trim())
  );

  if (!match) return '';

  const lines: string[] = [
    `\n## SPORT-SPECIFIC PROOF POINTS: ${match.sport}`,
    `Use these exact numbers in subject lines, opening lines, and proof points:`,
  ];

  if (match.manualTimeMin) lines.push(`- Manual marking time: ${match.manualTimeMin} min/field`);
  if (match.robotTimeMin) lines.push(`- Turf Tank time: ~${match.robotTimeMin} min/field`);
  if (match.timeSavedMin) lines.push(`- Time saved per field: ${match.timeSavedMin} min`);
  if (match.timeSavedPct) lines.push(`- Time reduction: ${match.timeSavedPct}%`);
  if (match.paintSavingsPct) lines.push(`- Paint savings: ${match.paintSavingsPct}%`);
  if (match.fieldsPerDayManual && match.fieldsPerDayRobot) {
    lines.push(
      `- Daily field capacity: from ${match.fieldsPerDayManual} to ${match.fieldsPerDayRobot} fields/day`
    );
  }
  if (match.notes?.trim()) lines.push(`- Context: ${match.notes.trim()}`);

  lines.push('');
  return lines.join('\n');
}
