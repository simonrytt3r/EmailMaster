'use client';

import { useState, useRef } from 'react';
import LoadingState from '@/components/LoadingState';
import CopyButton from '@/components/CopyButton';
import { SubjectLine, SubjectLinesResult } from '@/lib/types';

const COOLDOWN_MS = 5000;

// iOS-style style → color mapping
const STYLE_COLORS: Record<string, { bg: string; text: string }> = {
  'Question-based':    { bg: 'rgba(0, 122, 255, 0.10)',  text: '#007AFF' },
  'Curiosity/intrigue':{ bg: 'rgba(175, 82, 222, 0.10)', text: '#AF52DE' },
  'Direct/benefit-led':{ bg: 'rgba(52, 199, 89, 0.10)',  text: '#34C759' },
  'Personalized':      { bg: 'rgba(255, 149, 0, 0.10)',  text: '#FF9500' },
  'Pattern interrupt': { bg: 'rgba(255, 59, 48, 0.10)',  text: '#FF3B30' },
};

function getStyleColor(style: string) {
  for (const [key, val] of Object.entries(STYLE_COLORS)) {
    if (style.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { bg: 'rgba(142, 142, 147, 0.10)', text: '#8E8E93' };
}

function SpamDot({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: '#34C759',
    medium: '#FF9500',
    high: '#FF3B30',
  };
  const color = colors[level] || '#8E8E93';
  return (
    <div
      className="flex items-center gap-1.5 flex-shrink-0"
      title={`Spam risk: ${level}`}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-[12px] font-medium capitalize" style={{ color }}>
        {level}
      </span>
    </div>
  );
}

function SubjectLineRow({ line }: { line: SubjectLine }) {
  const [flashing, setFlashing] = useState(false);
  const styleColor = getStyleColor(line.style);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(line.text);
      setFlashing(true);
      setTimeout(() => setFlashing(false), 600);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 group ${
        flashing ? 'bg-ios-blue/8' : 'hover:bg-ios-bg dark:hover:bg-ios-dark-secondary'
      }`}
    >
      {/* Subject text */}
      <span className="flex-1 text-[15px] text-ios-text dark:text-white font-medium leading-snug">
        {line.text}
      </span>

      {/* Metadata */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Style pill */}
        <span
          className="px-2 py-0.5 rounded-full text-[11px] font-semibold hidden sm:inline-flex"
          style={{ backgroundColor: styleColor.bg, color: styleColor.text }}
        >
          {line.style}
        </span>

        {/* Stats */}
        <div className="text-right hidden sm:block">
          <p className="text-[11px] text-ios-text-2 tabular-nums">{line.charCount} chars</p>
          <p className="text-[11px] text-ios-text-2 tabular-nums">{line.wordCount} words</p>
        </div>

        {/* Spam dot */}
        <SpamDot level={line.spamRisk} />

        {/* Copy hint */}
        <svg
          className="w-4 h-4 text-ios-text-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
    </button>
  );
}

export default function SubjectLinesPage() {
  const [emailBody, setEmailBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubjectLinesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastRequestTime = useRef<number>(0);

  const handleGenerate = async () => {
    if (!emailBody.trim()) {
      setError('Please enter your email body or description.');
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - lastRequestTime.current;
    if (timeSinceLast < COOLDOWN_MS && lastRequestTime.current > 0) {
      setError(`Please wait ${Math.ceil((COOLDOWN_MS - timeSinceLast) / 1000)} seconds.`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    lastRequestTime.current = now;

    try {
      const response = await fetch('/api/subject-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailBody }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate subject lines');
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
              if (data.done && data.result) setResult(data.result);
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
    }
  };

  const wordCount = emailBody.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold text-ios-text dark:text-white tracking-tight">
          Subject Lines
        </h1>
        <p className="text-[15px] text-ios-text-2 mt-1 leading-relaxed">
          Generate 10 subject line options across 5 styles — with character count and spam risk for each.
        </p>
      </div>

      {/* Input card */}
      <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios p-4 space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-ios-text-2 mb-2">
            Email Body or Description
          </label>
          <div className="relative">
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Paste your email body, or just describe what it's about. e.g., 'Cold email to athletic directors offering turf maintenance software that helped Ohio State cut costs by 40%'"
              rows={6}
              className="w-full px-4 py-3.5 text-[15px] rounded-ios bg-ios-bg dark:bg-ios-dark-secondary text-ios-text dark:text-white placeholder-ios-text-3 dark:placeholder-ios-text-2 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ios-blue/40 transition-shadow duration-150"
            />
            {emailBody && (
              <div className="absolute bottom-3 right-3 text-[11px] text-ios-text-3 tabular-nums pointer-events-none">
                {wordCount} words
              </div>
            )}
          </div>
        </div>

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

        <button
          onClick={handleGenerate}
          disabled={loading || !emailBody.trim()}
          className="w-full h-[50px] bg-ios-blue disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-ios text-[17px] shadow-ios-blue transition-all duration-150 ease-out active:scale-[0.97] hover:bg-ios-blue/90"
        >
          {loading ? 'Generating...' : 'Generate 10 Subject Lines'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios">
          <LoadingState message="Generating subject line variations..." />
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-ios-sep/40 dark:bg-ios-dark-sep" />
            <span className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide">
              {result.subjectLines.length} Subject Lines
            </span>
            <div className="h-px flex-1 bg-ios-sep/40 dark:bg-ios-dark-sep" />
          </div>

          {/* Style legend */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(STYLE_COLORS).map(([style, color]) => (
              <span
                key={style}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: color.bg, color: color.text }}
              >
                {style}
              </span>
            ))}
          </div>

          {/* Subject lines — iOS table view style */}
          <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios overflow-hidden">
            <div className="px-4 pt-3 pb-2">
              <p className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide">
                Tap any row to copy
              </p>
            </div>
            <div className="divide-y divide-ios-sep/20 dark:divide-ios-dark-sep/60">
              {result.subjectLines.map((line, i) => (
                <SubjectLineRow key={i} line={line} />
              ))}
            </div>
          </div>

          {/* Tips card */}
          <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios p-4">
            <p className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide mb-3">
              Quick Tips
            </p>
            <ul className="space-y-2">
              {[
                'Keep subject lines under 50 characters for full mobile preview',
                'Lowercase often outperforms title case — feels more like a personal email',
                'Test at least 2–3 subject lines before concluding what works',
                'A/B test question-based vs direct lines first — the difference is often significant',
              ].map((tip) => (
                <li key={tip} className="flex gap-2.5 text-[14px] text-ios-text dark:text-white">
                  <span className="text-ios-blue flex-shrink-0 font-medium">›</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
