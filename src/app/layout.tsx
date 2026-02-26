import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'TTE.ai',
  description: 'AI-powered cold outreach platform. Research prospects, generate personalized emails, and build automated sequences.',
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
      <body className="min-h-screen bg-ios-bg dark:bg-tt-black text-ios-text dark:text-white antialiased">
        <Navigation />
        <main className="max-w-tt mx-auto px-4 sm:px-5 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
