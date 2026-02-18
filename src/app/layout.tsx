import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Cold Email Lab',
  description: 'Analyze, score, and generate cold outreach emails using best practices from the world\'s top email marketers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg text-ios-text dark:text-white antialiased">
        <Navigation />
        <main className="max-w-ios mx-auto px-4 sm:px-5 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
