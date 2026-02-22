'use client';

import { useState, useRef } from 'react';
import CopyButton from '@/components/CopyButton';
import LoadingState from '@/components/LoadingState';
import { SequenceRequest, SequenceResult, SequenceTouchEmail } from '@/lib/types';

const COOLDOWN_MS = 5000;

const inputClass =
  'w-full px-3 py-2.5 text-[15px] rounded-ios-sm bg-ios-bg dark:bg-ios-dark-secondary text-ios-text dark:text-white placeholder-ios-text-3 dark:placeholder-ios-text-2 focus:outline-none focus:ring-2 focus:ring-ios-blue/40 transition-shadow duration-150';
const labelClass =
  'block text-[12px] font-medium text-ios-text-2 uppercase tracking-wide mb-1.5';

const TOUCH_COLORS: Record<number, string> = {
  1: 'bg-ios-blue text-white',
  2: 'bg-ios-green text-white',
  3: 'bg-ios-yellow text-white',
  4: 'bg-ios-red text-white',
  5: 'bg-ios-text-2 text-white',
};

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return 'text-ios-green';
  if (score >= 65) return 'text-ios-yellow';
  return 'text-ios-red';
};

// ─── Touch Card ────────────────────────────────────────────────────────────────
function TouchCard({
  touch,
  isLast,
  context,
}: {
  touch: SequenceTouchEmail;
  isLast: boolean;
  context?: { offering: string; targetPersona: string; industry?: string };
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyNote, setReplyNote] = useState('');
  const [replied, setReplied] = useState(false);
  const [logging, setLogging] = useState(false);
  const [replyError, setReplyError] = useState(false);
  const emailText = `Subject: ${touch.subject}\n\n${touch.body}`;
  const badgeClass = TOUCH_COLORS[touch.touchNumber] ?? 'bg-ios-text-2 text-white';

  const handleLogReply = async () => {
    setLogging(true);
    setReplyError(false);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'sequence',
          label: `Touch ${touch.touchNumber} — ${touch.label}`,
          touchNumber: touch.touchNumber,
          subject: touch.subject,
          body: touch.body,
          score: touch.overallScore,
          offering: context?.offering ?? '',
          targetPersona: context?.targetPersona ?? '',
          industry: context?.industry,
          note: replyNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('server error');
      setReplied(true);
      setShowReplyForm(false);
    } catch {
      setReplyError(true);
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="flex gap-4">
      {/* Timeline column */}
      <div className="flex flex-col items-center flex-shrink-0 w-8">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 ${badgeClass}`}
        >
          {touch.touchNumber}
        </div>
        {!isLast && (
          <div className="w-[2px] flex-1 bg-ios-sep/40 dark:bg-ios-dark-sep/60 mt-2 min-h-[24px]" />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 pb-6">
        {/* Card header */}
        <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios overflow-hidden ios-card-hover">
          <div className="px-4 py-3 border-b border-ios-sep/20 dark:border-ios-dark-sep/60 bg-ios-bg dark:bg-ios-dark-secondary flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${badgeClass}`}>
                Touch {touch.touchNumber} — {touch.label}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[12px] font-medium bg-ios-secondary dark:bg-ios-dark-secondary text-ios-text-2">
                Day {touch.sendDay}
              </span>
            </div>
            <span className={`text-[13px] font-semibold tabular-nums ${SCORE_COLOR(touch.overallScore)}`}>
              {touch.overallScore}/100
            </span>
          </div>

          {/* Strategy note */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-[12px] text-ios-text-2 italic">{touch.strategy}</p>
          </div>

          {/* Email content */}
          <div className="px-4 pb-4 space-y-3">
            <p className="text-[13px]">
              <span className="text-ios-text-2 font-medium">Subject: </span>
              <span className="text-ios-text dark:text-white font-semibold">{touch.subject}</span>
            </p>
            <div className="bg-ios-bg dark:bg-ios-dark-secondary rounded-ios-sm p-3">
              <pre className="text-[13px] text-ios-text dark:text-white whitespace-pre-wrap font-sans leading-relaxed">
                {touch.body}
              </pre>
            </div>

            {/* Strength/improvement */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-ios-green/10 rounded-ios-sm px-3 py-2">
                <p className="text-[11px] font-semibold text-ios-green uppercase tracking-wide mb-0.5">Strength</p>
                <p className="text-[12px] text-ios-text dark:text-white">{touch.keyStrength}</p>
              </div>
              <div className="bg-ios-yellow/10 rounded-ios-sm px-3 py-2">
                <p className="text-[11px] font-semibold text-ios-yellow uppercase tracking-wide mb-0.5">Watch</p>
                <p className="text-[12px] text-ios-text dark:text-white">{touch.keyImprovement}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <CopyButton text={emailText} label="Copy touch" />
              {!replied ? (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium bg-ios-green/10 text-ios-green hover:bg-ios-green/15 transition-colors duration-150"
                >
                  Got a reply
                </button>
              ) : (
                <span className="text-[13px] font-medium text-ios-green">✓ Logged</span>
              )}
            </div>

            {/* Reply form */}
            {showReplyForm && !replied && (
              <div className="pt-3 border-t border-ios-sep/20 dark:border-ios-dark-sep/60 space-y-2">
                <p className="text-[12px] text-ios-text-2">Log this reply to improve future generations.</p>
                <input
                  type="text"
                  value={replyNote}
                  onChange={(e) => setReplyNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !logging && handleLogReply()}
                  placeholder="Optional: booked demo, said not now, gave referral..."
                  className="w-full px-3 py-2 text-[13px] rounded-ios-sm bg-ios-bg dark:bg-ios-dark-secondary text-ios-text dark:text-white placeholder-ios-text-3 dark:placeholder-ios-text-2 focus:outline-none focus:ring-2 focus:ring-ios-green/30"
                />
                {replyError && (
                  <p className="text-[12px] text-ios-red">Failed to log — check your connection and try again.</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleLogReply}
                    disabled={logging}
                    className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-ios-green text-white hover:bg-ios-green/90 disabled:opacity-40 transition-colors"
                  >
                    {logging ? 'Logging...' : replyError ? 'Try again' : 'Log it'}
                  </button>
                  <button
                    onClick={() => { setShowReplyForm(false); setReplyError(false); }}
                    className="px-4 py-1.5 rounded-full text-[13px] font-medium text-ios-text-2 hover:text-ios-text dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function SequencePage() {
  const [offering, setOffering] = useState('');
  const [targetPersona, setTargetPersona] = useState('');
  const [sequenceLength, setSequenceLength] = useState<3 | 5>(5);
  const [industry, setIndustry] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [differentiator, setDifferentiator] = useState('');
  const [tone, setTone] = useState('');
  const [mustInclude, setMustInclude] = useState('');
  const [showOptional, setShowOptional] = useState(false);

  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState<SequenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [onCooldown, setOnCooldown] = useState(false);

  const canSubmit = offering.trim() && targetPersona.trim() && !loading && !onCooldown;

  const buildCopyAll = (touches: SequenceTouchEmail[]) =>
    touches
      .map(
        (t) =>
          `--- Touch ${t.touchNumber} (Day ${t.sendDay}): ${t.label} ---\nSubject: ${t.subject}\n\n${t.body}`
      )
      .join('\n\n' + '='.repeat(50) + '\n\n');

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setStreamText('');

    const body: SequenceRequest = {
      offering: offering.trim(),
      targetPersona: targetPersona.trim(),
      sequenceLength,
      industry: industry.trim() || undefined,
      painPoints: painPoints.trim() || undefined,
      differentiator: differentiator.trim() || undefined,
      tone: tone || undefined,
      mustInclude: mustInclude.trim() || undefined,
    };

    try {
      const response = await fetch('/api/sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate sequence');
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
              if (data.chunk) setStreamText((prev) => prev + data.chunk);
              if (data.done && data.result) {
                setResult(data.result as SequenceResult);
                setStreamText('');
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      setOnCooldown(true);
      cooldownRef.current = setTimeout(() => setOnCooldown(false), COOLDOWN_MS);
    }
  };

  return (
    <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg pb-16">
      <div className="max-w-ios mx-auto px-4 sm:px-5 pt-6 space-y-5">

        {/* Page header */}
        <div>
          <h1 className="text-[22px] font-bold text-ios-text dark:text-white">Sequence Builder</h1>
          <p className="text-[14px] text-ios-text-2 mt-1">
            Generate a complete {sequenceLength}-touch cold email sequence — all at once, each touch distinct.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios p-5 space-y-5">

          {/* Sequence length selector */}
          <div>
            <label className={labelClass}>Sequence Length</label>
            <div className="flex items-center bg-ios-secondary dark:bg-ios-dark-secondary rounded-[9px] p-[3px] gap-[2px] w-fit">
              {([3, 5] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setSequenceLength(n)}
                  className={`px-4 py-[6px] rounded-[7px] text-[13px] font-medium whitespace-nowrap transition-all duration-150 ease-out select-none ${
                    sequenceLength === n
                      ? 'bg-white dark:bg-ios-dark-card text-ios-text dark:text-white shadow-ios-seg'
                      : 'text-ios-text-2 hover:text-ios-text dark:hover:text-white'
                  }`}
                >
                  {n}-Touch
                </button>
              ))}
            </div>
            <p className="text-[12px] text-ios-text-2 mt-1.5">
              {sequenceLength === 5
                ? 'Days 0, 3, 10, 17, 24 — captures 93% of replies (3-7-7 cadence)'
                : 'Days 0, 3, 10 — lean sequence for warm lists or faster cycles'}
            </p>
          </div>

          {/* Required fields */}
          <div className="space-y-4">
            <div>
              <label className={labelClass}>What You&rsquo;re Selling / Offering *</label>
              <input
                type="text"
                value={offering}
                onChange={(e) => setOffering(e.target.value)}
                placeholder="e.g., GPS-guided field marking robots for sports facilities"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Target Persona *</label>
              <input
                type="text"
                value={targetPersona}
                onChange={(e) => setTargetPersona(e.target.value)}
                placeholder="e.g., Directors of Operations at multi-field sports complexes"
                className={inputClass}
              />
            </div>
          </div>

          {/* Optional fields toggle */}
          <div>
            <button
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-1.5 text-[13px] font-medium text-ios-blue"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-150 ${showOptional ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {showOptional ? 'Hide' : 'Add'} optional details
            </button>

            {showOptional && (
              <div className="mt-4 space-y-4 border-t border-ios-sep/20 dark:border-ios-dark-sep/60 pt-4">
                <div>
                  <label className={labelClass}>Industry / Vertical</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., Parks & Recreation, Collegiate Athletics"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Known Pain Points</label>
                  <textarea
                    value={painPoints}
                    onChange={(e) => setPainPoints(e.target.value)}
                    placeholder="e.g., Labor shortage, inconsistent line quality, time-consuming manual marking"
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Key Differentiator / Proof Point</label>
                  <input
                    type="text"
                    value={differentiator}
                    onChange={(e) => setDifferentiator(e.target.value)}
                    placeholder="e.g., 30-min field marking vs. 3 hours manually, sub-centimeter precision"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Default (peer-level, direct)</option>
                    <option value="Casual">Casual</option>
                    <option value="Professional">Professional</option>
                    <option value="Bold">Bold</option>
                    <option value="Consultative">Consultative</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Must Include</label>
                  <input
                    type="text"
                    value={mustInclude}
                    onChange={(e) => setMustInclude(e.target.value)}
                    placeholder="e.g., Mention the free trial, reference competitor X"
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-[13px] text-ios-red bg-ios-red/10 rounded-ios-sm px-3 py-2">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleGenerate}
            disabled={!canSubmit}
            className="w-full h-[50px] bg-ios-blue disabled:opacity-40 text-white font-semibold rounded-ios text-[17px] shadow-ios-blue transition-all duration-150 ease-out active:scale-[0.97]"
          >
            {loading
              ? `Building ${sequenceLength}-touch sequence...`
              : onCooldown
              ? 'Ready in a moment...'
              : `Build ${sequenceLength}-Touch Sequence`}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios">
            <LoadingState message={`Building your ${sequenceLength}-touch sequence...`} />
            {streamText && (
              <div className="px-5 pb-5">
                <p className="text-[11px] text-ios-text-2 font-mono truncate opacity-60">
                  {streamText.slice(-120)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-2">
            {/* Results header */}
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[17px] font-semibold text-ios-text dark:text-white">
                Your {result.touches.length}-Touch Sequence
              </h2>
              <CopyButton
                text={buildCopyAll(result.touches)}
                label="Copy all"
              />
            </div>

            {/* Timing legend */}
            <div className="flex gap-2 flex-wrap px-1">
              {result.touches.map((t) => (
                <span
                  key={t.touchNumber}
                  className="text-[11px] text-ios-text-2 bg-ios-secondary dark:bg-ios-dark-secondary px-2 py-0.5 rounded-full"
                >
                  T{t.touchNumber} Day {t.sendDay}
                </span>
              ))}
            </div>

            {/* Touch cards timeline */}
            <div className="pt-2">
              {result.touches.map((touch, i) => (
                <TouchCard
                  key={touch.touchNumber}
                  touch={touch}
                  isLast={i === result.touches.length - 1}
                  context={{ offering, targetPersona, industry: industry || undefined }}
                />
              ))}
            </div>

            {/* Re-generate */}
            <div className="pt-2 pb-4">
              <button
                onClick={handleGenerate}
                disabled={!canSubmit}
                className="w-full h-[44px] border border-ios-sep dark:border-ios-dark-sep rounded-ios text-[15px] font-medium text-ios-text-2 hover:text-ios-text dark:hover:text-white transition-colors duration-150 disabled:opacity-40"
              >
                Regenerate sequence
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
