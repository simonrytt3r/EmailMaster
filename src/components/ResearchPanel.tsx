'use client';

import { useState } from 'react';
import { ResearchHook, ResearchResult, ResearchRequest } from '@/lib/types';

// ─── Cooldown: 15 seconds between lookups (much more generous with Sonnet) ────
const COOLDOWN_MS = 15_000;

interface ResearchPanelProps {
  onHooksChange: (hooks: ResearchHook[]) => void;
}

// ─── Strength badge colours ────────────────────────────────────────────────────
const STRENGTH_STYLE: Record<string, { badge: string; ring: string; check: string }> = {
  strong: {
    badge: 'bg-ios-green/10 text-ios-green',
    ring: 'ring-1 ring-ios-green/30 bg-ios-green/5',
    check: 'bg-ios-green text-white',
  },
  medium: {
    badge: 'bg-ios-yellow/10 text-ios-yellow',
    ring: 'ring-1 ring-ios-yellow/30 bg-ios-yellow/5',
    check: 'bg-ios-yellow text-white',
  },
  weak: {
    badge: 'bg-ios-secondary dark:bg-ios-dark-secondary text-ios-text-2',
    ring: 'ring-1 ring-ios-sep/40 bg-white dark:bg-ios-dark-card',
    check: 'bg-ios-text-2 text-white',
  },
};

const labelClass =
  'block text-[12px] font-medium text-ios-text-2 uppercase tracking-wide mb-1.5';
const inputClass =
  'w-full px-3 py-2.5 text-[15px] rounded-ios-sm bg-ios-bg dark:bg-ios-dark-secondary text-ios-text dark:text-white placeholder-ios-text-3 dark:placeholder-ios-text-2 focus:outline-none focus:ring-2 focus:ring-ios-blue/40 transition-shadow duration-150';

// ─── Hook card ────────────────────────────────────────────────────────────────
function HookCard({
  hook,
  selected,
  onToggle,
}: {
  hook: ResearchHook;
  selected: boolean;
  onToggle: () => void;
}) {
  const s = STRENGTH_STYLE[hook.strength] ?? STRENGTH_STYLE.weak;
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left rounded-ios-sm p-3 transition-all duration-150 ${s.ring} ${
        selected ? 'opacity-100' : 'opacity-70 hover:opacity-90'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Check circle */}
        <div
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-150 ${
            selected ? s.check : 'ring-1 ring-ios-sep dark:ring-ios-dark-sep bg-transparent'
          }`}
        >
          {selected && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${s.badge}`}>
              {hook.strength}
            </span>
          </div>
          <p className="text-[14px] text-ios-text dark:text-white font-medium leading-snug">{hook.text}</p>
          <p className="text-[12px] text-ios-text-2 mt-1 leading-snug">
            <span className="font-semibold">Use it: </span>
            {hook.useIt}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide mb-2">
      {title}
    </p>
  );
}

// ─── Tag pill ─────────────────────────────────────────────────────────────────
function Tag({ label }: { label: string }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-ios-blue/10 text-ios-blue">
      {label}
    </span>
  );
}

