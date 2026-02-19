'use client';

import { useState, useEffect } from 'react';
import { ResearchResult, ResearchHistoryEntry, PersonalizationHook } from '@/lib/types';

interface ProspectResearchProps {
  onResearchComplete: (result: ResearchResult | null, selectedHooks: string[]) => void;
}

const MAX_HISTORY = 5;
const HISTORY_KEY = 'prospect_research_history';

function loadHistory(): ResearchHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(entries: ResearchHistoryEntry[]) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

function HookStrengthDot({ strength }: { strength: PersonalizationHook['strength'] }) {
  const colors = {
    strong: 'bg-green-500',
    medium: 'bg-yellow-400',
    weak: 'bg-gray-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[strength]} flex-shrink-0`} />;
}

function HookStrengthBadge({ strength }: { strength: PersonalizationHook['strength'] }) {
  const styles = {
    strong: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    weak: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[strength]}`}>
      {strength}
    </span>
  );
}

export default function ProspectResearch({ onResearchComplete }: ProspectResearchProps) {
  const [open, setOpen] = useState(false);
  const [personName, setPersonName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedHooks, setSelectedHooks] = useState<Set<number>>(new Set());

  const [history, setHistory] = useState<ResearchHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Propagate selections to parent whenever they change
  useEffect(() => {
    if (!result) return;
    const hooks = Array.from(selectedHooks).map(
      (i) => `${result.personalizationHooks[i].hook} — ${result.personalizationHooks[i].emailAngle}`
    );
    onResearchComplete(result, hooks);
  }, [selectedHooks, result]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResearch = async () => {
    if (!company.trim()) {
      setError('Company / organization name is required to research.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedHooks(new Set());
    setStatusMessage(`Searching the web for information about ${company}...`);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personName, jobTitle, company, linkedinUrl, websiteUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Research failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) throw new Error(data.error);
              if (data.done && data.result) {
                const researchResult = data.result as ResearchResult;
                setResult(researchResult);
                // Auto-select strong hooks
                const autoSelected = new Set<number>();
                researchResult.personalizationHooks.forEach((h, i) => {
                  if (h.strength === 'strong') autoSelected.add(i);
                });
                setSelectedHooks(autoSelected);
                // Notify parent immediately
                const autoHooks = Array.from(autoSelected).map(
                  (i) => `${researchResult.personalizationHooks[i].hook} — ${researchResult.personalizationHooks[i].emailAngle}`
                );
                onResearchComplete(researchResult, autoHooks);
                // Save to history
                const entry: ResearchHistoryEntry = {
                  id: Date.now().toString(),
                  timestamp: Date.now(),
                  personName: personName || undefined,
                  jobTitle: jobTitle || undefined,
                  company,
                  result: researchResult,
                };
                const newHistory = [entry, ...loadHistory()].slice(0, MAX_HISTORY);
                saveHistory(newHistory);
                setHistory(newHistory);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Research failed';
      setError(msg);
      onResearchComplete(null, []);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleClear = () => {
    setResult(null);
    setSelectedHooks(new Set());
    setError(null);
    setPersonName('');
    setJobTitle('');
    setCompany('');
    setLinkedinUrl('');
    setWebsiteUrl('');
    onResearchComplete(null, []);
  };

  const loadFromHistory = (entry: ResearchHistoryEntry) => {
    setPersonName(entry.personName || '');
    setJobTitle(entry.jobTitle || '');
    setCompany(entry.company);
    setResult(entry.result);
    setShowHistory(false);
    // Auto-select strong hooks
    const autoSelected = new Set<number>();
    entry.result.personalizationHooks.forEach((h, i) => {
      if (h.strength === 'strong') autoSelected.add(i);
    });
    setSelectedHooks(autoSelected);
    const hooks = Array.from(autoSelected).map(
      (i) => `${entry.result.personalizationHooks[i].hook} — ${entry.result.personalizationHooks[i].emailAngle}`
    );
    onResearchComplete(entry.result, hooks);
  };

  const toggleHook = (index: number) => {
    setSelectedHooks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-turf-green focus:border-transparent';
  const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5';

  const hasLimitedInfo =
    result &&
    result.personalizationHooks.length === 0 &&
    !result.organization.summary;

  return (
    <div className="border border-blue-200 dark:border-blue-900 rounded-xl overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Research Your Prospect</span>
          {result && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full font-medium">
              Done
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-blue-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
          {/* Recent lookups */}
          {history.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center gap-1 font-medium"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Lookups ({history.length})
              </button>
              {showHistory && (
                <div className="absolute z-10 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                  {history.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => loadFromHistory(entry)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{entry.company}</div>
                      {entry.personName && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{entry.personName}</div>
                      )}
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Input fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Person&apos;s Name</label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="e.g., Mike Johnson"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Athletic Director"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Company / Organization *</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Westlake High School"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>LinkedIn URL</label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Company Website URL</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Research button */}
          <div className="space-y-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResearch}
                disabled={loading || !company.trim()}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    Researching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Research Prospect
                  </>
                )}
              </button>
              {result && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-600">
              Uses web search — approximately $0.01–0.03 per lookup
            </p>
          </div>

          {/* Status message while searching */}
          {loading && statusMessage && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 animate-pulse">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {statusMessage}
            </div>
          )}

          {/* Limited info warning */}
          {hasLimitedInfo && (
            <div className="px-3 py-2.5 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-400">
              Limited information found online. You can still generate emails — try adding more context manually.
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="space-y-4 pt-2">
              <div className="h-px bg-blue-100 dark:bg-blue-900/50" />

              {/* Personalization Hooks — most important, shown first */}
              {result.personalizationHooks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Personalization Hooks
                    </h3>
                    <span className="text-xs text-gray-400">click to select</span>
                  </div>
                  <div className="space-y-2">
                    {result.personalizationHooks.map((hook, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleHook(i)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedHooks.has(i)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <HookStrengthDot strength={hook.strength} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                                {hook.hook}
                              </p>
                              <HookStrengthBadge strength={hook.strength} />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                              <span className="font-medium text-gray-600 dark:text-gray-300">Use it: </span>
                              {hook.emailAngle}
                            </p>
                          </div>
                          {selectedHooks.has(i) && (
                            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Organization card */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {company}
                  {result.organization.size && (
                    <span className="text-xs text-gray-400 font-normal">— {result.organization.size}</span>
                  )}
                </h3>
                {result.organization.summary && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {result.organization.summary}
                  </p>
                )}
                {result.organization.sports.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.organization.sports.map((sport) => (
                      <span
                        key={sport}
                        className="px-2 py-0.5 text-xs bg-turf-green/10 text-turf-green dark:text-green-400 rounded-full border border-turf-green/20"
                      >
                        {sport}
                      </span>
                    ))}
                  </div>
                )}
                {result.organization.keyFacts.length > 0 && (
                  <ul className="space-y-1">
                    {result.organization.keyFacts.map((fact, i) => (
                      <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                        <span className="text-gray-300 dark:text-gray-600 mt-0.5">•</span>
                        {fact}
                      </li>
                    ))}
                  </ul>
                )}
                {result.organization.recentNews.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Recent News</p>
                    <ul className="space-y-1">
                      {result.organization.recentNews.map((item, i) => (
                        <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                          <span className="text-blue-400 mt-0.5">→</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Person card */}
              {result.person.summary && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {personName || 'Person'}
                    {result.person.role && (
                      <span className="text-xs text-gray-400 font-normal truncate">— {result.person.role}</span>
                    )}
                  </h3>
                  {result.person.summary && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{result.person.summary}</p>
                  )}
                  {result.person.tenure && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Tenure:</span> {result.person.tenure}
                    </p>
                  )}
                  {result.person.recentActivity.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Recent Activity</p>
                      <ul className="space-y-1">
                        {result.person.recentActivity.map((item, i) => (
                          <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                            <span className="text-blue-400 mt-0.5">→</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.person.notableItems.length > 0 && (
                    <ul className="space-y-1">
                      {result.person.notableItems.map((item, i) => (
                        <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                          <span className="text-gray-300 dark:text-gray-600 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Sources */}
              {result.sources.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-gray-400 self-center">Sources:</span>
                  {result.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-600 underline truncate max-w-[200px]"
                      title={src}
                    >
                      {src.replace(/^https?:\/\//, '').split('/')[0]}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
