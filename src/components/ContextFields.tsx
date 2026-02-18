'use client';

import { useState } from 'react';
import { EmailContext } from '@/lib/types';

interface ContextFieldsProps {
  value: EmailContext;
  onChange: (context: EmailContext) => void;
}

const inputClass =
  'w-full px-3 py-2.5 text-[15px] rounded-ios-sm bg-white dark:bg-ios-dark-card text-ios-text dark:text-white placeholder-ios-text-3 dark:placeholder-ios-text-2 shadow-ios focus:outline-none focus:ring-2 focus:ring-ios-blue/40 transition-shadow duration-150';

const labelClass = 'block text-[12px] font-medium text-ios-text-2 mb-1.5 uppercase tracking-wide';

export default function ContextFields({ value, onChange }: ContextFieldsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const update = (field: keyof EmailContext, val: string) => {
    onChange({ ...value, [field]: val });
  };

  const hasContent = Object.values(value).some((v) => v && v.trim().length > 0);

  return (
    <div className="bg-white dark:bg-ios-dark-card rounded-ios shadow-ios overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors duration-150 hover:bg-ios-bg dark:hover:bg-ios-dark-secondary"
      >
        <span className="flex items-center gap-2 text-[15px] font-medium text-ios-text dark:text-white">
          Add Context
          <span className="text-[13px] font-normal text-ios-text-2">— optional, improves accuracy</span>
          {hasContent && (
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-ios-blue text-white rounded-full">
              Active
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-ios-text-2 transition-transform duration-300 ease-ios flex-shrink-0 ${
            isExpanded ? 'rotate-90' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="expand-enter border-t border-ios-sep/30 dark:border-ios-dark-sep">
          {/* Divider rows */}
          <div className="px-4 py-4 grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Target Persona</label>
              <input
                type="text"
                value={value.targetPersona || ''}
                onChange={(e) => update('targetPersona', e.target.value)}
                placeholder="e.g., Athletic Director"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Industry</label>
              <input
                type="text"
                value={value.industry || ''}
                onChange={(e) => update('industry', e.target.value)}
                placeholder="e.g., Youth Soccer, K-12"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Company Size</label>
              <select
                value={value.companySize || ''}
                onChange={(e) => update('companySize', e.target.value)}
                className={inputClass}
              >
                <option value="">Select size</option>
                <option>Small</option>
                <option>Mid-market</option>
                <option>Enterprise</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Email Goal</label>
              <select
                value={value.emailGoal || ''}
                onChange={(e) => update('emailGoal', e.target.value)}
                className={inputClass}
              >
                <option value="">Select goal</option>
                <option>Book a demo</option>
                <option>Get a reply</option>
                <option>Drive to landing page</option>
                <option>Re-engage</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Email Type</label>
              <select
                value={value.emailType || ''}
                onChange={(e) => update('emailType', e.target.value)}
                className={inputClass}
              >
                <option value="">Select type</option>
                <option>Cold outreach (1st touch)</option>
                <option>Follow-up (2nd-3rd touch)</option>
                <option>Demo invitation</option>
                <option>Re-engagement</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className={labelClass}>Additional Context</label>
              <textarea
                value={value.additionalContext || ''}
                onChange={(e) => update('additionalContext', e.target.value)}
                placeholder="Any other relevant info about the recipient, their company, or your offer..."
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
