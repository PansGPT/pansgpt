import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PansGPT 2.0 — Intelligent Pharmacy Education Platform',
  description: 'AI-powered clinical pharmacy monograph study companion, question bank, and curriculum guide.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
