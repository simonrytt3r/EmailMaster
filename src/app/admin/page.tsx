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

interface ReplyEntry {
  id: number;
  date: string;
  source: 'generate' | 'sequence';
  label: string;
  touchNumber?: number;
  subject: string;
  body: string;
  score?: number;
  offering: string;
  targetPersona: string;
  industry?: string;
  emailType?: string;
  note?: string;
}

interface ExtractState {
  status: 'idle' | 'extracting' | 'done' | 'error';
  pattern?: UpdatedBestPractice;
  error?: string;
  applyKey?: string;
}

interface NpsEntryLocal {
  id: number;
  date: string;
  orgName: string;
  orgType: string;
  state: string;
  npsScore: number;
  comment: string;
  contactName?: string;
  contactTitle?: string;
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
  const [repliesOpen, setRepliesOpen] = useState(true);

  const [replies, setReplies] = useState<ReplyEntry[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesError, setRepliesError] = useState('');
  const [expandedReply, setExpandedReply] = useState<number | null>(null);
  const [extractStates, setExtractStates] = useState<Record<number, ExtractState>>({});

  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [updates, setUpdates] = useState<FetchedUpdates | null>(null);
  const [fetchedDate, setFetchedDate] = useState('');

  // Track state per individual update item: null | 'applying' | 'applied' | 'skipped'
  const [itemStates, setItemStates] = useState<Record<string, string>>({});

  const [npsOpen, setNpsOpen] = useState(true);
  const [npsEntries, setNpsEntries] = useState<NpsEntryLocal[]>([]);
  const [npsLoading, setNpsLoading] = useState(false);
  const [npsError, setNpsError] = useState('');
  const [npsCsvText, setNpsCsvText] = useState('');
  const [npsUploading, setNpsUploading] = useState(false);
  const [npsUploadMode, setNpsUploadMode] = useState<'upload' | 'append'>('append');
  const [npsUploadError, setNpsUploadError] = useState('');
  const [npsUploadResult, setNpsUploadResult] = useState<{ count: number; total?: number } | null>(null);

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

  async function loadReplies() {
    setRepliesLoading(true);
    setRepliesError('');
    try {
      const res = await fetch('/api/admin/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        setReplies(json.replies ?? []);
      } else {
        setRepliesError(json.error || 'Failed to load replies.');
      }
    } catch {
      setRepliesError('Network error loading replies.');
    } finally {
      setRepliesLoading(false);
    }
  }

