import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Grok Crew — Bot Workspace',
  description: '내 Grok 봇을 역할별로 불러 미션을 조율하는 워크스페이스',
  openGraph: {
    title: 'Grok Crew — Bot Workspace',
    description: '내 Grok 봇을 역할별로 불러 미션을 조율하는 워크스페이스',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Grok Crew' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grok Crew — Bot Workspace',
    description: '내 Grok 봇을 역할별로 불러 미션을 조율하는 워크스페이스',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
