'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LangPicker } from '@/components/LangPicker';
import { ICONS, IconName, Wordmark } from '@/components/ui';
import { ApiError, Lang, api, session } from '@/lib/api';
import { LANGS, translator } from '@/lib/i18n';
import { inApp } from '@/lib/native';

/* Demo accounts from backend/app/store.py, so judges can sign in with one tap. */
const DEMO = { worker: ['9000000001', '1234'], manager: ['9000000000', '4321'] } as const;
const LANG_KEY = 'ss_lang';
const SIGNING_IN_MS = 1400;
const FADE_MS = 550;      // each line fades fully out before the next fades in

/** What ShiftSaathi does, one idea at a time: the right panel turns through them. */
const LINES: [string, string][] = [
  ['Every rupee, explained.', "Payslips in the worker's own language, read aloud, with overtime at the legal double rate."],
  ['Danger reported, never ignored.', 'Each hazard gets a deadline and moves up the chain on its own until someone fixes it.'],
  ['Speak up without fear.', 'Feedback is AES-256 encrypted and shown only once five or more people have answered.'],
  ['Skills that travel with you.', 'A signed Skill Passport any new employer can check in seconds.'],
];

export default function Login() {
  const [lang, setLang] = useState<Lang>('en');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [worker, setWorker] = useState(false);   // inside the iPhone app: worker sign-in only
  const t = translator(lang);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as Lang | null;
      if (saved && LANGS.includes(saved)) setLang(saved);
    } catch { /* storage blocked: stay on English */ }
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { setWorker(inApp()); }, []);

  const chooseLang = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* storage blocked */ }
  };

  /** Sign in; on success show the loading screen briefly, then the right app for the role. */
  async function signIn(p: string, n: string) {
    setError('');
    try {
      const { token, role } = await api<{ token: string; role: string }>('/api/auth/login', { body: { phone: p, pin: n } });
      session.set(token);
      if (role === 'worker') await api('/api/me/lang', { method: 'PUT', body: { lang } });
      setBusy(true);
      setTimeout(() => { window.location.href = role === 'worker' ? '/worker/' : '/admin/'; }, SIGNING_IN_MS);
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : t('error_generic'));
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone) || !/^\d{4}$/.test(pin)) { setError(`${t('phone')} (10) · ${t('pin')}`); return; }
    void signIn(phone, pin);
  };

  if (busy) return <SigningIn title={t('signing_in')} sub={t('signing_in_sub')} />;

  const input = 'w-full rounded-lg border border-rule bg-surface py-3 pl-11 pr-4 text-[15px] outline-none transition-colors placeholder:text-muted focus:border-seal/60 focus:ring-4 focus:ring-seal/10 focus-visible:outline-none';
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main id="main" className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          {worker ? <Wordmark className="text-[1.6rem]" /> : <Link href="/" aria-label="ShiftSaathi home"><Wordmark className="text-[1.6rem]" /></Link>}
          <LangPicker lang={lang} onChange={chooseLang} />
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <h1 className="font-display text-[2.4rem] leading-[1.1] tracking-[-0.01em]">{t('welcome')}</h1>
          <p className="mt-2 text-[15px] text-muted">{t('sign_in_sub')}</p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <label className="block">
              <span className="mb-1.5 block text-[14px] font-medium">{t('phone')}</span>
              <span className="relative block">
                <Glyph name="phone" />
                <input inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone} autoFocus
                       onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                       placeholder="98765 43210" className={input} />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[14px] font-medium">{t('pin')}</span>
              <span className="relative block">
                <Glyph name="lock" />
                <input type={show ? 'text' : 'password'} inputMode="numeric" autoComplete="current-password" maxLength={4}
                       value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
                       placeholder="••••" className={`${input} pr-12 tracking-[0.3em]`} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide PIN' : 'Show PIN'}
                        className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-ink">
                  <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" />
                    {!show && <path d="M4 4l16 16" />}
                  </svg>
                </button>
              </span>
            </label>

            {error && <p role="alert" className="text-[13px] text-query">{error}</p>}

            <button type="submit" className="w-full rounded-lg bg-seal py-3 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-ink">
              {t('sign_in')}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4 text-[13px] text-muted">
            <span className="h-px flex-1 bg-rule" />{t('or_demo')}<span className="h-px flex-1 bg-rule" />
          </div>

          <div className="space-y-3">
            <DemoButton icon="users" label={t('continue_worker')} who="Murugan · Mason, Skyline Towers" onClick={() => void signIn(...DEMO.worker)} />
            {!worker && <DemoButton icon="grid" label={t('continue_manager')} who="Anita · HR & Safety lead" onClick={() => void signIn(...DEMO.manager)} />}
          </div>

          <p className="mt-6 text-center text-[12px] leading-relaxed text-muted">
            Demo data resets on every restart. PINs are hashed with scrypt; five wrong tries lock a number for five minutes.
          </p>
        </div>
      </main>

      <Showcase />
    </div>
  );
}

function DemoButton({ icon, label, who, onClick }: { icon: IconName; label: string; who: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
            className="flex w-full items-center gap-3 rounded-lg border border-rule bg-surface px-4 py-3 text-left shadow-sm transition-colors hover:border-ink/30 hover:bg-paper">
      <span className="text-seal"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[icon]} /></svg></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        <span className="block text-[12.5px] text-muted">{who}</span>
      </span>
      <span aria-hidden="true" className="text-muted">→</span>
    </button>
  );
}

