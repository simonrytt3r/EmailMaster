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

function normalise(s: string): string {
  return (s ?? '').toLowerCase().trim();
}

/**
 * Returns true when the entry's location matches the requested location.
 *
 * The `stateOrCountry` parameter can be:
 *   - A US state code   e.g. 'FL', 'TX'
 *   - A country name    e.g. 'Germany', 'Denmark'
 *   - A country code    e.g. 'DE', 'DK'
 *
 * Matching is case-insensitive against both `entry.state` and
 * `entry.country` so US and European entries both resolve correctly.
 */
function locationMatches(entry: NpsEntry, stateOrCountry: string): boolean {
  const loc = normalise(stateOrCountry);
  if (!loc) return false;
  return (
    normalise(entry.state)   === loc ||
    normalise(entry.country) === loc
  );
}

/**
 * Returns up to MAX_QUOTES NPS entries that best match the given
 * orgType and location (US state or country). Priority:
 *   1. exact    — matches both orgType AND location
 *   2. orgType  — matches orgType only  (any location)
 *   3. location — matches location only (any orgType)
 *   4. none     — empty result
 *
 * Only entries with a non-empty comment are returned as quotes.
 * Entries without comments are stored but never surfaced here.
 */
export function findMatchingQuotes(
  orgType: string | undefined,
  stateOrCountry: string | undefined,
): NpsMatchResult {
  const store = readNpsStore();
  const withComment = store.entries.filter((e) => e.comment.trim().length > 0);

  if (withComment.length === 0 || (!orgType && !stateOrCountry)) {
    return { entries: [], matchType: 'none' };
  }

  const normType = normalise(orgType ?? '');
  const byScore  = (a: NpsEntry, b: NpsEntry) => b.npsScore - a.npsScore;

  // Tier 1: org type + location
  if (normType && stateOrCountry) {
    const exact = withComment
      .filter((e) => normalise(e.orgType) === normType && locationMatches(e, stateOrCountry))
      .sort(byScore)
      .slice(0, MAX_QUOTES);
    if (exact.length > 0) return { entries: exact, matchType: 'exact' };
  }

  // Tier 2: org type only
  if (normType) {
    const byType = withComment
      .filter((e) => normalise(e.orgType) === normType)
      .sort(byScore)
      .slice(0, MAX_QUOTES);
    if (byType.length > 0) return { entries: byType, matchType: 'orgType' };
  }

  // Tier 3: location only
  if (stateOrCountry) {
    const byLoc = withComment
      .filter((e) => locationMatches(e, stateOrCountry))
      .sort(byScore)
      .slice(0, MAX_QUOTES);
    if (byLoc.length > 0) return { entries: byLoc, matchType: 'location' };
  }

  return { entries: [], matchType: 'none' };
}

/**
 * Formats matched NPS quotes into a prompt section for Claude.
 */
export function formatQuotesForPrompt(match: NpsMatchResult): string {
  if (match.entries.length === 0) return '';

  const matchDescription =
    match.matchType === 'exact'
      ? 'same organisation type in the same region'
      : match.matchType === 'orgType'
        ? 'same organisation type (different region)'
        : 'same region (different organisation type)';

  const lines = match.entries.map((e) => {
    // Show state for US, country for EU
    const location = e.state
      ? e.state.toUpperCase()
      : (e.country && e.country !== 'United States' ? e.country : '');

    const who = [
      e.contactTitle || null,
      e.orgName,
      location ? `(${location})` : null,
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