  async function handleExtractPattern(reply: ReplyEntry) {
    setExtractStates((prev) => ({ ...prev, [reply.id]: { status: 'extracting' } }));
    try {
      const res = await fetch('/api/admin/extract-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, reply }),
      });
      const json = await res.json();
      if (json.success) {
        const applyKey = `reply-pattern-${reply.id}`;
        setExtractStates((prev) => ({
          ...prev,
          [reply.id]: { status: 'done', pattern: json.pattern, applyKey },
        }));
      } else {
        setExtractStates((prev) => ({
          ...prev,
          [reply.id]: { status: 'error', error: json.error || 'Failed to extract pattern.' },
        }));
      }
    } catch {
      setExtractStates((prev) => ({
        ...prev,
        [reply.id]: { status: 'error', error: 'Network error extracting pattern.' },
      }));
    }
  }

  useEffect(() => {
    loadData();
    loadReplies();
    loadNpsEntries();
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

  async function loadNpsEntries() {
    setNpsLoading(true);
    setNpsError('');
    try {
      const res = await fetch('/api/admin/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'read' }),
      });
      const json = await res.json();
      if (json.success) {
        setNpsEntries(json.entries ?? []);
      } else {
        setNpsError(json.error || 'Failed to load NPS data.');
      }
    } catch {
      setNpsError('Network error loading NPS data.');
    } finally {
      setNpsLoading(false);
    }
  }

  async function handleNpsUpload() {
    if (!npsCsvText.trim()) return;
    setNpsUploading(true);
    setNpsUploadError('');
    setNpsUploadResult(null);
    try {
      const res = await fetch('/api/admin/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: npsUploadMode, csv: npsCsvText }),
      });
      const json = await res.json();
      if (json.success) {
        setNpsUploadResult({ count: json.count, total: json.total ?? json.count });
        setNpsCsvText('');
        await loadNpsEntries();
      } else {
        setNpsUploadError(json.error || 'Upload failed.');
      }
    } catch {
      setNpsUploadError('Network error during upload.');
    } finally {
      setNpsUploading(false);
    }
  }

  async function handleNpsDelete(id: number) {
    try {
      const res = await fetch('/api/admin/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'delete', id }),
      });
      const json = await res.json();
      if (json.success) {
        setNpsEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } catch {
      // silent
    }
  }

  async function handleNpsClear() {
    if (!confirm('Delete all NPS entries? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'clear' }),
      });
      const json = await res.json();
      if (json.success) setNpsEntries([]);
    } catch {
      // silent
    }
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
            <div className="grid grid-cols-4 gap-4">
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
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {replies.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Replies logged</div>
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

            {/* NPS Social Proof */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setNpsOpen((v) => !v)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div>
                  <h2 className="font-semibold">NPS Social Proof</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Upload customer NPS comments. The email generator will automatically match and inject peer quotes.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {npsEntries.length > 0 && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-full">
                      {npsEntries.length} entries
                    </span>
                  )}
                  <span className="text-gray-400 text-sm">{npsOpen ? '▲' : '▼'}</span>
                </div>
              </button>
              {npsOpen && (
                <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-5 space-y-5">

                  {/* CSV upload */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Upload from Google Sheets (CSV)
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Export your Google Sheet as CSV. Required columns in order:{' '}
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                        org_name, org_type, state, nps_score, comment, contact_name (optional), contact_title (optional)
                      </code>
                    </p>
                    <textarea
                      value={npsCsvText}
                      onChange={(e) => { setNpsCsvText(e.target.value); setNpsUploadError(''); setNpsUploadResult(null); }}
                      placeholder={'org_name,org_type,state,nps_score,comment,contact_name,contact_title\n"Oak Park High School","high school","FL",9,"This robot saved us 3 hours a week.","Mike Johnson","Athletic Director"'}
                      rows={6}
                      className="w-full px-3 py-2.5 text-xs font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <div className="flex items-center gap-2 text-sm">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="uploadMode"
                            value="append"
                            checked={npsUploadMode === 'append'}
                            onChange={() => setNpsUploadMode('append')}
                            className="accent-blue-600"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Append</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="uploadMode"
                            value="upload"
                            checked={npsUploadMode === 'upload'}
                            onChange={() => setNpsUploadMode('upload')}
                            className="accent-blue-600"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Replace all</span>
                        </label>
                      </div>
                      <button
                        onClick={handleNpsUpload}
                        disabled={npsUploading || !npsCsvText.trim()}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                      >
                        {npsUploading ? 'Saving…' : 'Save NPS Data'}
                      </button>
                    </div>
                    {npsUploadError && (
                      <p className="mt-2 text-sm text-red-500">{npsUploadError}</p>
                    )}
                    {npsUploadResult && (
                      <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                        ✓ {npsUploadResult.count} new entries saved
                        {npsUploadResult.total !== undefined && npsUploadResult.total !== npsUploadResult.count
                          ? ` · ${npsUploadResult.total} total`
                          : ''}
                      </p>
                    )}
                  </div>

                  {/* Entries table */}
                  {npsLoading && (
                    <p className="text-sm text-gray-400 py-2 text-center">Loading…</p>
                  )}
                  {npsError && (
                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">{npsError}</p>
                  )}
                  {!npsLoading && npsEntries.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
                      No NPS entries yet. Upload a CSV above to get started.
                    </p>
                  )}
                  {npsEntries.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {npsEntries.length} entries stored
                        </h3>
                        <button
                          onClick={handleNpsClear}
                          className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                              <th className="text-left px-3 py-2 font-medium">Organisation</th>
                              <th className="text-left px-3 py-2 font-medium">Type</th>
                              <th className="text-left px-3 py-2 font-medium">State</th>
                              <th className="text-center px-3 py-2 font-medium">NPS</th>
                              <th className="text-left px-3 py-2 font-medium">Comment</th>
                              <th className="px-3 py-2" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {npsEntries.map((e) => (
                              <tr key={e.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 font-medium max-w-[160px] truncate">
                                  {e.orgName}
                                </td>
                                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 capitalize">{e.orgType}</td>
                                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 uppercase">{e.state}</td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`font-semibold tabular-nums ${e.npsScore >= 9 ? 'text-green-600 dark:text-green-400' : e.npsScore >= 7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500'}`}>
                                    {e.npsScore}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 max-w-[300px]">
                                  <span className="line-clamp-2">{e.comment}</span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <button
                                    onClick={() => handleNpsDelete(e.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                                    title="Delete"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reply Feedback */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setRepliesOpen((v) => !v)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div>
                  <h2 className="font-semibold">Reply Feedback</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Emails marked &ldquo;Got a reply&rdquo; by users. Extract patterns to improve the knowledge base.
                  </p>
                </div>
                <span className="text-gray-400 text-sm shrink-0 ml-4">{repliesOpen ? '▲' : '▼'}</span>
              </button>
              {repliesOpen && (
                <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4">
                  {repliesLoading && (
                    <p className="text-sm text-gray-400 py-4 text-center">Loading replies…</p>
                  )}
                  {repliesError && (
                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">{repliesError}</p>
                  )}
                  {!repliesLoading && !repliesError && replies.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                      No replies logged yet. Use the &ldquo;Got a reply&rdquo; button on generated emails.
                    </p>
                  )}
                  {replies.length > 0 && (
                    <div className="space-y-4">
                      {replies.map((reply) => {
                        const extract = extractStates[reply.id];
                        const patternKey = `reply-pattern-${reply.id}`;
                        const isExpanded = expandedReply === reply.id;
                        return (
                          <div
                            key={reply.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                          >
                            {/* Reply header */}
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                                    {reply.source === 'sequence'
                                      ? `Sequence · ${reply.label}`
                                      : reply.label}
                                  </span>
                                  <span className="text-xs text-gray-400">{reply.date}</span>
                                  {reply.score !== undefined && (
                                    <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                      Score {reply.score}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1 truncate">
                                  Subject: {reply.subject}
                                </p>
                                {reply.offering && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                    {reply.offering} → {reply.targetPersona}
                                  </p>
                                )}
                                {reply.note && (
                                  <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-0.5">
                                    &ldquo;{reply.note}&rdquo;
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => setExpandedReply(isExpanded ? null : reply.id)}
                                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                              >
                                {isExpanded ? 'Hide' : 'Show email'}
                              </button>
                            </div>

                            {/* Email body (expandable) */}
                            {isExpanded && (
                              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                                  {reply.body}
                                </pre>
                              </div>
                            )}

                            {/* Extract pattern section */}
                            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                              {!extract || extract.status === 'idle' ? (
                                <button
                                  onClick={() => handleExtractPattern(reply)}
                                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
                                >
                                  Extract Pattern → KB
                                </button>
                              ) : extract.status === 'extracting' ? (
                                <p className="text-sm text-gray-500 italic">Analyzing with Claude…</p>
                              ) : extract.status === 'error' ? (
                                <div className="flex items-center gap-3 flex-wrap">
                                  <p className="text-sm text-red-500">{extract.error}</p>
                                  <button
                                    onClick={() => handleExtractPattern(reply)}
                                    className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-500 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                  >
                                    Retry
                                  </button>
                                </div>
                              ) : extract.status === 'done' && extract.pattern ? (
                                <div className="space-y-3">
                                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                    Extracted Pattern
                                  </h4>
                                  <UpdateCard
                                    title={extract.pattern.practice}
                                    fields={[
                                      { label: 'Old advice', value: extract.pattern.oldAdvice },
                                      { label: 'New advice', value: extract.pattern.newAdvice },
                                      { label: 'Source', value: extract.pattern.source },
                                    ]}
                                    onApply={() =>
                                      handleApply('updatedBestPractice', extract.pattern!, patternKey)
                                    }
                                    onSkip={() => handleSkip(patternKey)}
                                    applying={itemStates[patternKey] === 'applying'}
                                    applied={itemStates[patternKey] === 'applied'}
                                    skipped={itemStates[patternKey] === 'skipped'}
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
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
