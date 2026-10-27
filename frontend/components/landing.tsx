'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon, IconName, Tile, Wordmark } from '@/components/ui';

/** Everything one phone gives a worker, typed out one at a time (Docify's TypedHero). */
const PROMISES = ['fair pay.', 'a safe site.', 'a voice that counts.', 'skills that travel.'];
const TYPE_MS = 70, DELETE_MS = 32, HOLD_MS = 1900, GAP_MS = 350;

export function TypedHero() {
  const [i, setI] = useState(0);
  const [len, setLen] = useState(0);
  const [mode, setMode] = useState<'wait' | 'type' | 'hold' | 'erase'>('wait');

  useEffect(() => { const t = setTimeout(() => setMode('type'), 500); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const word = PROMISES[i];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (mode === 'type') {
      if (reduce) { setLen(word.length); setMode('hold'); return; }
      t = len < word.length ? setTimeout(() => setLen(len + 1), TYPE_MS + (len === 0 ? 120 : 0)) : setTimeout(() => setMode('hold'), 0);
    } else if (mode === 'hold') {
      t = setTimeout(() => setMode('erase'), HOLD_MS);
    } else if (mode === 'erase') {
      if (reduce) { setLen(0); setI((i + 1) % PROMISES.length); setMode('type'); return; }
      t = len > 0 ? setTimeout(() => setLen(len - 1), DELETE_MS) : setTimeout(() => { setI((i + 1) % PROMISES.length); setMode('type'); }, GAP_MS);
    }
    return () => clearTimeout(t);
  }, [mode, len, i]);

  return (
    <h1 className="mt-4 font-display text-4xl leading-[1.1] tracking-[-0.02em] sm:text-6xl 2xl:text-[4.5rem]"
        aria-label={`Every shift: ${PROMISES.map((p) => p.replace('.', '')).join(', ')}.`}>
      <span aria-hidden="true">Every shift,</span>
      <br />
      <span aria-hidden="true" className="block h-[1.1em] whitespace-nowrap text-seal">
        {PROMISES[i].slice(0, len)}
        <span className={`ml-[0.05em] inline-block h-[0.8em] w-[3px] translate-y-[0.06em] rounded-full bg-seal align-baseline ${
          mode === 'type' || mode === 'erase' ? '' : 'animate-pulse'}`} />
      </span>
    </h1>
  );
}

export function TryNow({ large = false }: { large?: boolean }) {
  return (
    <Link href="/login/" className={`rounded-lg bg-seal font-medium text-paper transition hover:bg-ink active:scale-[0.98] ${
      large ? 'px-6 py-3 text-[15px]' : 'px-4 py-2 text-sm'}`}>
      Try the demo →
    </Link>
  );
}

