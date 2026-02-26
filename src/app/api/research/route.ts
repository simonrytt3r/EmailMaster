import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ResearchRequest, ResearchResult } from '@/lib/types';
import {
  makeCacheKey,
  getCachedEntry,
  saveCacheEntry,
  getCacheSettings,
} from '@/lib/research-cache';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Tavily search (dedicated search API — no Anthropic quota consumed)
// ---------------------------------------------------------------------------
async function tavilySearch(query: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000); // 5s max — fast APIs respond in <2s

  let res: Response;
  try {
    res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
        search_depth: 'basic',
      }),
      signal: controller.signal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Tavily search timed out or failed for "${query}":`, msg);
    return ''; // Return empty string instead of throwing — Claude will work with what it has
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    console.warn(`Tavily search returned ${res.status} for "${query}"`);
    return '';
  }

  const data = await res.json() as {
    results: { title: string; url: string; content: string }[];
  };

  // Condense to ~2000 chars so the Claude extraction call stays small
  return data.results
    .map((r) => `[${r.title}]\n${r.content?.slice(0, 400) ?? ''}`)
    .join('\n\n')
    .slice(0, 2000);
}

// ---------------------------------------------------------------------------
// Claude extraction prompt — receives pre-fetched text, no search calls
// ---------------------------------------------------------------------------
function buildExtractionPrompt(params: ResearchRequest, searchResults: string): string {
  const hasResults = searchResults.trim().length > 50;
  return `Extract structured prospect info from these search results for a cold outreach email.

Person: ${params.personName || 'Unknown'}
Title: ${params.jobTitle || 'Unknown'}
Org: ${params.company}

SEARCH RESULTS:
${hasResults ? searchResults : '(No search results available — use your general knowledge if possible, otherwise use empty arrays)'}

CRITICAL: Return ONLY valid JSON. No markdown fences, no explanation, no text outside the JSON object.
If a field has no data, use an empty array [] or empty string "". Never omit a field.
For "location": use a 2-letter US state code (e.g. "FL", "TX") if the org is in the US, or the country name (e.g. "Germany") if outside the US. Empty string if truly unknown.
For "orgType": describe the type of facility/organization in 1-4 words (e.g. "high school", "golf course", "parks & rec", "university", "professional sports club"). Empty string if unknown.
{"organization":{"summary":"2-3 sentences about the org","size":"e.g. 12 schools or unknown","location":"FL","orgType":"high school","sports":["sport1"],"recentNews":["item1"],"challenges":["item1"],"keyFacts":["fact1"]},"person":{"summary":"2-3 sentences about the person","role":"title and scope","tenure":"if known or unknown","recentActivity":["item1"],"notableItems":["item1"]},"personalizationHooks":[{"hook":"specific org fact","emailAngle":"how to use this to open an email","strength":"strong"}],"personHooks":[{"hook":"specific person fact","emailAngle":"how to use this to open an email","strength":"strong"}],"sources":["url1"]}`;
}

// ---------------------------------------------------------------------------
// Fallback: Anthropic built-in web_search (used if no TAVILY_API_KEY)
// ---------------------------------------------------------------------------
function buildFallbackPrompt(params: ResearchRequest): string {
  return `Research this prospect for a cold outreach email.

Person: ${params.personName || 'Unknown'}
Title: ${params.jobTitle || 'Unknown'}
Org: ${params.company}
${params.linkedinUrl ? `LinkedIn: ${params.linkedinUrl}` : ''}
${params.websiteUrl ? `Website: ${params.websiteUrl}` : ''}

