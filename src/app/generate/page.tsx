'use client';

import { useState, useRef } from 'react';
import ScoreCard from '@/components/ScoreCard';
import LoadingState from '@/components/LoadingState';
import CopyButton from '@/components/CopyButton';
import { GenerateResult, EmailVariation, AnalysisResult } from '@/lib/types';

const COOLDOWN_MS = 5000;

interface RefinedEmail {
  subject: string;
  body: string;
  scores: AnalysisResult;
}

interface VariationCardProps {
  variation: EmailVariation;
  onRefine: (email: string, label: string) => void;
}

function VariationCard({ variation, onRefine }: VariationCardProps) {
  const [showScorecard, setShowScorecard] = useState(false);
  const emailText = `Subject: ${variation.subject}\n\n${variation.body}`;

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-turf-green uppercase tracking-wide">
              {variation.label}
            </span>
            {variation.scores && (
              <span className="ml-2 text-xs text-gray-500">
                Score: {variation.scores.overallScore}/100
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CopyButton text={emailText} />
            <button
              onClick={() => setShowScorecard(!showScorecard)}
              className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {showScorecard ? 'Hide Scorecard' : 'View Scorecard'}
            </button>
            <button
              onClick={() => onRefine(emailText, variation.label)}
              className="px-3 py-1.5 text-xs bg-turf-green text-white rounded-md hover:bg-turf-green-dark transition-colors"
            >
              Refine This One
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <div className="text-sm">
          <span className="text-gray-400 dark:text-gray-500 font-medium">Subject: </span>
          <span className="text-gray-900 dark:text-gray-100 font-medium">{variation.subject}</span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
            {variation.body}
          </pre>
        </div>
      </div>

      {showScorecard && variation.scores && (
        <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-800 pt-4">
          <ScoreCard result={variation.scores} compact={false} />
        </div>
      )}
    </div>
  );
}

interface RefineModalProps {
  email: string;
  label: string;
  onClose: () => void;
  onRefined: (result: RefinedEmail) => void;
}

function RefineModal({ email, label, onClose, onRefined }: RefineModalProps) {
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefine = async () => {
    if (!instructions.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refine: { email, instructions },
          emailType: 'refine',
          offering: '',
          targetPersona: '',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to refine email');
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
              if (data.done && data.result?.refined) {
                onRefined(data.result.refined);
                onClose();
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Refine Email</h3>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Refinement Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Make the subject line more curiosity-driven, soften the CTA, remove the second paragraph..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-turf-green resize-none"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <button
            onClick={handleRefine}
            disabled={loading || !instructions.trim()}
            className="w-full py-2.5 bg-turf-green hover:bg-turf-green-dark disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            {loading ? 'Refining...' : 'Refine Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  const [emailType, setEmailType] = useState('Cold outreach (1st touch)');
  const [offering, setOffering] = useState('');
  const [targetPersona, setTargetPersona] = useState('');
  const [industry, setIndustry] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [differentiator, setDifferentiator] = useState('');
  const [desiredCTA, setDesiredCTA] = useState('');
  const [tone, setTone] = useState('');
  const [mustInclude, setMustInclude] = useState('');
  const [previousEmail, setPreviousEmail] = useState('');
  const [showOptional, setShowOptional] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refineModal, setRefineModal] = useState<{ email: string; label: string } | null>(null);
  const [refinedEmail, setRefinedEmail] = useState<RefinedEmail | null>(null);
  const lastRequestTime = useRef<number>(0);

  const handleGenerate = async () => {
    if (!offering.trim() || !targetPersona.trim()) {
      setError('Please fill in what you\'re selling and the target persona.');
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
    setRefinedEmail(null);
    lastRequestTime.current = now;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType,
          offering,
          targetPersona,
          industry,
          painPoints,
          differentiator,
          desiredCTA,
          tone,
          mustInclude,
          previousEmail,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate emails');
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

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-turf-green focus:border-transparent";
  const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Generator</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Generate 3 high-scoring email variations — each with a different approach and instant scorecard.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-5">
        {/* Required fields */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelClass}>Email Type *</label>
            <select
              value={emailType}
              onChange={(e) => setEmailType(e.target.value)}
              className={inputClass}
            >
              <option>Cold outreach (1st touch)</option>
              <option>Follow-up (2nd-3rd touch)</option>
              <option>Demo invitation</option>
              <option>Re-engagement</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>What you&apos;re selling / offering *</label>
            <input
              type="text"
              value={offering}
              onChange={(e) => setOffering(e.target.value)}
              placeholder="e.g., Automated turf management software for sports facilities"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Target persona *</label>
            <input
              type="text"
              value={targetPersona}
              onChange={(e) => setTargetPersona(e.target.value)}
              placeholder="e.g., Athletic Directors at mid-size universities managing multiple fields"
              className={inputClass}
            />
          </div>
        </div>

        {/* Optional fields */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Optional context (improves quality)
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${showOptional ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showOptional && (
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Industry / Vertical</label>
                <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g., K-12 Schools, Youth Soccer" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tone Preference</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)} className={inputClass}>
                  <option value="">Any</option>
                  <option>Casual</option>
                  <option>Professional</option>
                  <option>Bold</option>
                  <option>Consultative</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Known Pain Points</label>
                <input type="text" value={painPoints} onChange={(e) => setPainPoints(e.target.value)} placeholder="e.g., High maintenance costs, scheduling chaos" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Key Differentiator / Proof Point</label>
                <input type="text" value={differentiator} onChange={(e) => setDifferentiator(e.target.value)} placeholder="e.g., Cut maintenance time by 60% at Ohio State" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Desired CTA</label>
                <input type="text" value={desiredCTA} onChange={(e) => setDesiredCTA(e.target.value)} placeholder="e.g., Ask if worth a 10-min call" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Must-Include Details</label>
                <input type="text" value={mustInclude} onChange={(e) => setMustInclude(e.target.value)} placeholder="e.g., Mention our new mobile app feature" className={inputClass} />
              </div>
              {(emailType === 'Follow-up (2nd-3rd touch)' || emailType === 'Re-engagement') && (
                <div className="col-span-2">
                  <label className={labelClass}>Previous Email (paste for continuity)</label>
                  <textarea
                    value={previousEmail}
                    onChange={(e) => setPreviousEmail(e.target.value)}
                    placeholder="Paste the previous email you sent..."
                    rows={4}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              )}
            </div>
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
          disabled={loading || !offering.trim() || !targetPersona.trim()}
          className="w-full py-3 px-6 bg-turf-green hover:bg-turf-green-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
        >
          {loading ? 'Generating 3 variations...' : 'Generate Email Variations'}
        </button>
      </div>

      {loading && <LoadingState message="Generating 3 email variations with scorecards..." />}

      {result && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2">Generated Variations</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>
          {result.variations.map((variation) => (
            <VariationCard
              key={variation.label}
              variation={variation}
              onRefine={(email, label) => setRefineModal({ email, label })}
            />
          ))}
        </div>
      )}

      {refinedEmail && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2">Refined Version</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="border border-turf-green/30 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-turf-green uppercase tracking-wide">Refined Email</span>
                <CopyButton text={`Subject: ${refinedEmail.subject}\n\n${refinedEmail.body}`} />
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-sm">
                <span className="text-gray-400 font-medium">Subject: </span>
                <span className="text-gray-900 dark:text-gray-100 font-medium">{refinedEmail.subject}</span>
              </div>
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                {refinedEmail.body}
              </pre>
            </div>
            {refinedEmail.scores && (
              <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-800 pt-4">
                <ScoreCard result={refinedEmail.scores} />
              </div>
            )}
          </div>
        </div>
      )}

      {refineModal && (
        <RefineModal
          email={refineModal.email}
          label={refineModal.label}
          onClose={() => setRefineModal(null)}
          onRefined={setRefinedEmail}
        />
      )}
    </div>
  );
}
