'use client';

import { useState, useRef } from 'react';
import LoadingState from '@/components/LoadingState';
import CopyButton from '@/components/CopyButton';
import { SubjectLine, SubjectLinesResult } from '@/lib/types';

const COOLDOWN_MS = 5000;

const STYLE_COLORS: Record<string, string> = {
  'Question-based': 'text-blue-500 bg-blue-500/10',
  'Curiosity/intrigue': 'text-purple-500 bg-purple-500/10',
  'Direct/benefit-led': 'text-green-500 bg-green-500/10',
  'Personalized': 'text-orange-500 bg-orange-500/10',
  'Pattern interrupt': 'text-pink-500 bg-pink-500/10',
};

function SpamMeter({ score, level }: { score: number; level: string }) {
  const colors = {
    low: 'bg-green-400',
    medium: 'bg-yellow-400',
    high: 'bg-red-400',
  };

  const textColors = {
    low: 'text-green-500',
    medium: 'text-yellow-500',
    high: 'text-red-500',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colors[level as keyof typeof colors] || 'bg-gray-400'}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <span className={`text-xs font-medium capitalize ${textColors[level as keyof typeof textColors] || 'text-gray-400'}`}>
        {level}
      </span>
    </div>
  );
}

function SubjectLineRow({ line }: { line: SubjectLine }) {
  const styleColor = Object.entries(STYLE_COLORS).find(([key]) =>
    line.style.toLowerCase().includes(key.toLowerCase())
  )?.[1] || 'text-gray-500 bg-gray-500/10';

  return (
    <div className="flex items-center gap-4 px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {line.text}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${styleColor}`}>
          {line.style}
        </span>
        <div className="text-xs text-gray-400 dark:text-gray-500 text-right leading-tight">
          <div>{line.charCount} chars</div>
          <div>{line.wordCount} words</div>
        </div>
        <SpamMeter score={line.spamRiskScore} level={line.spamRisk} />
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={line.text} />
        </div>
      </div>
    </div>
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
              if (data.done && data.result) {
                setResult(data.result);
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
    }
  };

  const groupedByStyle = result?.subjectLines.reduce((acc, line) => {
    const style = line.style;
    if (!acc[style]) acc[style] = [];
    acc[style].push(line);
    return acc;
  }, {} as Record<string, SubjectLine[]>);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subject Line Generator</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Generate 10 subject line options across 5 styles — with character count and spam risk for each.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Body or Description
          </label>
          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            placeholder="Paste your email body, or just describe what the email is about. For example: 'Cold email to athletic directors at universities offering our turf maintenance software that helped Ohio State cut field maintenance costs by 40%'"
            rows={6}
            className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-turf-green focus:border-transparent resize-none"
          />
          {emailBody && (
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1 text-right">
              {emailBody.split(/\s+/).filter(Boolean).length} words
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !emailBody.trim()}
          className="w-full py-3 px-6 bg-turf-green hover:bg-turf-green-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
        >
          {loading ? 'Generating...' : 'Generate 10 Subject Lines'}
        </button>
      </div>

      {loading && <LoadingState message="Generating subject line variations..." />}

      {result && !loading && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2">
              {result.subjectLines.length} Subject Lines
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(STYLE_COLORS).map(([style, color]) => (
              <span key={style} className={`px-2 py-0.5 text-xs rounded-full font-medium ${color}`}>
                {style}
              </span>
            ))}
          </div>

          {/* Flat list */}
          <div className="space-y-2">
            {result.subjectLines.map((line, i) => (
              <SubjectLineRow key={i} line={line} />
            ))}
          </div>

          {/* Tips */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Quick Tips
            </h3>
            <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex gap-2">
                <span className="text-turf-green flex-shrink-0">→</span>
                Keep subject lines under 50 characters for full mobile preview
              </li>
              <li className="flex gap-2">
                <span className="text-turf-green flex-shrink-0">→</span>
                Lowercase often outperforms title case — feels more like a personal email
              </li>
              <li className="flex gap-2">
                <span className="text-turf-green flex-shrink-0">→</span>
                Test at least 2-3 subject lines before concluding what works
              </li>
              <li className="flex gap-2">
                <span className="text-turf-green flex-shrink-0">→</span>
                A/B test question-based vs direct lines first — the difference is often significant
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
