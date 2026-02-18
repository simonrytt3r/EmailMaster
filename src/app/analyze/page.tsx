'use client';

import { useState, useRef } from 'react';
import EmailInput from '@/components/EmailInput';
import ContextFields from '@/components/ContextFields';
import ScoreCard from '@/components/ScoreCard';
import LoadingState from '@/components/LoadingState';
import { AnalysisResult, EmailContext } from '@/lib/types';

const COOLDOWN_MS = 5000;

export default function AnalyzePage() {
  const [email, setEmail] = useState('');
  const [context, setContext] = useState<EmailContext>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamBuffer, setStreamBuffer] = useState('');
  const lastRequestTime = useRef<number>(0);

  const handleAnalyze = async () => {
    if (!email.trim()) {
      setError('Please paste your email before analyzing.');
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - lastRequestTime.current;
    if (timeSinceLast < COOLDOWN_MS && lastRequestTime.current > 0) {
      setError(`Please wait ${Math.ceil((COOLDOWN_MS - timeSinceLast) / 1000)} seconds before analyzing again.`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setStreamBuffer('');
    lastRequestTime.current = now;

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, context }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze email');
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
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.chunk) {
                setStreamBuffer((prev) => prev + data.chunk);
              }
              if (data.done && data.result) {
                setResult(data.result);
                setStreamBuffer('');
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Analyzer</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Paste your cold email and get a comprehensive scorecard with specific improvements.
        </p>
      </div>

      {/* Input */}
      <div className="space-y-4">
        <EmailInput
          value={email}
          onChange={setEmail}
          label="Your Email Draft"
        />
        <ContextFields value={context} onChange={setContext} />

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !email.trim()}
          className="w-full py-3 px-6 bg-turf-green hover:bg-turf-green-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
        >
          {loading ? 'Analyzing...' : 'Analyze Email'}
        </button>
      </div>

      {/* Loading */}
      {loading && <LoadingState />}

      {/* Streaming preview */}
      {loading && streamBuffer && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Processing...</p>
          <pre className="text-xs text-gray-500 dark:text-gray-500 whitespace-pre-wrap font-mono max-h-32 overflow-hidden">
            {streamBuffer.slice(-500)}
          </pre>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2">Analysis Results</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>
          <ScoreCard result={result} />
        </div>
      )}
    </div>
  );
}
