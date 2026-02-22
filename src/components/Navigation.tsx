'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const tabs = [
  { href: '/analyze', label: 'Analyze' },
  { href: '/generate', label: 'Generate' },
  { href: '/sequence', label: 'Sequence' },
  { href: '/subject-lines', label: 'Subjects' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-ios-sep/40 dark:border-ios-dark-sep/60">
      <div className="max-w-ios mx-auto px-4 sm:px-5 h-14 flex items-center justify-between gap-4">

        {/* App title */}
        <Link
          href="/analyze"
          className="text-[15px] font-semibold text-ios-text dark:text-white whitespace-nowrap flex-shrink-0"
        >
          Cold Email Lab
        </Link>

        {/* iOS Segmented Control */}
        <div className="flex items-center bg-ios-secondary dark:bg-ios-dark-secondary rounded-[9px] p-[3px] gap-[2px]">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`seg-pill px-3 py-[5px] rounded-[7px] text-[13px] font-medium whitespace-nowrap transition-all duration-150 ease-out select-none ${
                  isActive
                    ? 'bg-white dark:bg-ios-dark-card text-ios-text dark:text-white shadow-ios-seg'
                    : 'text-ios-text-2 hover:text-ios-text dark:hover:text-white'
                }`}
              >
                {tab.label}
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
