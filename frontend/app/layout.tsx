import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Instrument_Sans, Noto_Sans_Devanagari, Noto_Sans_Kannada, Noto_Sans_Tamil, Noto_Sans_Telugu } from 'next/font/google';
import './globals.css';

/* Instrument Sans carries the interface and the headings, as in Docify; Geist Mono sets codes.
   The Noto faces stand behind it for the four Indian scripts. Each is split by unicode-range,
   so a phone only downloads the script it actually shows. */
const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const hi = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-hi', display: 'swap' });
const ta = Noto_Sans_Tamil({ subsets: ['tamil'], variable: '--font-ta', display: 'swap' });
const te = Noto_Sans_Telugu({ subsets: ['telugu'], variable: '--font-te', display: 'swap' });
const kn = Noto_Sans_Kannada({ subsets: ['kannada'], variable: '--font-kn', display: 'swap' });

export const metadata: Metadata = {
  title: 'ShiftSaathi',
  description: 'Shift tracking, clear payslips, safety reports and anonymous feedback for workers, in their own language.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#F5F2EA' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fonts = [sans, mono, hi, ta, te, kn].map((f) => f.variable).join(' ');
  return (
    <html lang="en" className={fonts}
          style={{ ['--font-indic' as string]: 'var(--font-hi), var(--font-ta), var(--font-te), var(--font-kn)' }}>
      <body className="font-sans antialiased">
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
