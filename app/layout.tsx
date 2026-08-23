import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppLanguage, LanguageBootstrap, LanguageProvider } from './language';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://grok-crew-hub.jinegcc.chatgpt.site'),
  title: 'NOH Reel Forge',
  description: 'Emotional recreate. Not two PNGs taped together.',
  openGraph: { title: 'NOH Reel Forge', description: 'Emotional recreate. Not two PNGs taped together.', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'NOH Reel Forge' }] },
  twitter: { card: 'summary_large_image', title: 'NOH Reel Forge', description: 'Emotional recreate. Not two PNGs taped together.', images: ['/og.png'] },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const initialLanguage: AppLanguage = cookieStore.get('nohReelForgeLanguage')?.value === 'en' ? 'en' : 'ko';
  const migrateStoredLanguage = `(function(){try{var saved=localStorage.getItem('nohReelForgeLanguage');if((saved==='ko'||saved==='en')&&document.cookie.indexOf('nohReelForgeLanguage=')===-1){document.cookie='nohReelForgeLanguage='+saved+'; path=/; max-age=31536000; samesite=lax';location.replace(location.href);}}catch(e){}})();`;
  return <html lang={initialLanguage}><head><script dangerouslySetInnerHTML={{ __html: migrateStoredLanguage }} /></head><body className={`${geistSans.variable} ${geistMono.variable}`}><LanguageProvider initialLanguage={initialLanguage}><LanguageBootstrap />{children}</LanguageProvider></body></html>;
}
