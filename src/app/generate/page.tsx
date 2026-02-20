'use client';

import { useState, useRef, useCallback } from 'react';
import ScoreCard from '@/components/ScoreCard';
import LoadingState from '@/components/LoadingState';
import CopyButton from '@/components/CopyButton';
import ProspectResearch from '@/components/ProspectResearch';
import { GenerateResult, EmailVariation, AnalysisResult, ResearchResult } from '@/lib/types';

const COOLDOWN_MS = 5000;

interface RefinedEmail {
  subject: string;
  body: string;
  scores: AnalysisResult;
}

const inputClass =
  'w-full px-3 py-2.5 text-[15px] rounded-ios-sm bg-ios-bg dark:bg-ios-dark-secondary text-ios-text dark:text-white placeholder-ios-text-3 dark:placeholder-ios-text-2 focus:outline-none focus:ring-2 focus:ring-ios-blue/40 transition-shadow duration-150';
const labelClass = 'block text-[12px] font-medium text-ios-text-2 uppercase tracking-wide mb-1.5';

// ─── Variation Card ───────────────────────────────────────────────────────────
interface VariationCardProps {
  variation: EmailVariation;
  onRefine: (email: string, label: string) => void;
}

function VariationCard({ variation, onRefine }: VariationCardProps) {
  const [showScorecard, setShowScorecard] = useState(false);
  const emailText = `Subject: ${variation.subject}\n\n${variation.body}`;

  return (
    <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios overflow-hidden ios-card-hover flex flex-col">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-ios-sep/20 dark:border-ios-dark-sep/60 bg-ios-bg dark:bg-ios-dark-secondary">
        <div className="flex items-center justify-between gap-2">
          <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-ios-blue/10 text-ios-blue">
            {variation.label}
          </span>
          {variation.scores && (
            <span className="text-[12px] text-ios-text-2 font-medium tabular-nums">
              {variation.scores.overallScore}/100
            </span>
          )}
        </div>
      </div>

      {/* Email content */}
      <div className="p-4 space-y-3 flex-1">
        <p className="text-[13px]">
          <span className="text-ios-text-2 font-medium">Subject: </span>
          <span className="text-ios-text dark:text-white font-semibold">{variation.subject}</span>
        </p>
        <div className="bg-ios-bg dark:bg-ios-dark-secondary rounded-ios-sm p-3">
          <pre className="text-[13px] text-ios-text dark:text-white whitespace-pre-wrap font-sans leading-relaxed">
            {variation.body}
          </pre>
        </div>
      </div>

      {/* Action row */}
      <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
        <CopyButton text={emailText} label="Copy" />
        <button
          onClick={() => setShowScorecard(!showScorecard)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium bg-ios-secondary dark:bg-ios-dark-secondary text-ios-text-2 hover:text-ios-text dark:hover:text-white transition-colors duration-150"
        >
          {showScorecard ? 'Hide Scores' : 'View Scores'}
        </button>
        <button
          onClick={() => onRefine(emailText, variation.label)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium bg-ios-blue/10 text-ios-blue hover:bg-ios-blue/15 transition-colors duration-150"
        >
          Refine
        </button>
      </div>

      {/* Scorecard */}
      {showScorecard && variation.scores && (
        <div className="px-4 pb-4 border-t border-ios-sep/20 dark:border-ios-dark-sep/60 pt-4">
          <ScoreCard result={variation.scores} compact={false} />
        </div>
      )}
    </div>
  );
}

// ─── Refine Modal ─────────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-ios-dark-card rounded-ios-lg w-full max-w-lg shadow-ios-md">
        {/* Header */}
        <div className="px-5 py-4 border-b border-ios-sep/20 dark:border-ios-dark-sep/60 flex items-center justify-between">
          <div>
            <h3 className="text-[17px] font-semibold text-ios-text dark:text-white">Refine Email</h3>
            <p className="text-[13px] text-ios-text-2 mt-0.5">{label}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-ios-secondary dark:bg-ios-dark-secondary text-ios-text-2 hover:text-ios-text dark:hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Refinement Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Make the subject line more curiosity-driven, soften the CTA, shorten the body..."
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>

          {error && (
            <p className="text-[13px] text-ios-red">{error}</p>
          )}

          <button
            onClick={handleRefine}
            disabled={loading || !instructions.trim()}
            className="w-full h-[50px] bg-ios-blue disabled:opacity-40 text-white font-semibold rounded-ios text-[17px] shadow-ios-blue transition-all duration-150 ease-out active:scale-[0.97]"
          >
            {loading ? 'Refining...' : 'Refine Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Generate Page ────────────────────────────────────────────────────────────
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

  const handleGenerate = async () => {
    if (!offering.trim() || !targetPersona.trim()) {
      setError("Please fill in what you're selling and the target persona.");
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
      // Append research to mustInclude if available
      const researchContext = researchResult
        ? [
            mustInclude,
            `PROSPECT RESEARCH:\n${JSON.stringify(researchResult, null, 2)}`,
            selectedHooks.length > 0
              ? `SELECTED PERSONALIZATION HOOKS (use 1-2 naturally in the email):\n${selectedHooks.join('\n')}`
              : '',
          ]
            .filter(Boolean)
            .join('\n\n')
        : mustInclude;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType, offering, targetPersona, industry,
          painPoints, differentiator, desiredCTA, tone,
          mustInclude: researchContext,
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold text-ios-text dark:text-white tracking-tight">
          Email Generator
        </h1>
        <p className="text-[15px] text-ios-text-2 mt-1 leading-relaxed">
          Generate 3 high-scoring variations — each with a different approach and instant scorecard.
        </p>
      </div>

      {/* Step 1: Research (optional) */}
      <ProspectResearch onResearchChange={handleResearchChange} />

      {/* Step 2: Form card */}
      <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios overflow-hidden">
        {/* Step indicator */}
        <div className="px-4 pt-3.5 pb-0 flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-ios-blue text-white text-[11px] font-bold flex-shrink-0">
            2
          </span>
          <span className="text-[15px] font-medium text-ios-text dark:text-white">
            Configure Your Email
          </span>
          {researchResult && (
            <span className="text-[12px] text-ios-green font-medium ml-auto">
              Research context attached ✓
            </span>
          )}
        </div>
        <div className="p-4 pt-3 space-y-4">
          {/* Required fields */}
          <div>
            <label className={labelClass}>Email Type</label>
            <select value={emailType} onChange={(e) => setEmailType(e.target.value)} className={inputClass}>
              <option>Cold outreach (1st touch)</option>
              <option>Follow-up (2nd-3rd touch)</option>
              <option>Demo invitation</option>
              <option>Re-engagement</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>What you&apos;re selling *</label>
            <input
              type="text"
              value={offering}
              onChange={(e) => setOffering(e.target.value)}
              placeholder="e.g., Automated turf management software for sports facilities"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Target Persona *</label>
            <input
              type="text"
              value={targetPersona}
              onChange={(e) => setTargetPersona(e.target.value)}
              placeholder="e.g., Athletic Directors at mid-size universities managing multiple fields"
              className={inputClass}
            />
          </div>
        </div>

        {/* Optional fields disclosure */}
        <div className="border-t border-ios-sep/20 dark:border-ios-dark-sep/60">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-ios-bg dark:hover:bg-ios-dark-secondary transition-colors duration-150 text-left"
          >
            <span className="text-[15px] font-medium text-ios-text dark:text-white">
              Optional context
              <span className="text-[13px] font-normal text-ios-text-2 ml-2">— improves quality</span>
            </span>
            <svg
              className={`w-4 h-4 text-ios-text-2 transition-transform duration-300 ease-ios flex-shrink-0 ${showOptional ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {showOptional && (
            <div className="expand-enter px-4 pb-4 grid grid-cols-2 gap-4 border-t border-ios-sep/20 dark:border-ios-dark-sep/60">
              <div className="pt-4">
                <label className={labelClass}>Industry</label>
                <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g., K-12 Schools" className={inputClass} />
              </div>
              <div className="pt-4">
                <label className={labelClass}>Tone</label>
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
                <input type="text" value={painPoints} onChange={(e) => setPainPoints(e.target.value)} placeholder="e.g., High maintenance costs" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Key Differentiator</label>
                <input type="text" value={differentiator} onChange={(e) => setDifferentiator(e.target.value)} placeholder="e.g., Cut time by 60% at Ohio State" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Desired CTA</label>
                <input type="text" value={desiredCTA} onChange={(e) => setDesiredCTA(e.target.value)} placeholder="e.g., Ask if worth a 10-min call" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Must-Include Details</label>
                <input type="text" value={mustInclude} onChange={(e) => setMustInclude(e.target.value)} placeholder="e.g., Mention our new mobile app" className={inputClass} />
              </div>
              {(emailType === 'Follow-up (2nd-3rd touch)' || emailType === 'Re-engagement') && (
                <div className="col-span-2">
                  <label className={labelClass}>Previous Email</label>
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

        {/* Error + Button */}
        <div className="p-4 border-t border-ios-sep/20 dark:border-ios-dark-sep/60 space-y-3">
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
            disabled={loading || !offering.trim() || !targetPersona.trim()}
            className="w-full h-[50px] bg-ios-blue disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-ios text-[17px] shadow-ios-blue transition-all duration-150 ease-out active:scale-[0.97] hover:bg-ios-blue/90"
          >
            {loading ? 'Generating 3 variations...' : 'Generate Email Variations'}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios">
          <LoadingState message="Generating 3 email variations with scorecards..." />
        </div>
      )}

      {/* Generated variations */}
      {result && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-ios-sep/40 dark:bg-ios-dark-sep" />
            <span className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide">
              Generated Variations
            </span>
            <div className="h-px flex-1 bg-ios-sep/40 dark:bg-ios-dark-sep" />
          </div>

          <div className="space-y-4">
            {result.variations.map((variation) => (
              <VariationCard
                key={variation.label}
                variation={variation}
                onRefine={(e, l) => setRefineModal({ email: e, label: l })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Refined email */}
      {refinedEmail && !loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-ios-sep/40 dark:bg-ios-dark-sep" />
            <span className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide">
              Refined Version
            </span>
            <div className="h-px flex-1 bg-ios-sep/40 dark:bg-ios-dark-sep" />
          </div>
          <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios overflow-hidden ios-card-hover"
            style={{ borderColor: 'rgba(0,122,255,0.3)', borderWidth: 1 }}>
            <div className="px-4 py-3 border-b border-ios-sep/20 dark:border-ios-dark-sep/60 flex items-center justify-between bg-ios-bg dark:bg-ios-dark-secondary">
              <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-ios-blue/10 text-ios-blue">
                Refined Email
              </span>
              <CopyButton text={`Subject: ${refinedEmail.subject}\n\n${refinedEmail.body}`} label="Copy" />
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[13px]">
                <span className="text-ios-text-2 font-medium">Subject: </span>
                <span className="text-ios-text dark:text-white font-semibold">{refinedEmail.subject}</span>
              </p>
              <pre className="text-[14px] text-ios-text dark:text-white whitespace-pre-wrap font-sans leading-relaxed bg-ios-bg dark:bg-ios-dark-secondary rounded-ios-sm p-3">
                {refinedEmail.body}
              </pre>
            </div>
            {refinedEmail.scores && (
              <div className="px-4 pb-4 border-t border-ios-sep/20 dark:border-ios-dark-sep/60 pt-4">
                <ScoreCard result={refinedEmail.scores} compact={false} />
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
