'use client';

import { useState, useEffect } from 'react';
import { ResearchResult, PersonalizationHook, ResearchInputs } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentLookup {
  id: string;
  label: string;
  result: ResearchResult;
  inputs: ResearchInputs;
}

interface ProspectResearchProps {
  onResearchChange: (research: ResearchResult | null, selectedHooks: string[], inputs?: ResearchInputs) => void;
}

const SESSION_KEY = 'prospect_research_history';
const MAX_HISTORY = 5;

// ─── Helper: strength colours ─────────────────────────────────────────────────

function hookColour(strength: PersonalizationHook['strength']) {
  if (strength === 'strong') return 'border-ios-green/40 bg-ios-green/5 dark:bg-ios-green/10';
  if (strength === 'medium') return 'border-ios-yellow/40 bg-ios-yellow/5 dark:bg-ios-yellow/10';
  return 'border-ios-sep dark:border-ios-dark-sep bg-ios-bg dark:bg-ios-dark-secondary';
}

function hookBadgeColour(strength: PersonalizationHook['strength']) {
  if (strength === 'strong') return 'bg-ios-green/15 text-ios-green';
  if (strength === 'medium') return 'bg-ios-yellow/15 text-ios-yellow';
  return 'bg-ios-sep dark:bg-ios-dark-sep text-ios-text-2';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProspectResearch({ onResearchChange }: ProspectResearchProps) {
  const [open, setOpen] = useState(false);
  const [inputs, setInputs] = useState<ResearchInputs>({
    personName: '',
    jobTitle: '',
    company: '',
    linkedinUrl: '',
    websiteUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [researchedInputs, setResearchedInputs] = useState<ResearchInputs | null>(null);
  const [selectedHooks, setSelectedHooks] = useState<Set<string>>(new Set());
  const [recentLookups, setRecentLookups] = useState<RecentLookup[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [cacheMeta, setCacheMeta] = useState<{
    cached: boolean;
    daysAgo: number;
    daysUntilExpiry: number;
    hasNewInfo: boolean;
    newInfoFields: string[];
    allowUserRefresh: boolean;
  } | null>(null);

  // Load session history on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) setRecentLookups(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  // Notify parent whenever result or selected hooks change
  useEffect(() => {
    if (!result) { onResearchChange(null, []); return; }
    const companyHooks = (result.personalizationHooks ?? [])
      .filter((_, i) => selectedHooks.has(`company-${i}`))
      .map((h) => h.hook);
    const personHooks = (result.personHooks ?? [])
      .filter((_, i) => selectedHooks.has(`person-${i}`))
      .map((h) => h.hook);
    onResearchChange(result, [...companyHooks, ...personHooks], researchedInputs ?? undefined);
  }, [result, selectedHooks, onResearchChange, researchedInputs]);

  function set(field: keyof ResearchInputs, value: string) {
    setInputs((prev) => ({ ...prev, [field]: value }));
  }

  function saveToSession(res: ResearchResult, inp: ResearchInputs) {
    const label =
      [inp.personName, inp.company].filter(Boolean).join(' @ ') || inp.company;
    const entry: RecentLookup = {
      id: Date.now().toString(),
      label,
      result: res,
      inputs: inp,
    };
    const updated = [entry, ...recentLookups].slice(0, MAX_HISTORY);
    setRecentLookups(updated);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  function loadLookup(lookup: RecentLookup) {
    setInputs(lookup.inputs);
    setResult(lookup.result);
    setResearchedInputs(lookup.inputs);
    setSelectedHooks(new Set());
    setShowRecent(false);
    setOpen(true);
  }

  function handleClear() {
    setResult(null);
    setResearchedInputs(null);
    setSelectedHooks(new Set());
    setError(null);
    setCacheMeta(null);
  }

  async function handleResearch(force = false) {
    if (!inputs.company.trim()) {
      setError('Organization name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    if (!force) { setResult(null); setSelectedHooks(new Set()); }

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personName: inputs.personName || undefined,
          jobTitle: inputs.jobTitle || undefined,
          company: inputs.company,
          linkedinUrl: inputs.linkedinUrl || undefined,
          websiteUrl: inputs.websiteUrl || undefined,
          force,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Research failed. Please try again.');
      }

      setResult(data.result);
      setResearchedInputs({ ...inputs });
      setCacheMeta({
        cached: data.cached ?? false,
        daysAgo: data.daysAgo ?? 0,
        daysUntilExpiry: data.daysUntilExpiry ?? 30,
        hasNewInfo: data.hasNewInfo ?? false,
        newInfoFields: data.newInfoFields ?? [],
        allowUserRefresh: data.allowUserRefresh ?? false,
      });
      if (!data.cached) saveToSession(data.result, inputs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(
        msg.includes('parse')
          ? 'Limited information found online. You can still generate emails — try adding more context manually.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleHook(key: string) {
    setSelectedHooks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const inputClass =
    'w-full px-3 py-2.5 text-[15px] rounded-ios-sm bg-ios-bg dark:bg-ios-dark-secondary text-ios-text dark:text-white placeholder-ios-text-3 dark:placeholder-ios-text-2 focus:outline-none focus:ring-2 focus:ring-tt-green/40 transition-shadow duration-150';
  const labelClass =
    'block text-[12px] font-medium text-ios-text-2 uppercase tracking-wide mb-1.5';

  return (
    <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-ios-bg dark:hover:bg-ios-dark-secondary transition-colors duration-150 text-left"
      >
        <div className="flex items-center gap-2.5">
          {/* Step indicator */}
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-tt-green text-white text-[11px] font-bold flex-shrink-0">
            1
          </span>
          <div>
            <span className="text-[15px] font-medium text-ios-text dark:text-white">
              Research Your Prospect
            </span>
            {result && (
              <span className="ml-2 text-[12px] text-tt-green font-medium">
                ✓ {inputs.personName ? `${inputs.personName} @ ` : ''}{inputs.company}
              </span>
            )}
            {!result && (
              <span className="text-[13px] font-normal text-ios-text-2 ml-2">
                — optional, adds personalization
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {recentLookups.length > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowRecent((v) => !v); }}
              className="text-[12px] text-tt-green font-medium px-2 py-1 rounded-md hover:bg-tt-green/10 transition-colors"
            >
              Recent
            </button>
          )}
          <svg
            className={`w-4 h-4 text-ios-text-2 transition-transform duration-300 ease-ios flex-shrink-0 ${open ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Recent lookups dropdown */}
      {showRecent && recentLookups.length > 0 && (
        <div className="border-t border-ios-sep/20 dark:border-ios-dark-sep/60 px-4 py-2 bg-ios-bg dark:bg-ios-dark-secondary">
          <p className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide mb-2">
            Recent Lookups
          </p>
          <div className="space-y-1">
            {recentLookups.map((lookup) => (
              <button
                key={lookup.id}
                type="button"
                onClick={() => loadLookup(lookup)}
                className="w-full text-left px-3 py-2 rounded-ios-sm text-[14px] text-ios-text dark:text-white hover:bg-white dark:hover:bg-ios-dark-card transition-colors"
              >
                {lookup.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expanded content */}
      {open && (
        <div className="border-t border-ios-sep/20 dark:border-ios-dark-sep/60">
          {/* Input fields */}
          {!result && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Person&apos;s Name</label>
                  <input
                    type="text"
                    value={inputs.personName}
                    onChange={(e) => set('personName', e.target.value)}
                    placeholder="e.g., Mike Johnson"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Job Title</label>
                  <input
                    type="text"
                    value={inputs.jobTitle}
                    onChange={(e) => set('jobTitle', e.target.value)}
                    placeholder="e.g., Athletic Director"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Company / Organization *</label>
                <input
                  type="text"
                  value={inputs.company}
                  onChange={(e) => set('company', e.target.value)}
                  placeholder="e.g., Westlake High School or Denver Parks & Recreation"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>LinkedIn URL</label>
                  <input
                    type="url"
                    value={inputs.linkedinUrl}
                    onChange={(e) => set('linkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Company Website</label>
                  <input
                    type="url"
                    value={inputs.websiteUrl}
                    onChange={(e) => set('websiteUrl', e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
              </div>

              {error && (
                <div
                  className="flex items-start gap-2.5 px-4 py-3 rounded-ios-sm text-[14px] text-ios-red"
                  style={{ backgroundColor: 'rgba(255, 59, 48, 0.08)' }}
                >
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleResearch()}
                  disabled={loading || !inputs.company.trim()}
                  className="w-full h-[50px] bg-tt-green disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-ios text-[17px] shadow-tt-green transition-all duration-150 ease-out active:scale-[0.97] hover:bg-tt-green/90 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      {`Searching the web for ${inputs.company}...`}
                    </>
                  ) : (
                    '🔍 Research Prospect'
                  )}
                </button>
                <p className="text-center text-[12px] text-ios-text-3 dark:text-ios-text-2">
                  Uses web search — approx. $0.01–0.03 per lookup
                </p>
              </div>
            </div>
          )}

          {/* Research Results */}
          {result && (
            <div className="p-4 space-y-4">

              {/* Cache banner */}
              {cacheMeta && cacheMeta.cached && !cacheMeta.hasNewInfo && (
                <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-ios-sm bg-ios-bg dark:bg-ios-dark-secondary border border-ios-sep/30 dark:border-ios-dark-sep/60">
                  <div className="flex items-center gap-2 text-[12px] text-ios-text-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0 text-tt-grey-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Cached {cacheMeta.daysAgo === 0 ? 'today' : `${cacheMeta.daysAgo}d ago`}
                      {' · '}expires in {cacheMeta.daysUntilExpiry}d
                    </span>
                  </div>
                  {cacheMeta.allowUserRefresh && (
                    <button
                      type="button"
                      onClick={() => handleResearch(true)}
                      disabled={loading}
                      className="text-[12px] text-tt-green font-medium hover:underline disabled:opacity-40"
                    >
                      {loading ? 'Refreshing…' : 'Refresh now'}
                    </button>
                  )}
                </div>
              )}

              {/* New info banner — shown after a force-refresh finds changes */}
              {cacheMeta && cacheMeta.hasNewInfo && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-ios-sm border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/20">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">
                      New info found
                    </p>
                    <p className="text-[12px] text-amber-600 dark:text-amber-500 mt-0.5">
                      Updated: {cacheMeta.newInfoFields
                        .map((f) => ({
                          recentNews: 'Recent News',
                          keyFacts: 'Key Facts',
                          challenges: 'Challenges',
                          recentActivity: 'Recent Activity',
                          notableItems: 'Notable Items',
                          orgSummary: 'Organisation Summary',
                          personSummary: 'Person Summary',
                        }[f] ?? f))
                        .join(', ')}
                    </p>
                  </div>
                  {cacheMeta.allowUserRefresh && (
                    <button
                      type="button"
                      onClick={() => handleResearch(true)}
                      disabled={loading}
                      className="text-[12px] text-amber-700 dark:text-amber-400 font-medium hover:underline disabled:opacity-40 shrink-0"
                    >
                      {loading ? 'Refreshing…' : 'Refresh again'}
                    </button>
                  )}
                </div>
              )}

              {/* Personalization Hooks — split into company + person */}
              {((result.personalizationHooks?.length > 0) || (result.personHooks?.length > 0)) && (
                <div className="space-y-4">
                  <p className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide">
                    Personalization Hooks — select the ones to use
                  </p>

                  {/* Company hooks */}
                  {result.personalizationHooks?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-ios-text-2 mb-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-tt-green inline-block" />
                        About the Company
                      </p>
                      <div className="space-y-2">
                        {result.personalizationHooks.map((hook, i) => {
                          const key = `company-${i}`;
                          const selected = selectedHooks.has(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleHook(key)}
                              className={`w-full text-left rounded-ios-sm border p-3 transition-all duration-150 ${hookColour(hook.strength)} ${selected ? 'ring-2 ring-tt-green' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${hookBadgeColour(hook.strength)}`}>
                                  {hook.strength}
                                </span>
                                <span className="text-[13px] font-medium text-tt-green">
                                  {selected ? '✓ Selected' : 'Tap to select'}
                                </span>
                              </div>
                              <p className="text-[14px] font-medium text-ios-text dark:text-white mb-1">
                                {hook.hook}
                              </p>
                              <p className="text-[13px] text-ios-text-2">
                                {hook.emailAngle}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Person hooks */}
                  {result.personHooks?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-ios-text-2 mb-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                        About the Person
                      </p>
                      <div className="space-y-2">
                        {result.personHooks.map((hook, i) => {
                          const key = `person-${i}`;
                          const selected = selectedHooks.has(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleHook(key)}
                              className={`w-full text-left rounded-ios-sm border p-3 transition-all duration-150 ${hookColour(hook.strength)} ${selected ? 'ring-2 ring-purple-500' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${hookBadgeColour(hook.strength)}`}>
                                  {hook.strength}
                                </span>
                                <span className="text-[13px] font-medium text-tt-green">
                                  {selected ? '✓ Selected' : 'Tap to select'}
                                </span>
                              </div>
                              <p className="text-[14px] font-medium text-ios-text dark:text-white mb-1">
                                {hook.hook}
                              </p>
                              <p className="text-[13px] text-ios-text-2">
                                {hook.emailAngle}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Organization Card */}
              <div className="rounded-ios-sm border border-ios-sep/30 dark:border-ios-dark-sep/60 overflow-hidden">
                <div className="px-3 py-2 bg-ios-bg dark:bg-ios-dark-secondary border-b border-ios-sep/20 dark:border-ios-dark-sep/60">
                  <h4 className="text-[13px] font-semibold text-ios-text dark:text-white">
                    {inputs.company}
                  </h4>
                  {result.organization.size && (
                    <p className="text-[12px] text-ios-text-2">{result.organization.size}</p>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  {result.organization.summary && (
                    <p className="text-[13px] text-ios-text dark:text-white leading-relaxed">
                      {result.organization.summary}
                    </p>
                  )}
                  {result.organization.keyFacts?.length > 0 && (
                    <ul className="space-y-1">
                      {result.organization.keyFacts.map((f, i) => (
                        <li key={i} className="text-[13px] text-ios-text-2 flex items-start gap-1.5">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-tt-green flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {result.organization.sports?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {result.organization.sports.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-tt-green/10 text-tt-green">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {result.organization.recentNews?.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide mb-1">Recent News</p>
                      {result.organization.recentNews.map((n, i) => (
                        <p key={i} className="text-[13px] text-ios-text-2">• {n}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Person Card */}
              {(result.person.summary || result.person.role) && inputs.personName && (
                <div className="rounded-ios-sm border border-ios-sep/30 dark:border-ios-dark-sep/60 overflow-hidden">
                  <div className="px-3 py-2 bg-ios-bg dark:bg-ios-dark-secondary border-b border-ios-sep/20 dark:border-ios-dark-sep/60">
                    <h4 className="text-[13px] font-semibold text-ios-text dark:text-white">
                      {inputs.personName}
                    </h4>
                    {result.person.role && (
                      <p className="text-[12px] text-ios-text-2">{result.person.role}</p>
                    )}
                    {result.person.tenure && (
                      <p className="text-[12px] text-ios-text-3">{result.person.tenure}</p>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    {result.person.summary && (
                      <p className="text-[13px] text-ios-text dark:text-white leading-relaxed">
                        {result.person.summary}
                      </p>
                    )}
                    {result.person.recentActivity?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide mb-1">Recent Activity</p>
                        {result.person.recentActivity.map((a, i) => (
                          <p key={i} className="text-[13px] text-ios-text-2">• {a}</p>
                        ))}
                      </div>
                    )}
                    {result.person.notableItems?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide mb-1">Notable</p>
                        {result.person.notableItems.map((n, i) => (
                          <p key={i} className="text-[13px] text-ios-text-2">• {n}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sources */}
              {result.sources?.length > 0 && (
                <p className="text-[11px] text-ios-text-3 dark:text-ios-text-2">
                  Sources: {result.sources.slice(0, 3).join(' · ')}
                </p>
              )}

              {/* Clear button */}
              <button
                type="button"
                onClick={handleClear}
                className="w-full py-2.5 rounded-ios-sm border border-ios-sep dark:border-ios-dark-sep text-[14px] text-ios-text-2 hover:text-ios-red hover:border-ios-red/40 transition-colors duration-150"
              >
                Clear Research
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