/** The hero's picture: the worker app as it looks on a basic phone, showing this month's pay. */
export function PhonePreview() {
  const lines: [string, string, string?][] = [
    ['Basic pay', '₹17,955', '189 h × ₹95'], ['Overtime at double rate', '₹23,211', '122 h × ₹95 × 2'],
    ['Provident Fund (PF)', '−₹2,155', '12% of basic'],
  ];
  return (
    <div className="mx-auto w-full max-w-[330px] rounded-[2.2rem] border border-rule bg-ink p-2.5 shadow-[0_30px_60px_-30px_rgb(61_57_41/0.45)]">
      <div className="overflow-hidden rounded-[1.75rem] bg-paper">
        <div className="flex items-center justify-between border-b border-rule px-5 py-3">
          <Wordmark className="text-[1rem]" /><span className="rounded-md border border-rule bg-surface px-2 py-0.5 text-[12px]">தமிழ்</span>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-[11px] font-medium text-seal">அக்டோபர் 2026</p>
          <div className="rounded-xl border border-rule bg-surface p-4 shadow-sheet">
            <p className="text-[12px] text-muted">கையில் கிடைக்கும் சம்பளம்</p>
            <p className="mt-1 font-display text-[2rem] leading-none tabular-nums">₹39,011</p>
            <p className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-rule py-2 text-[12.5px] font-medium">
              <Icon name="speaker" className="h-4 w-4 text-seal" /> படித்துக் காட்டு
            </p>
          </div>
          <div className="divide-y divide-rule rounded-xl border border-rule bg-surface">
            {lines.map(([label, amount, detail]) => (
              <div key={label} className="flex items-start justify-between gap-2 px-4 py-2.5">
                <div><p className="text-[12.5px] font-medium">{label}</p><p className="text-[11px] text-muted">{detail}</p></div>
                <p className={`text-[12.5px] font-semibold tabular-nums ${amount.startsWith('−') ? 'text-query' : ''}`}>{amount}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-query/10 px-3 py-2 text-[12px] text-query">
            <Icon name="alert" className="h-4 w-4" /> ஓய்வு தேவை: 85 மணி நேரம் இந்த வாரம்
          </div>
        </div>
        <div className="grid grid-cols-5 border-t border-rule bg-surface py-2 text-center text-[10px] text-muted">
          {(['home', 'rupee', 'shield', 'chat', 'badge'] as IconName[]).map((n, i) => (
            <span key={n} className={`flex justify-center ${i === 1 ? 'text-seal' : ''}`}><Icon name={n} className="h-5 w-5" /></span>
          ))}
        </div>
      </div>
    </div>
  );
}

const SECTORS: [IconName, string][] = [['building', 'Construction sites'], ['hospital', 'Hospitals'], ['college', 'Colleges & schools'], ['factory', 'Factories']];
const SCRIPTS = ['English', 'हिन्दी', 'தமிழ்', 'తెలుగు', 'ಕನ್ನಡ'];

/** Where Docify lists its backers, this lists who it is for, and in which languages. */
export function BuiltFor() {
  return (
    <div className="border-t border-rule pt-7">
      <p className="text-center text-[13px] font-medium text-muted">Built for the people who keep these running</p>
      <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-12 gap-y-5 text-ink/60 sm:justify-between">
        {SECTORS.map(([icon, name]) => (
          <li key={name} className="flex items-center gap-2.5 transition-colors duration-300 hover:text-ink">
            <Icon name={icon} className="h-7 w-7" />
            <span className="text-[1.3rem] font-medium tracking-[-0.02em]">{name}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center text-[15px] text-muted">{SCRIPTS.join('  ·  ')}</p>
    </div>
  );
}

const FEATURES: { icon: IconName; name: string; blurb: string }[] = [
  { icon: 'qr', name: 'Shift check-in', blurb: 'Scan the site QR. Location is checked when the phone has it; overtime is counted on its own.' },
  { icon: 'rupee', name: 'Clear payslips', blurb: 'Each line explained in five languages and read aloud. Overtime at the legal double rate.' },
  { icon: 'shield', name: 'Safety reports', blurb: 'Tap a picture or say it out loud. Every report gets a deadline and escalates if missed.' },
  { icon: 'lock', name: 'Honest feedback', blurb: 'No name stored, AES-256 encrypted, shown only when five or more have answered.' },
  { icon: 'badge', name: 'Skill Passport', blurb: 'Training signed by the employer. Any new employer can check it from a QR code.' },
  { icon: 'clock', name: 'Fatigue alerts', blurb: 'Flags weeks over 48 or 60 hours, short rests and missed weekly holidays.' },
  { icon: 'grid', name: 'Employer dashboard', blurb: 'Attendance, hazards, quit risk and a Fair Workplace Index for every site.' },
  { icon: 'mic', name: 'Voice assistant', blurb: 'Ask about pay or report a danger by speaking, in Hindi, Tamil, Telugu, Kannada or English.' },
];

const TODAY = [
  { title: 'Feedback sealed', body: 'AES-256-GCM with the site bound in, so a comment cannot be moved or altered unnoticed.' },
  { title: 'No name, by design', body: 'Feedback records hold no worker id at all, and only the week, never the time.' },
  { title: 'Credentials signed', body: 'Ed25519 signatures on every Skill Passport entry. Change one letter and the check fails.' },
  { title: 'No keys in the code', body: 'On Google Cloud the app signs in as its own service identity; secrets live in Secret Manager.' },
];

const STAMPS = [
  { mark: 'SDG 8.5', name: 'Fair pay for all work', tilt: -6 },
  { mark: 'SDG 8.8', name: 'Safe, secure workplaces', tilt: 4 },
  { mark: '1948', name: 'Factories Act overtime rules', tilt: -3 },
  { mark: 'DPDP', name: 'DPDP Act 2023, by design', tilt: 5 },
];

/** A seal in dashed outline, after Docify's audit stamps. */
const Stamp = ({ mark, tilt }: { mark: string; tilt: number }) => (
  <svg viewBox="0 0 120 120" className="h-24 w-24 text-seal/75 sm:h-28 sm:w-28" aria-hidden="true" style={{ transform: `rotate(${tilt}deg)` }}>
    <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="5 5" />
    <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="1" />
    <text x="60" y="66" textAnchor="middle" fill="currentColor" fontSize={mark.length > 5 ? 16 : 21} fontWeight="700" letterSpacing="-0.3">{mark}</text>
  </svg>
);

export function Security() {
  return (
    <section className="border-t border-rule pt-20">
      <h2 className="text-center font-display text-[2.4rem] leading-[1.1] sm:text-[2.75rem]">Safe to speak up</h2>
      <p className="mx-auto mt-4 max-w-lg text-center text-[16px] leading-relaxed text-muted">
        Workers only raise problems when they trust nothing comes back to them. Here is how that trust is earned.
      </p>
      <ul className="mt-12 grid gap-x-10 gap-y-8 text-center sm:grid-cols-2 lg:grid-cols-4">
        {TODAY.map((t) => (
          <li key={t.title}>
            <p className="font-display text-[1.15rem]">{t.title}</p>
            <p className="mx-auto mt-2 max-w-[30ch] text-[14.5px] leading-relaxed text-muted">{t.body}</p>
          </li>
        ))}
      </ul>
      <ul className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-y-10 lg:grid-cols-4">
        {STAMPS.map((a) => (
          <li key={a.name} className="flex flex-col items-center text-center">
            <Stamp mark={a.mark} tilt={a.tilt} />
            <p className="mt-4 text-[15px] font-medium">{a.name}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FeatureGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((f) => (
        <div key={f.name}
             className="group relative flex flex-col overflow-hidden rounded-xl border border-rule bg-surface p-5 shadow-sheet transition duration-200 hover:-translate-y-0.5 hover:border-seal/40">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-seal transition-transform duration-300 ease-out group-hover:scale-x-100" />
          <Tile icon={f.icon} />
          <h3 className="mt-3 font-display text-[1.1rem] leading-tight">{f.name}</h3>
          <p className="mt-1.5 text-[13.5px] leading-snug text-muted">{f.blurb}</p>
        </div>
      ))}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-2 mb-2 overflow-hidden rounded-[28px] bg-manila text-ink sm:mx-4 sm:mb-4">
      <div className="mx-auto max-w-6xl px-6 pt-20 sm:px-10 lg:pt-28 xl:max-w-7xl 2xl:max-w-[90rem]">
        <div className="flex flex-wrap items-end justify-between gap-10">
          <h2 className="font-display text-[2.6rem] leading-[1.05] tracking-[-0.035em] sm:text-[4.25rem]">
            Fair work,<span className="text-ink/45"> shift by shift.</span>
          </h2>
          <TryNow large />
        </div>
        <p className="mt-6 text-[15px] text-muted">One app for workers, one dashboard for employers. Runs on a ₹6,000 phone.</p>
        <div className="mt-20 flex flex-wrap items-end justify-between gap-8 border-t border-ink/10 pt-10 text-[13px] text-muted">
          <span>PromptWars 2026 · UN SDG 8</span>
          <nav className="flex gap-6 text-[15px] text-ink">
            <a href="#features" className="transition hover:text-seal">Features</a>
            <a href="#how" className="transition hover:text-seal">How it works</a>
            <Link href="/verify/" className="transition hover:text-seal">Check a passport</Link>
          </nav>
        </div>
      </div>
      <p aria-hidden="true" className="pointer-events-none mt-10 select-none whitespace-nowrap text-center font-semibold leading-[0.8] tracking-[-0.06em] text-ink/90 [font-size:17vw] [margin-bottom:-0.12em]"
         style={{ maskImage: 'linear-gradient(to bottom, black 35%, transparent 95%)', WebkitMaskImage: 'linear-gradient(to bottom, black 35%, transparent 95%)' }}>
        ShiftSaathi
      </p>
    </footer>
  );
}
