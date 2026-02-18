'use client';

import { useState } from 'react';
import { EmailContext } from '@/lib/types';

interface ContextFieldsProps {
  value: EmailContext;
  onChange: (context: EmailContext) => void;
}

export default function ContextFields({ value, onChange }: ContextFieldsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const update = (field: keyof EmailContext, val: string) => {
    onChange({ ...value, [field]: val });
  };

  const hasContent = Object.values(value).some((v) => v && v.trim().length > 0);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Add Context (optional — improves analysis accuracy)
          {hasContent && (
            <span className="px-1.5 py-0.5 text-xs bg-turf-green text-white rounded-full">
              Active
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 grid grid-cols-2 gap-4 bg-white dark:bg-gray-950">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Target Persona / Job Title
            </label>
            <input
              type="text"
              value={value.targetPersona || ''}
              onChange={(e) => update('targetPersona', e.target.value)}
              placeholder="e.g., Athletic Director, Facility Manager"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-turf-green focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Industry / Vertical
            </label>
            <input
              type="text"
              value={value.industry || ''}
              onChange={(e) => update('industry', e.target.value)}
              placeholder="e.g., Youth Soccer, K-12 Schools"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-turf-green focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Company Size
            </label>
            <select
              value={value.companySize || ''}
              onChange={(e) => update('companySize', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-turf-green focus:border-transparent"
            >
              <option value="">Select size...</option>
              <option value="Small">Small</option>
              <option value="Mid-market">Mid-market</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Goal of the Email
            </label>
            <select
              value={value.emailGoal || ''}
              onChange={(e) => update('emailGoal', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-turf-green focus:border-transparent"
            >
              <option value="">Select goal...</option>
              <option value="Book a demo">Book a demo</option>
              <option value="Get a reply">Get a reply</option>
              <option value="Drive to landing page">Drive to landing page</option>
              <option value="Re-engage">Re-engage</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Email Type
            </label>
            <select
              value={value.emailType || ''}
              onChange={(e) => update('emailType', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-turf-green focus:border-transparent"
            >
              <option value="">Select type...</option>
              <option value="Cold outreach (1st touch)">Cold outreach (1st touch)</option>
              <option value="Follow-up (2nd-3rd touch)">Follow-up (2nd-3rd touch)</option>
              <option value="Demo invitation">Demo invitation</option>
              <option value="Re-engagement">Re-engagement</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Additional Context
            </label>
            <textarea
              value={value.additionalContext || ''}
              onChange={(e) => update('additionalContext', e.target.value)}
              placeholder="Any other relevant info about the recipient, their company, or your offer..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-turf-green focus:border-transparent resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