Search for org facts, recent news, person background, and personalization angles.
Return ONLY this JSON (no markdown). For "location": 2-letter US state code (e.g. "FL") or country name if outside US. For "orgType": 1-4 word description (e.g. "high school", "golf course", "parks & rec").
{"organization":{"summary":"2-3 sentences","size":"e.g. 12 schools","location":"FL","orgType":"high school","sports":["sport1"],"recentNews":["item1"],"challenges":["item1"],"keyFacts":["fact1"]},"person":{"summary":"2-3 sentences","role":"title and scope","tenure":"if known","recentActivity":["item1"],"notableItems":["item1"]},"personalizationHooks":[{"hook":"specific org fact","emailAngle":"how to open an email with this","strength":"strong"}],"personHooks":[{"hook":"specific person fact","emailAngle":"how to open an email with this","strength":"strong"}],"sources":["url1"]}`;
}

// ---------------------------------------------------------------------------
// Main research function — Tavily path (preferred)
// Returns null if Tavily yielded no usable results (caller should fall back)
// ---------------------------------------------------------------------------
async function researchWithTavily(
  client: Anthropic,
  params: ResearchRequest,
  tavilyKey: string
): Promise<Anthropic.Messages.Message | null> {
  const orgQuery = `${params.company} organization sports fields athletic department`;
  const personQuery = params.personName
    ? `${params.personName} ${params.jobTitle ?? ''} ${params.company}`
    : null;

  console.log('[research] Tavily: starting searches for:', params.company);
  const t1 = Date.now();
  const [orgResults, personResults] = await Promise.all([
    tavilySearch(orgQuery, tavilyKey),
    personQuery ? tavilySearch(personQuery, tavilyKey) : Promise.resolve(''),
  ]);
  const elapsed = Date.now() - t1;
  console.log(`[research] Tavily done in ${elapsed}ms. org_chars=${orgResults.length}, person_chars=${personResults.length}`);

  const combined = [orgResults, personResults].filter(Boolean).join('\n\n---\n\n');

  if (!combined) {
    console.warn('[research] Tavily returned no results — will fall back to web_search');
    return null;
  }

  return client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1600,
    messages: [{ role: 'user', content: buildExtractionPrompt(params, combined) }],
  });
}

// ---------------------------------------------------------------------------
// Fallback research — Anthropic web_search tool (no Tavily key)
// ---------------------------------------------------------------------------
async function researchWithWebSearch(
  client: Anthropic,
  params: ResearchRequest
): Promise<Anthropic.Messages.Message> {
  return client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000, // web_search adds <cite> tags which inflate token count
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 3,
      } as unknown as Anthropic.Messages.Tool,
    ],
    messages: [
      {
        role: 'user',
        content: buildFallbackPrompt(params),
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest & { force?: boolean } = await request.json();

    if (!body.company?.trim()) {
      return NextResponse.json(
        { error: 'Company or organization name is required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY environment variable is not set.' },
        { status: 500 }
      );
    }

    // ── Cache check ──────────────────────────────────────────────────────────
    const cacheKey = makeCacheKey(body.personName, body.company);
    const settings = getCacheSettings();

    if (body.force && !settings.allowUserRefresh) {
      // Force-refresh is disabled by the admin — ignore the flag silently
      body.force = false;
    }

    if (!body.force) {
      const cached = getCachedEntry(cacheKey);
      if (cached) {
        console.log('[research] Cache hit for:', cacheKey);
        const cachedAt = new Date(cached.cachedAt);
        const expiresAt = new Date(cached.expiresAt);
        const now = new Date();
        const daysAgo = Math.floor((now.getTime() - cachedAt.getTime()) / 86_400_000);
        const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000);
        return NextResponse.json({
          success: true,
          result: cached.result,
          cached: true,
          cachedAt: cached.cachedAt,
          daysAgo,
          daysUntilExpiry,
          hasNewInfo: cached.hasNewInfo,
          newInfoFields: cached.newInfoFields,
          allowUserRefresh: settings.allowUserRefresh,
        });
      }
    }

    // ── Live research ────────────────────────────────────────────────────────
    const client = new Anthropic({ apiKey });
    const tavilyKey = process.env.TAVILY_API_KEY;

    let response: Anthropic.Messages.Message | null = null;
    const t0 = Date.now();

    if (tavilyKey) {
      response = await researchWithTavily(client, body, tavilyKey);
    }

    if (!response) {
      console.log('[research] Using Anthropic web_search for:', body.company);
      response = await researchWithWebSearch(client, body);
    }

    console.log(`[research] Total time: ${Date.now() - t0}ms | stop_reason=${response.stop_reason} | tokens=${response.usage?.output_tokens}`);

    let resultText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        resultText += block.text;
      }
    }

    const stripped = resultText
      .replace(/<cite[^>]*>/g, '')
      .replace(/<\/cite>/g, '');

    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    const cleaned = jsonMatch ? jsonMatch[0] : stripped.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim();

    console.log('[research] Raw length:', resultText.length, '| Cleaned start:', cleaned.slice(0, 120));

    let result: ResearchResult;
    try {
      result = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[research] Parse error. Full raw output:\n', resultText);
      console.error('Parse error:', parseErr);
      return NextResponse.json(
        { error: 'Research completed but result could not be parsed. Please try again.' },
        { status: 500 }
      );
    }

    // ── Save to cache ────────────────────────────────────────────────────────
    const saved = saveCacheEntry(cacheKey, body.personName, body.company, result);

    return NextResponse.json({
      success: true,
      result,
      cached: false,
      cachedAt: saved.cachedAt,
      daysAgo: 0,
      daysUntilExpiry: settings.cacheDays,
      hasNewInfo: saved.hasNewInfo,
      newInfoFields: saved.newInfoFields,
      allowUserRefresh: settings.allowUserRefresh,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[research] Unhandled error:', message);
    const isRateLimit = message.includes('rate limit') || message.includes('429') || message.includes('overloaded');
    return NextResponse.json(
      { error: isRateLimit ? 'Rate limit reached. Please wait a moment and try again.' : message },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
