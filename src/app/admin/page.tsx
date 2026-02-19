'use client';

import { useState, useEffect } from 'react';

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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function AdminDashboard({ password }: { password: string }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  const [kbOpen, setKbOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(true);

  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [updates, setUpdates] = useState<FetchedUpdates | null>(null);
  const [fetchedDate, setFetchedDate] = useState('');

  // Track state per individual update item: null | 'applying' | 'applied' | 'skipped'
  const [itemStates, setItemStates] = useState<Record<string, string>>({});

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

  useEffect(() => {
    loadData();
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

        {data && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4">
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
