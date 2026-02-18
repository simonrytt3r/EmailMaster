'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { href: '/analyze', label: 'Analyze' },
  { href: '/generate', label: 'Generate' },
  { href: '/subject-lines', label: 'Subject Lines' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/analyze" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-turf-green flex items-center justify-center">
                <span className="text-white font-bold text-sm">CE</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">
                Cold Email Lab
              </span>
            </Link>
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-turf-green text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
