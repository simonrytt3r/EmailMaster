'use client';

import { useState } from 'react';
import { AnalysisResult, CategoryScore } from '@/lib/types';
import ScoreBadge, { OverallScoreBadge } from './ScoreBadge';
import CopyButton from './CopyButton';

interface ScoreCardProps {
  result: AnalysisResult;
  compact?: boolean;
}

function CategoryRow({ category, defaultExpanded = false }: { category: CategoryScore; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
      >
        <ScoreBadge score={category.score} size="sm" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {category.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                category.score >= 8
                  ? 'bg-green-400'
                  : category.score >= 6
                  ? 'bg-yellow-400'
                  : 'bg-red-400'
              }`}
              style={{ width: `${category.score * 10}%` }}
            />
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800 space-y-3">
          {category.strengths && (
            <div className="flex gap-2">
              <div className="w-4 h-4 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-0.5">What&apos;s working</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{category.strengths}</p>
              </div>
            </div>
          )}

          {category.improvements && (
            <div className="flex gap-2">
              <div className="w-4 h-4 rounded-full bg-red-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-0.5">What needs improvement</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{category.improvements}</p>
              </div>
            </div>
          )}

          {category.rewriteSuggestion && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-0.5">Rewrite suggestion</p>
              <p className="text-sm text-blue-800 dark:text-blue-200 italic">&ldquo;{category.rewriteSuggestion}&rdquo;</p>
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
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="flex items-center gap-6 p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <OverallScoreBadge score={result.overallScore} />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Overall Score
          </h3>
          {result.topThreeChanges && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                Top 3 changes to make
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {result.topThreeChanges}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Category Scores */}
      {!compact && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Category Breakdown
          </h4>
          <div className="space-y-2">
            {result.categories.map((cat) => (
              <CategoryRow key={cat.name} category={cat} />
            ))}
          </div>
        </div>
      )}

      {compact && (
        <div className="grid grid-cols-2 gap-2">
          {result.categories.map((cat) => (
            <div
              key={cat.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800"
            >
              <ScoreBadge score={cat.score} size="sm" />
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{cat.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Rewritten Email */}
      {!compact && result.rewrittenEmail && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Rewritten Email
            </h4>
            <CopyButton text={emailText} label="Copy Email" />
          </div>
          <div className="bg-gray-900 dark:bg-gray-950 rounded-xl border border-gray-700 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-700 dark:border-gray-800">
              <p className="text-xs text-gray-400">
                <span className="text-gray-500">Subject: </span>
                <span className="text-white font-medium">{result.rewrittenEmail.subject}</span>
              </p>
            </div>
            <div className="px-4 py-4">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {result.rewrittenEmail.body}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
