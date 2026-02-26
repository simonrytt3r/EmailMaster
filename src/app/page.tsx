import Link from 'next/link';

const tools = [
  {
    href: '/generate',
    step: '01',
    label: 'Generate',
    headline: 'AI-personalized emails',
    description: 'Research your prospect, then generate hyper-personalized cold emails with proven frameworks — direct, story, or pain-point.',
    accent: '#8CCB3F',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 4h16M3 8h10M3 12h13M3 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M17 14l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20 17H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    delay: 'fade-up-1',
  },
  {
    href: '/sequence',
    step: '02',
    label: 'Sequence',
    headline: 'Multi-touch outreach',
    description: 'Build full email sequences — from first touch through breakup email — with intelligent follow-up timing and varied angles.',
    accent: '#0FACC1',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="4" cy="5" r="2" stroke="currentColor" strokeWidth="1.8"/>
        <circle cx="4" cy="11" r="2" stroke="currentColor" strokeWidth="1.8"/>
        <circle cx="4" cy="17" r="2" stroke="currentColor" strokeWidth="1.8"/>
        <line x1="6" y1="5" x2="18" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="6" y1="11" x2="18" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="6" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="4" y1="7" x2="4" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="4" y1="13" x2="4" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    delay: 'fade-up-2',
  },
  {
    href: '/analyze',
    step: '03',
    label: 'Analyze',
    headline: 'Score any email',
    description: 'Paste any cold email and get an instant breakdown: personalization, clarity, subject line strength, and a weighted overall score.',
    accent: '#EFB434',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M2 16L7 10l4 4 4-5 5 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="17" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
    delay: 'fade-up-3',
  },
  {
    href: '/subject-lines',
    step: '04',
    label: 'Subject Lines',
    headline: 'Test your hooks',
    description: 'Score and compare subject lines for open-rate potential. Get specific rewrites optimized for your target persona.',
    accent: '#2FAA4A',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M2 8l9 5 9-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    delay: 'fade-up-4',
  },
];

export default function Home() {
  return (
    <div className="py-4">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="text-center mb-12 fade-up fade-up-1">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-tt-green/10 border border-tt-green/20 text-tt-green text-[12px] font-semibold mb-6 tracking-wide uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-tt-green inline-block" />
          AI-Powered Cold Outreach
        </div>

        <h1 className="text-[40px] sm:text-[52px] font-bold tracking-tight text-ios-text dark:text-white leading-[1.05] mb-4">
          Outreach that<br />
          <span className="tt-shimmer">actually converts.</span>
        </h1>

        <p className="text-[16px] text-ios-text-2 dark:text-tt-grey-2 max-w-[480px] mx-auto leading-relaxed">
          Research real prospects, craft hyper-personalized emails,
          and build automated sequences — all powered by Claude AI.
        </p>
      </div>

      {/* ── Workflow Strip ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center mb-10 fade-up fade-up-2">
        <div className="inline-flex items-center gap-0 bg-tt-card border border-tt-sep/60 rounded-tt-xl px-2 py-2">
          {[
            { n: '1', label: 'Research', href: '/generate' },
            { n: '2', label: 'Generate', href: '/generate' },
            { n: '3', label: 'Sequence', href: '/sequence' },
          ].map((step, i) => (
            <div key={step.n} className="flex items-center">
              <Link
                href={step.href}
                className="flex items-center gap-2 px-4 py-2 rounded-tt hover:bg-white/5 transition-colors group"
              >
                <span className="w-5 h-5 rounded-full bg-tt-green/15 text-tt-green text-[11px] font-bold flex items-center justify-center flex-shrink-0 group-hover:bg-tt-green group-hover:text-white transition-colors">
                  {step.n}
                </span>
                <span className="text-[13px] font-medium text-ios-text dark:text-white whitespace-nowrap">
                  {step.label}
                </span>
              </Link>
              {i < 2 && (
                <svg width="16" height="16" viewBox="0 0 16 16" className="text-tt-sep flex-shrink-0 mx-1" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tool Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className={`group block relative bg-tt-card border border-tt-sep/50 rounded-tt-lg p-5 tt-card-hover fade-up ${tool.delay} overflow-hidden`}
          >
            {/* Step number — watermark */}
            <span className="absolute top-4 right-5 text-[40px] font-black text-white/[0.04] select-none leading-none pointer-events-none">
              {tool.step}
            </span>

            {/* Icon */}
            <div
              className="w-10 h-10 rounded-tt flex items-center justify-center mb-4"
              style={{ backgroundColor: tool.accent + '18', color: tool.accent }}
            >
              {tool.icon}
            </div>

            {/* Label + headline */}
            <div className="mb-2">
              <span
                className="text-[11px] font-semibold uppercase tracking-widest mb-1 block"
                style={{ color: tool.accent }}
              >
                {tool.label}
              </span>
              <h2 className="text-[17px] font-bold text-ios-text dark:text-white tracking-tight leading-snug">
                {tool.headline}
              </h2>
            </div>

            {/* Description */}
            <p className="text-[13px] text-ios-text-2 dark:text-tt-grey-2 leading-relaxed mb-4">
              {tool.description}
            </p>

            {/* CTA arrow */}
            <div
              className="flex items-center gap-1.5 text-[13px] font-semibold transition-colors"
              style={{ color: tool.accent }}
            >
              Open tool
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* ── How it works strip ────────────────────────────────────────────── */}
      <div className="rounded-tt-lg border border-tt-sep/40 bg-tt-card/60 px-5 py-4 fade-up fade-up-4">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-tt-sm bg-tt-green/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#8CCB3F" strokeWidth="1.5"/>
              <path d="M7 9V6M7 4.5v.5" stroke="#8CCB3F" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ios-text dark:text-white mb-0.5">How it works</p>
            <p className="text-[13px] text-ios-text-2 dark:text-tt-grey-2 leading-relaxed">
              Start in <span className="text-white font-medium">Generate</span> — research your prospect, configure your email, and get 3 high-quality variations with scores.
              Then send your best performer to <span className="text-white font-medium">Sequence</span> to build a full follow-up cadence automatically.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
