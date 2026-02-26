'use client';

import { useRef, useEffect } from 'react';

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
}

export default function EmailInput({
  value,
  onChange,
  placeholder,
  rows = 12,
  label,
}: EmailInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const defaultPlaceholder = `Subject: quick question about [Company]'s field maintenance

Hi [First Name],

Saw that [Company] just expanded to a second facility — congrats.

Managing turf at that scale typically means [pain point]. We help facilities like yours [specific outcome] without [common obstacle].

Would it be worth a quick conversation?

[Your Name]`;

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, rows * 24)}px`;
  }, [value, rows]);

  const wordCount = value.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-[13px] font-medium text-ios-text-2">
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || defaultPlaceholder}
          rows={rows}
          className="w-full px-4 py-3.5 text-[15px] rounded-ios bg-white dark:bg-ios-dark-card text-ios-text dark:text-white placeholder-ios-text-3 dark:placeholder-ios-text-2 font-mono leading-relaxed resize-none shadow-ios focus:outline-none focus:ring-2 focus:ring-tt-green/40 transition-shadow duration-150"
          style={{ minHeight: `${rows * 24}px` }}
        />
        {value && (
          <div className="absolute bottom-3 right-3 text-[11px] text-ios-text-3 tabular-nums pointer-events-none">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </div>
        )}
      </div>
    </div>
  );
}
