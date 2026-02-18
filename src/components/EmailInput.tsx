'use client';

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
  const defaultPlaceholder = `Subject: quick question about [Company]'s field maintenance

Hi [First Name],

Saw that [Company] just expanded to a second facility — congrats.

Managing turf at that scale typically means [pain point]. We help facilities like yours [specific outcome] without [common obstacle].

Would it be worth a quick conversation?

[Your Name]`;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || defaultPlaceholder}
          rows={rows}
          className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-turf-green focus:border-transparent resize-none font-mono leading-relaxed"
        />
        {value && (
          <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-600">
            {value.split(/\s+/).filter(Boolean).length} words
          </div>
        )}
      </div>
    </div>
  );
}