function Glyph({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-[19px] w-[19px] -translate-y-1/2 text-muted"
         fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name]} /></svg>
  );
}

/** The right half: espresso panel, lines that turn over one at a time. */
function Showcase() {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(true);
  const next = useRef(0);
  const turn = (to: number) => { next.current = to; setShown(false); };  // fade out, swap while invisible, fade in
  useEffect(() => {
    if (shown) {
      const tm = setTimeout(() => turn((i + 1) % LINES.length), 5500);   // time to read the sentence
      return () => clearTimeout(tm);
    }
    const tm = setTimeout(() => { setI(next.current); setShown(true); }, FADE_MS);
    return () => clearTimeout(tm);
  }, [shown, i]);
  const [heading, line] = LINES[i];

  return (
    <aside className="relative hidden overflow-hidden bg-[#2A2119] text-[#F5F0E6] lg:flex lg:flex-col">
      <Backdrop />
      <div className="relative flex flex-1 items-center justify-center px-14">
        <div className="w-full max-w-lg">
          <div className="flex min-h-[15rem] flex-col justify-center transition-[opacity,transform] ease-out" aria-live="polite"
               style={{ opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(8px)', transitionDuration: `${FADE_MS}ms` }}>
            <p className="font-display text-[clamp(2.4rem,3.6vw,3.4rem)] leading-[1.08] tracking-[-0.01em]">{heading}</p>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-[#F5F0E6]/75">{line}</p>
          </div>
          <div className="mt-10 flex gap-2">
            {LINES.map(([a], n) => (
              <button key={a} onClick={() => n !== i && shown && turn(n)} aria-label={`Show line ${n + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-300 ${n === i ? 'w-6 bg-[#C9A27E]' : 'w-1.5 bg-white/25 hover:bg-white/45'}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="relative flex justify-center px-14 pb-10">
        <p className="w-full max-w-lg text-[13px] text-[#F5F0E6]/55">
          Built for <span className="font-medium text-[#F5F0E6]/85">UN SDG 8 · Decent Work and Economic Growth</span>
        </p>
      </div>
    </aside>
  );
}

/** The panel's ground: a shift roster's sheets fanned off the top corner and a lighter wash
 *  behind the words, a few percent above the brown so it reads as texture, never content. */
function Backdrop() {
  const sheet = 'absolute inset-0 rounded-[6px] border border-[#F5F0E6]/[0.09] bg-[#F5F0E6]/[0.025]';
  const ruled = { backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 27px, rgb(245 240 230 / 0.05) 27px 28px)',
                  backgroundPosition: '0 56px' };
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0" style={{ background:
        'radial-gradient(farthest-corner at 30% 45%, rgb(201 162 126 / 0.05) 0%, rgb(201 162 126 / 0.035) 20%, ' +
        'rgb(201 162 126 / 0.018) 45%, rgb(201 162 126 / 0.006) 70%, transparent 100%)' }} />
      <div className="absolute -right-32 -top-28 h-[30rem] w-[23rem]">
        <div className={`${sheet} rotate-[16deg]`} />
        <div className={`${sheet} rotate-[8deg]`} />
        <div className={`${sheet} rotate-[-1deg] bg-[#F5F0E6]/[0.035]`} style={ruled} />
      </div>
    </div>
  );
}

/** Shown briefly after signing in: a payslip being read, its lines writing themselves in. */
function SigningIn({ title, sub }: { title: string; sub: string }) {
  const lines = [[20, 72], [20, 66], [20, 76], [20, 58], [20, 70], [20, 48]];
  return (
    <div className="grid min-h-dvh place-items-center bg-paper" role="status" aria-live="polite">
      <div className="flex flex-col items-center">
        <svg viewBox="4 2 82 116" className="h-24 w-auto overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgb(var(--seal))" stopOpacity="0" />
              <stop offset="0.5" stopColor="rgb(var(--seal))" stopOpacity="0.22" />
              <stop offset="1" stopColor="rgb(var(--seal))" stopOpacity="0" />
            </linearGradient>
            <clipPath id="sheet"><path d="M14 6h50l18 18v84a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z" /></clipPath>
          </defs>
          <path d="M14 6h50l18 18v84a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z" className="fill-surface stroke-seal/40" strokeWidth="1.5" />
          <path d="M64 6v12a6 6 0 0 0 6 6h12" className="fill-seal/10 stroke-seal/40" strokeWidth="1.5" strokeLinejoin="round" />
          {lines.map(([x1, x2], i) => (
            <path key={i} d={`M${x1} ${38 + i * 11}H${x2}`} pathLength={1} className="write stroke-seal" strokeWidth="3"
                  strokeLinecap="round" style={{ animationDelay: `${i * 140}ms` }} />
          ))}
          <g clipPath="url(#sheet)"><rect className="scan" x="0" y="0" width="96" height="22" fill="url(#beam)" /></g>
        </svg>
        <p className="mt-8 font-display text-[1.4rem] tracking-[0.01em]">{title}</p>
        <p className="mt-1 text-[14px] text-muted">{sub}</p>
        <div className="mt-6 h-[2px] w-40 overflow-hidden rounded-full bg-seal/10">
          <div className="h-full origin-left rounded-full bg-seal/70" style={{ animation: `fill ${SIGNING_IN_MS}ms cubic-bezier(.4,0,.2,1) both` }} />
        </div>
      </div>
    </div>
  );
}
