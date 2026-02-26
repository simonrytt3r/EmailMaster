'use client';

import { useState, useRef, useCallback } from 'react';
import EmailInput from '@/components/EmailInput';
import ContextFields from '@/components/ContextFields';
import ScoreCard from '@/components/ScoreCard';
import LoadingState from '@/components/LoadingState';
import ProspectResearch from '@/components/ProspectResearch';
import { AnalysisResult, EmailContext, ResearchResult } from '@/lib/types';

const COOLDOWN_MS = 5000;

export default function AnalyzePage() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [context, setContext] = useState<EmailContext>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamBuffer, setStreamBuffer] = useState('');
  const lastRequestTime = useRef<number>(0);

  // Research state
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [selectedHooks, setSelectedHooks] = useState<string[]>([]);

  const handleResearchChange = useCallback(
    (research: ResearchResult | null, hooks: string[]) => {
      setResearchResult(research);
      setSelectedHooks(hooks);
    },
    []
  );

  const handleAnalyze = async () => {
    if (!body.trim()) {
      setError('Please paste your email body before analyzing.');
      return;
    }

    const email = subject.trim()
      ? `Subject: ${subject.trim()}\n\n${body.trim()}`
      : body.trim();

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

    // Build enriched context including research if available
    const enrichedContext: EmailContext = {
      ...context,
      ...(researchResult
        ? {
            additionalContext: [
              context.additionalContext,
              `PROSPECT RESEARCH:\n${JSON.stringify(researchResult, null, 2)}`,
              selectedHooks.length > 0
                ? `SELECTED PERSONALIZATION HOOKS:\n${selectedHooks.join('\n')}`
                : '',
            ]
              .filter(Boolean)
              .join('\n\n'),
          }
        : {}),
    };

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, context: enrichedContext }),
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
              if (data.error) throw new Error(data.error);
              if (data.chunk) setStreamBuffer((prev) => prev + data.chunk);
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
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-[28px] font-bold text-ios-text dark:text-white tracking-tight">
          Email Analyzer
        </h1>
        <p className="text-[15px] text-ios-text-2 mt-1 leading-relaxed">
          Paste your cold email and get a comprehensive scorecard with specific improvements.
        </p>
      </div>

      {/* Step 1: Research (optional) */}
      <ProspectResearch onResearchChange={handleResearchChange} />

      {/* Step 2: Email input */}
      <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios overflow-hidden">
        {/* Step indicator */}
        <div className="px-4 pt-3.5 pb-0 flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-tt-green text-white text-[11px] font-bold flex-shrink-0">
            2
          </span>
          <span className="text-[15px] font-medium text-ios-text dark:text-white">
            Paste Your Email
          </span>
          {researchResult && (
            <span className="text-[12px] text-ios-green font-medium ml-auto">
              Research context attached ✓
            </span>
          )}
        </div>

        {/* Subject line row */}
        <div className="px-4 py-3 mt-3 border-b border-ios-sep/20 dark:border-ios-dark-sep/60">
          <label className="block text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide mb-2">
            Subject Line
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., quick question about [Company]'s field maintenance"
            className="w-full text-[15px] bg-transparent text-ios-text dark:text-white placeholder-ios-text-3 dark:placeholder-ios-text-2 focus:outline-none font-mono"
          />
        </div>

        {/* Body row */}
        <div className="p-4 space-y-4">
          <EmailInput
            value={body}
            onChange={setBody}
            label="Email Body"
            placeholder={`Hi [First Name],\n\nSaw that [Company] just expanded to a second facility — congrats.\n\nManaging turf at that scale typically means [pain point]. We help facilities like yours [specific outcome] without [common obstacle].\n\nWould it be worth a quick conversation?\n\n[Your Name]`}
            rows={10}
          />
          <ContextFields value={context} onChange={setContext} />
        </div>

        {/* Error + button */}
        <div className="px-4 pb-4 space-y-3">
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
            onClick={handleAnalyze}
            disabled={loading || !body.trim()}
            className="w-full h-[50px] bg-tt-green disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-ios text-[17px] shadow-tt-green transition-all duration-150 ease-out active:scale-[0.97] hover:bg-tt-green/90"
          >
            {loading ? 'Analyzing...' : 'Analyze Email'}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios">
          <LoadingState />
        </div>
      )}

      {/* Streaming preview */}
      {loading && streamBuffer && (
        <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios px-4 py-3">
          <p className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide mb-2">
            Processing
          </p>
          <pre className="text-[12px] text-ios-text-2 whitespace-pre-wrap font-mono max-h-24 overflow-hidden">
            {streamBuffer.slice(-400)}
          </pre>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-1">
          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-ios-sep/40 dark:bg-ios-dark-sep" />
            <span className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide">
              Analysis Results
            </span>
            <div className="h-px flex-1 bg-ios-sep/40 dark:bg-ios-dark-sep" />
          </div>
          <ScoreCard result={result} />
        </div>
      )}
    </div>
  );
}
