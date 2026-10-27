/* Shared building blocks, ported from Docify's DashboardSections kit so both apps
   read as one product: the same cards, pills, buttons and stat strip. */

export const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  rupee: 'M7 5h10M7 9.5h10M9.5 5c5 0 5 9 0 9H7l7.5 6',
  shield: 'M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z',
  chat: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4z',
  badge: 'M12 3.5 14.5 8.6l5.6.8-4 4 1 5.6-5.1-2.7-5 2.7 1-5.6-4.1-4 5.6-.8z',
  mic: 'M12 3.5a3 3 0 0 0-3 3V12a3 3 0 0 0 6 0V6.5a3 3 0 0 0-3-3zM5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 20h2.5M20 14v2',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  alert: 'M12 9v4m0 3.5h.01M10.3 4 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z',
  speaker: 'M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
  lock: 'M7 10V7.5a5 5 0 0 1 10 0V10M5.5 10h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 15h2',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  users: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1.5a4 4 0 0 0-3-3.9M15.5 4.1a3.5 3.5 0 0 1 0 6.8',
  grid: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
  building: 'M4 21V5l8-2v18M12 8h8v13M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2M3 21h18',
  hospital: 'M4 21V7h16v14M9 21v-4h6v4M12 9.5v5M9.5 12h5M3 21h18M8 7V4h8v3',
  college: 'M3 9.5 12 5l9 4.5-9 4.5zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M21 9.5V15',
  factory: 'M3 21V10l5 3V10l5 3V10l5 3V5h3v16zM3 21h18M7 17h2M12 17h2M17 17h2',
  logout: 'M15 4h3.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H15M10 8l-4 4 4 4M6 12h10',
  fall: 'M12 3.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM8 21l3-7-3-3 4-3 3 4h4M4 21h16',
  electrical: 'M13 2.5 4.5 14H11l-1 7.5L18.5 10H12z',
  fire: 'M12 21.5c4 0 7-2.9 7-6.8 0-4.7-4.6-7.4-5-12.2-2.8 1.8-4.8 4.6-4.8 7.6-1-1-1.8-2.2-1.9-3.7C5.5 8.2 5 10.6 5 14.7c0 3.9 3 6.8 7 6.8z',
  chemical: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9',
  biohazard: 'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 3a4 4 0 0 1 0 8M5 17a4 4 0 0 1 6-5M19 17a4 4 0 0 0-6-5',
  equipment: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  ergonomic: 'M12 3.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM9 21l1-7-3-2 2-4.5h6l2 4.5-3 2 1 7',
  other: 'M12 8v4m0 3.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = 'h-[18px] w-[18px]' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor"
         strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name]} /></svg>
  );
}

/** The logo is the name, set in the heading face. */
export function Wordmark({ className = 'text-[1.4rem]' }: { className?: string }) {
  return <span className={`font-sans font-semibold leading-none tracking-[-0.02em] text-ink ${className}`}>ShiftSaathi</span>;
}

export const btn = 'inline-flex items-center justify-center gap-2 rounded-md border border-rule bg-surface px-3 py-1.5 text-sm transition hover:border-ink/35 hover:bg-paper active:scale-[0.98] disabled:opacity-40';
export const primary = 'inline-flex items-center justify-center gap-2 rounded-md bg-seal px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-ink active:scale-[0.98] disabled:opacity-40';
/** The worker app's touch-sized versions: at least 48 px tall for thumbs on a basic phone. */
export const bigPrimary = 'flex w-full min-h-[52px] items-center justify-center gap-2 rounded-lg bg-seal px-5 text-[16px] font-semibold text-white shadow-sm transition hover:bg-ink active:scale-[0.99] disabled:opacity-40';
export const bigSecondary = 'flex w-full min-h-[52px] items-center justify-center gap-2 rounded-lg border border-rule bg-surface px-5 text-[16px] font-medium shadow-sm transition hover:border-ink/30 hover:bg-paper disabled:opacity-40';
export const field = 'w-full rounded-lg border border-rule bg-surface px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-muted focus:border-seal/60 focus:ring-4 focus:ring-seal/10 focus-visible:outline-none';
const eyebrow = 'text-[12px] font-medium text-muted';

export function Heading({ title, sub, kicker, children }: { title: string; sub?: string; kicker?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && <p className={`${eyebrow} mb-2`}>{kicker}</p>}
        <h1 className="font-display text-[2.1rem] leading-[1.1] tracking-[-0.01em]">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-[15px] text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, action, children, className = '' }: {
  title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-xl border border-rule bg-surface shadow-sheet ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-5 py-3">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = 'verify' | 'caution' | 'query' | 'seal' | 'muted';

const PILL: Record<Tone, [string, string]> = {   // pill, dot
  verify: ['bg-verify/10 text-verify', 'bg-verify'],
  caution: ['bg-amber-100 text-caution', 'bg-amber-500'],
  query: ['bg-query/10 text-query', 'bg-query'],
  seal: ['bg-seal/10 text-seal', 'bg-seal'],
  muted: ['bg-ink/[0.06] text-muted', 'bg-muted/60'],
};

/** Docify's status pill: a dot and a word. */
export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${PILL[tone][0]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${PILL[tone][1]}`} />{children}
    </span>
  );
}

export const levelTone = (level: string): Tone =>
  ({ ok: 'verify', low: 'verify', medium: 'caution', high: 'query', critical: 'query' } as Record<string, Tone>)[level] ?? 'muted';

export const barColour = (tone: Tone) =>
  ({ verify: 'bg-verify', caution: 'bg-amber-500', query: 'bg-query', seal: 'bg-seal', muted: 'bg-muted' })[tone];

export function Stat({ label, value, note, icon, children }: {
  label: string; value: React.ReactNode; note?: string; icon: IconName; children?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-5">
      <p className="flex items-center gap-2 text-[13px] text-muted"><span className="text-seal"><Icon name={icon} className="h-4 w-4" /></span>{label}</p>
      <p className="mt-2 font-display text-[2.1rem] leading-none tabular-nums">{value}</p>
      {children}
      {note && <p className="mt-2 text-[13px] text-muted">{note}</p>}
    </div>
  );
}

export function Notice({ tone, icon, children }: { tone: Tone; icon: IconName; children: React.ReactNode }) {
  return (
    <div role="status" className={`flex items-start gap-3 rounded-lg px-4 py-3 text-[14.5px] leading-relaxed ${PILL[tone][0]}`}>
      <Icon name={icon} className="mt-0.5 h-[18px] w-[18px]" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** An icon in Docify's tool-card tile: a soft brown gradient with an inset ring. */
export function Tile({ icon, className = 'h-9 w-9' }: { icon: IconName; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg bg-gradient-to-b from-seal/[0.12] to-seal/[0.05] text-seal ring-1 ring-inset ring-seal/15 ${className}`}>
      <Icon name={icon} />
    </span>
  );
}

export const rupees = (n: number) =>
  `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
