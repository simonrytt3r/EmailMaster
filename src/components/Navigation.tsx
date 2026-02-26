'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const tabs = [
  { href: '/analyze',       label: 'Analyze',   icon: '◎' },
  { href: '/generate',      label: 'Generate',  icon: '✦' },
  { href: '/sequence',      label: 'Sequence',  icon: '⋮' },
  { href: '/subject-lines', label: 'Subjects',  icon: '◈' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-tt-black/90 backdrop-blur-xl border-b border-ios-sep/30 dark:border-tt-sep/60">
      {/* Top accent bar */}
      <div className="tt-accent-bar" />

      <div className="max-w-tt mx-auto px-4 sm:px-5 h-13 flex items-center justify-between gap-6">

        {/* TTE.ai wordmark */}
        <Link
          href="/"
          className="flex items-baseline gap-[1px] text-[17px] font-bold tracking-tight flex-shrink-0 group"
        >
          <span className="text-ios-text dark:text-white group-hover:opacity-90 transition-opacity">TTE</span>
          <span className="text-tt-green group-hover:opacity-90 transition-opacity">.ai</span>
        </Link>

        {/* Tab navigation */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/');
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative px-3 py-[7px] rounded-tt text-[13px] font-medium whitespace-nowrap transition-all duration-150 ease-out select-none ${
                  isActive
                    ? 'text-tt-green bg-tt-green/10 dark:bg-tt-green/[0.08]'
                    : 'text-ios-text-2 dark:text-tt-grey-2 hover:text-ios-text dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-tt-green" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Theme toggle */}
        <div className="flex-shrink-0">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
