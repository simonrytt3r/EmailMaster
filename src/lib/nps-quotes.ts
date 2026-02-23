import { readFileSync } from 'fs';
import { join } from 'path';
import { NpsEntry, NpsMatchResult, NpsStore } from '@/lib/types';

const NPS_PATH = join(process.cwd(), 'src/lib/nps-data.json');
const MAX_QUOTES = 3;

export function readNpsStore(): NpsStore {
  try {
    return JSON.parse(readFileSync(NPS_PATH, 'utf-8')) as NpsStore;
  } catch {
    return { entries: [] };
  }
}

/**
 * Normalise org type and state strings for comparison.
 * "High School" => "high school", " FL " => "fl"
 */
function normalise(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Returns up to MAX_QUOTES NPS entries that best match the given
 * orgType and state.  Priority:
 *   1. exact  — matches both orgType AND state
 *   2. orgType — matches orgType only
 *   3. state  — matches state only
 *   4. none   — returns empty array (no match)
 *
 * Within each tier, entries with higher NPS scores rank first,
 * and only entries with a non-empty comment are considered.
 */
export function findMatchingQuotes(
  orgType: string | undefined,
  state: string | undefined,
): NpsMatchResult {
  const store = readNpsStore();
  const allEntries = store.entries.filter((e) => e.comment.trim().length > 0);

  if (allEntries.length === 0 || (!orgType && !state)) {
    return { entries: [], matchType: 'none' };
  }

  const normType = orgType ? normalise(orgType) : '';
  const normState = state ? normalise(state) : '';

  const byScore = (a: NpsEntry, b: NpsEntry) => b.npsScore - a.npsScore;

  // Tier 1: both match
  if (normType && normState) {
    const exact = allEntries
      .filter(
        (e) =>
          normalise(e.orgType) === normType &&
          normalise(e.state) === normState,
      )
      .sort(byScore)
      .slice(0, MAX_QUOTES);
    if (exact.length > 0) return { entries: exact, matchType: 'exact' };
  }

  // Tier 2: org type only
  if (normType) {
    const byType = allEntries
      .filter((e) => normalise(e.orgType) === normType)
      .sort(byScore)
      .slice(0, MAX_QUOTES);
    if (byType.length > 0) return { entries: byType, matchType: 'orgType' };
  }

  // Tier 3: state only
  if (normState) {
    const byState = allEntries
      .filter((e) => normalise(e.state) === normState)
      .sort(byScore)
      .slice(0, MAX_QUOTES);
    if (byState.length > 0) return { entries: byState, matchType: 'state' };
  }

  return { entries: [], matchType: 'none' };
}

/**
 * Formats matched NPS quotes into a prompt section that Claude can
 * use as social proof when generating emails.
 */
export function formatQuotesForPrompt(match: NpsMatchResult): string {
  if (match.entries.length === 0) return '';

  const matchDescription =
    match.matchType === 'exact'
      ? 'same organisation type in the same state'
      : match.matchType === 'orgType'
        ? 'same organisation type (different state)'
        : 'same state (different organisation type)';

  const lines = match.entries.map((e) => {
    const who = [
      e.contactTitle ? e.contactTitle : null,
      e.orgName,
      e.state ? `(${e.state.toUpperCase()})` : null,
    ]
      .filter(Boolean)
      .join(', ');
    return `- "${e.comment.trim()}" — ${who} [NPS ${e.npsScore}]`;
  });

  return `## SOCIAL PROOF FROM SIMILAR CUSTOMERS
The following are real NPS comments from customers with a similar profile (${matchDescription}). You may reference 1–2 of these naturally in your emails — they are most powerful in the "Social Proof Lead" variation and in Touch 2 of a sequence. Quote them precisely and credit them accurately:

${lines.join('\n')}

Use these quotes to add peer-level credibility. A prospect in the same vertical and region is far more persuaded by a quote from a nearby peer organisation than a generic claim.`;
}
