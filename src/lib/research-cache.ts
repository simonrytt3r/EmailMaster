import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  ResearchCacheEntry,
  ResearchCacheStore,
  ResearchCacheSettings,
  ResearchResult,
} from '@/lib/types';

const CACHE_PATH = join(process.cwd(), 'src/lib/research-cache.json');

// ─── Store I/O ────────────────────────────────────────────────────────────────

export function readCacheStore(): ResearchCacheStore {
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) as ResearchCacheStore;
  } catch {
    return { settings: { allowUserRefresh: true, cacheDays: 30 }, entries: [] };
  }
}

function writeCacheStore(store: ResearchCacheStore): void {
  writeFileSync(CACHE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getCacheSettings(): ResearchCacheSettings {
  return readCacheStore().settings;
}

export function saveCacheSettings(settings: Partial<ResearchCacheSettings>): ResearchCacheSettings {
  const store = readCacheStore();
  store.settings = { ...store.settings, ...settings };
  writeCacheStore(store);
  return store.settings;
}

// ─── Cache key ────────────────────────────────────────────────────────────────

/**
 * Normalise a string for use in a cache key: lowercase, collapse whitespace.
 */
function norm(s: string | undefined): string {
  return (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Generate a stable cache key from person + company.
 * If personName is provided the cache is per-person; otherwise per-company.
 */
export function makeCacheKey(personName: string | undefined, company: string): string {
  const c = norm(company);
  const p = norm(personName);
  return p ? `${p}|${c}` : c;
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

/**
 * Returns the cache entry for the given key if it exists and has not expired.
 * Returns null when there is no entry or it is past its expiry date.
 */
export function getCachedEntry(key: string): ResearchCacheEntry | null {
  const store = readCacheStore();
  const entry = store.entries.find((e) => e.key === key);
  if (!entry) return null;
  if (new Date(entry.expiresAt) < new Date()) return null; // expired
  return entry;
}

// ─── "New info" diff ──────────────────────────────────────────────────────────

/**
 * Compare two research results and return the names of fields that gained
 * at least one new item (for arrays) or changed text (for strings).
 */
export function detectNewInfo(prev: ResearchResult, curr: ResearchResult): string[] {
  const changed: string[] = [];

  // Helper: check whether any item in curr array is absent from prev array
  function arrayHasNew(p: string[] = [], c: string[] = []): boolean {
    const prevSet = new Set(p.map((s) => s.toLowerCase().trim()));
    return c.some((item) => !prevSet.has(item.toLowerCase().trim()));
  }

  if (arrayHasNew(prev.organization.recentNews, curr.organization.recentNews))
    changed.push('recentNews');
  if (arrayHasNew(prev.organization.keyFacts, curr.organization.keyFacts))
    changed.push('keyFacts');
  if (arrayHasNew(prev.organization.challenges, curr.organization.challenges))
    changed.push('challenges');
  if (arrayHasNew(prev.person.recentActivity, curr.person.recentActivity))
    changed.push('recentActivity');
  if (arrayHasNew(prev.person.notableItems, curr.person.notableItems))
    changed.push('notableItems');

  // Text fields: flag if more than ~15 chars changed (avoids cosmetic rewording)
  if (Math.abs((curr.organization.summary ?? '').length - (prev.organization.summary ?? '').length) > 15)
    changed.push('orgSummary');
  if (Math.abs((curr.person.summary ?? '').length - (prev.person.summary ?? '').length) > 15)
    changed.push('personSummary');

  return changed;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

/**
 * Upsert a cache entry.  If an entry for the key already exists its result
 * becomes the `previousResult` so callers can show a diff.
 */
export function saveCacheEntry(
  key: string,
  personName: string | undefined,
  company: string,
  result: ResearchResult,
): ResearchCacheEntry {
  const store = readCacheStore();
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + store.settings.cacheDays);

  const existing = store.entries.find((e) => e.key === key);
  const newInfoFields = existing ? detectNewInfo(existing.result, result) : [];
  const hasNewInfo = newInfoFields.length > 0;

  const entry: ResearchCacheEntry = {
    key,
    personName: personName || undefined,
    company,
    result,
    cachedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    previousResult: existing?.result,
    hasNewInfo,
    newInfoFields,
  };

  // Replace existing or prepend
  store.entries = [entry, ...store.entries.filter((e) => e.key !== key)];

  // Keep at most 500 entries to avoid unbounded growth
  if (store.entries.length > 500) store.entries = store.entries.slice(0, 500);

  writeCacheStore(store);
  return entry;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function deleteCacheEntry(key: string): void {
  const store = readCacheStore();
  store.entries = store.entries.filter((e) => e.key !== key);
  writeCacheStore(store);
}

export function clearCacheEntries(): void {
  const store = readCacheStore();
  store.entries = [];
  writeCacheStore(store);
}
