'use client';

import { useState } from 'react';
import { AnalysisResult, CategoryScore } from '@/lib/types';
import ScoreBadge, { OverallScoreBadge } from './ScoreBadge';
import CopyButton from './CopyButton';

interface ScoreCardProps {
  result: AnalysisResult;
  compact?: boolean;
}

function CategoryRow({ category }: { category: CategoryScore }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ios-bg dark:hover:bg-ios-dark-secondary transition-colors duration-150 text-left"
      >
        <ScoreBadge score={category.score} size="sm" />
        <span className="flex-1 text-[15px] font-medium text-ios-text dark:text-white">
          {category.name}
        </span>
        <svg
          className={`w-4 h-4 text-ios-text-2 transition-transform duration-300 ease-ios flex-shrink-0 ${
            expanded ? 'rotate-90' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {expanded && (
        <div className="expand-enter px-4 pb-4 pt-2 space-y-3 border-t border-ios-sep/20 dark:border-ios-dark-sep/60">
          {category.strengths && (
            <div className="flex gap-3 pt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-ios-green flex-shrink-0 mt-1.5" />
              <div>
                <p className="text-[11px] font-semibold text-ios-green mb-0.5 uppercase tracking-wide">
                  What&apos;s working
                </p>
                <p className="text-[14px] text-ios-text dark:text-white leading-relaxed">
                  {category.strengths}
                </p>
              </div>
            </div>
          )}

          {category.improvements && (
            <div className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-ios-red flex-shrink-0 mt-1.5" />
              <div>
                <p className="text-[11px] font-semibold text-ios-red mb-0.5 uppercase tracking-wide">
                  What to improve
                </p>
                <p className="text-[14px] text-ios-text dark:text-white leading-relaxed">
                  {category.improvements}
                </p>
              </div>
            </div>
          )}

          {category.rewriteSuggestion && (
            <div
              style={{ backgroundColor: 'rgba(0, 122, 255, 0.07)' }}
              className="rounded-ios-sm px-3 py-2.5"
            >
              <p className="text-[11px] font-semibold text-ios-blue mb-1 uppercase tracking-wide">
                Rewrite suggestion
              </p>
              <p className="text-[14px] text-ios-text dark:text-white italic leading-relaxed">
                &ldquo;{category.rewriteSuggestion}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScoreCard({ result, compact = false }: ScoreCardProps) {
  const emailText = `Subject: ${result.rewrittenEmail.subject}\n\n${result.rewrittenEmail.body}`;

  return (
    <div className="space-y-4">
      {/* Overall Score Card */}
      <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios p-6 ios-card-hover">
        <div className="flex items-center gap-6">
          <OverallScoreBadge score={result.overallScore} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide mb-2">
              Overall Score
            </p>
            {result.topThreeChanges && (
              <>
                <p className="text-[12px] font-medium text-ios-text-2 mb-1">Top 3 changes:</p>
                <p className="text-[14px] text-ios-text dark:text-white leading-relaxed">
                  {result.topThreeChanges}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {!compact && result.categories.length > 0 && (
        <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios overflow-hidden ios-card-hover">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide">
              Category Breakdown
            </p>
          </div>
          <div className="divide-y divide-ios-sep/20 dark:divide-ios-dark-sep/60">
            {result.categories.map((cat) => (
              <CategoryRow key={cat.name} category={cat} />
            ))}
          </div>
        </div>
      )}

      {/* Compact category grid */}
      {compact && (
        <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios p-4">
          <p className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide mb-3">
            Score Breakdown
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {result.categories.map((cat) => (
              <div key={cat.name} className="flex flex-col items-center gap-1.5">
                <ScoreBadge score={cat.score} size="sm" />
                <span className="text-[10px] text-ios-text-2 text-center leading-tight">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rewritten Email */}
      {!compact && result.rewrittenEmail && (
        <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios overflow-hidden ios-card-hover">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ios-sep/20 dark:border-ios-dark-sep/60">
            <p className="text-[11px] font-semibold text-ios-text-2 uppercase tracking-wide">
              Rewritten Email
            </p>
            <CopyButton text={emailText} label="Copy" />
          </div>
          <div className="px-4 py-2.5 border-b border-ios-sep/10 dark:border-ios-dark-sep/40 bg-ios-bg dark:bg-ios-dark-secondary">
            <p className="text-[13px]">
              <span className="text-ios-text-2 font-medium">Subject: </span>
              <span className="text-ios-text dark:text-white font-semibold">
                {result.rewrittenEmail.subject}
              </span>
            </p>
          </div>
          <div className="px-4 py-4">
            <pre className="text-[14px] text-ios-text dark:text-white whitespace-pre-wrap font-sans leading-relaxed">
              {result.rewrittenEmail.body}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