// ─── Results display ──────────────────────────────────────────────────────────
function ResearchResults({
  result,
  selectedHooks,
  onToggleHook,
}: {
  result: ResearchResult;
  selectedHooks: Set<number>;
  onToggleHook: (index: number) => void;
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <div className="space-y-4 pt-4">
      {/* ── Personalization Hooks ── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <SectionHeader title="Personalization Hooks" />
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ios-green/10 text-ios-green uppercase tracking-wide -mt-1.5">
            {result.hooks.length}
          </span>
        </div>
        <div className="space-y-2">
          {result.hooks.map((hook, i) => (
            <HookCard
              key={i}
              hook={hook}
              selected={selectedHooks.has(i)}
              onToggle={() => onToggleHook(i)}
            />
          ))}
        </div>
      </div>

      {/* ── Company Profile ── */}
      {result.company?.name && (
        <div className="rounded-ios bg-ios-bg dark:bg-ios-dark-secondary p-3 space-y-2">
          <SectionHeader title="Company Profile" />
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[16px] font-bold text-ios-text dark:text-white">{result.company.name}</span>
            {result.company.stats && (
              <span className="text-[12px] text-ios-text-2">{result.company.stats}</span>
            )}
          </div>
          {result.company.description && (
            <p className="text-[13px] text-ios-text dark:text-white leading-snug">{result.company.description}</p>
          )}
          {result.company.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.company.tags.map((t) => <Tag key={t} label={t} />)}
            </div>
          )}
          {result.company.bullets?.length > 0 && (
            <ul className="space-y-1">
              {result.company.bullets.map((b, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-ios-text dark:text-white">
                  <span className="text-ios-blue flex-shrink-0">›</span>
                  {b}
                </li>
              ))}
            </ul>
          )}
          {result.company.recentNews?.length > 0 && (
            <div className="pt-1 border-t border-ios-sep/20 dark:border-ios-dark-sep/60">
              <p className="text-[10px] font-semibold text-ios-text-2 uppercase tracking-wide mb-1">Recent News</p>
              <ul className="space-y-1">
                {result.company.recentNews.map((n, i) => (
                  <li key={i} className="flex gap-2 text-[12px] text-ios-text-2">
                    <span className="text-ios-yellow flex-shrink-0">›</span>
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Person Profile ── */}
      {result.person?.name && (
        <div className="rounded-ios bg-ios-bg dark:bg-ios-dark-secondary p-3 space-y-2">
          <SectionHeader title="Person Profile" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold text-ios-text dark:text-white">{result.person.name}</span>
            {result.person.tenure && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ios-secondary dark:bg-ios-dark-card text-ios-text-2">
                {result.person.tenure}
              </span>
            )}
          </div>
          {result.person.title && (
            <p className="text-[12px] text-ios-blue font-medium">{result.person.title}</p>
          )}
          {result.person.summary && (
            <p className="text-[13px] text-ios-text dark:text-white leading-snug">{result.person.summary}</p>
          )}
          {result.person.recentActivity?.length > 0 && (
            <div className="pt-1 border-t border-ios-sep/20 dark:border-ios-dark-sep/60">
              <p className="text-[10px] font-semibold text-ios-text-2 uppercase tracking-wide mb-1">Recent Activity</p>
              <ul className="space-y-1">
                {result.person.recentActivity.map((a, i) => (
                  <li key={i} className="flex gap-2 text-[12px] text-ios-text-2">
                    <span className="text-ios-blue flex-shrink-0">›</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Sources ── */}
      {result.sources?.length > 0 && (
        <div>
          <button
            onClick={() => setSourcesOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[12px] text-ios-text-2 hover:text-ios-text dark:hover:text-white transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${sourcesOpen ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Sources ({result.sources.length})
          </button>
          {sourcesOpen && (
            <ul className="mt-2 space-y-1">
              {result.sources.map((src, i) => (
                <li key={i}>
                  <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-ios-blue hover:underline break-all"
                  >
                    {src}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ResearchPanel({ onHooksChange }: ResearchPanelProps) {
  const [form, setForm] = useState<ResearchRequest>({
    name: '',
    jobTitle: '',
    company: '',
    linkedinUrl: '',
    websiteUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [selectedHooks, setSelectedHooks] = useState<Set<number>>(new Set());
  const [lastRequestTime, setLastRequestTime] = useState(0);

  const canSubmit = form.name.trim() && form.company.trim() && !loading;

  const handleResearch = async () => {
    if (!canSubmit) return;

    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    if (timeSinceLast < COOLDOWN_MS && lastRequestTime > 0) {
      const waitSecs = Math.ceil((COOLDOWN_MS - timeSinceLast) / 1000);
      setError(`Please wait ${waitSecs}s before the next lookup.`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedHooks(new Set());
    onHooksChange([]);
    setLastRequestTime(now);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? 'Research failed';
        if (res.status === 429) {
          setError('Rate limit hit — please wait ~60 seconds and try again.');
        } else {
          setError(msg);
        }
        return;
      }

      setResult(data.result);
      // Auto-select all "strong" hooks
      const autoSelected = new Set<number>();
      data.result.hooks.forEach((h: ResearchHook, i: number) => {
        if (h.strength === 'strong') autoSelected.add(i);
      });
      setSelectedHooks(autoSelected);
      onHooksChange(data.result.hooks.filter((_: ResearchHook, i: number) => autoSelected.has(i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const toggleHook = (index: number) => {
    setSelectedHooks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      if (result) {
        onHooksChange(result.hooks.filter((_, i) => next.has(i)));
      }
      return next;
    });
  };

  const handleClear = () => {
    setResult(null);
    setSelectedHooks(new Set());
    onHooksChange([]);
    setError(null);
  };

  const set = (field: keyof ResearchRequest) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Person&apos;s Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="e.g., Lauren Fox"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Job Title</label>
          <input
            type="text"
            value={form.jobTitle}
            onChange={set('jobTitle')}
            placeholder="e.g., Director of Operations"
            className={inputClass}
          />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Company / Organisation *</label>
          <input
            type="text"
            value={form.company}
            onChange={set('company')}
            placeholder="e.g., IDEA Public Schools"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>LinkedIn URL</label>
          <input
            type="url"
            value={form.linkedinUrl}
            onChange={set('linkedinUrl')}
            placeholder="https://linkedin.com/in/..."
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Company Website</label>
          <input
            type="url"
            value={form.websiteUrl}
            onChange={set('websiteUrl')}
            placeholder="https://company.com"
            className={inputClass}
          />
        </div>
      </div>

      {/* Cost note */}
      <p className="text-[11px] text-ios-text-3 dark:text-ios-text-2">
        Uses web search · approx $0.01–0.03 per lookup · 15s cooldown between searches
      </p>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 rounded-ios-sm text-[14px] text-ios-red"
          style={{ backgroundColor: 'rgba(255, 59, 48, 0.08)' }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleResearch}
          disabled={!canSubmit}
          className="flex-1 h-[44px] bg-ios-green disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-ios text-[15px] transition-all duration-150 ease-out active:scale-[0.97] flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Researching…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              Research Prospect
            </>
          )}
        </button>

        {result && (
          <button
            onClick={handleClear}
            className="h-[44px] px-4 rounded-ios text-[15px] font-medium text-ios-text-2 bg-ios-secondary dark:bg-ios-dark-secondary hover:text-ios-text dark:hover:text-white transition-colors duration-150"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      {result && (
        <ResearchResults
          result={result}
          selectedHooks={selectedHooks}
          onToggleHook={toggleHook}
        />
      )}
    </div>
  );
}
