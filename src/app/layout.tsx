import type { Metadata } from 'next';
import './globals.css';
import AutoSync from '@/components/AutoSync';

export const metadata: Metadata = {
  title: 'InstaAuto - Official Instagram Comment to DM Automation',
  description: 'Automate direct message link delivery when users comment on your Instagram Reels. 100% safe, official Meta Graph API compliance.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AutoSync />
        {children}
      </body>
    </html>
  );
}
