'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, Icon, Notice, Pill, bigPrimary, bigSecondary, field, levelTone } from '@/components/ui';
import { ApiError, Fatigue, Lang, Me, api } from '@/lib/api';
import type { Key, T } from '@/lib/i18n';
import { inApp, nativeScan } from '@/lib/native';
import { useLive } from '@/lib/useLive';

type Shift = { start: string; end: string | null };

const DAILY_LIMIT_H = 9;   // Factories Act s.54: past this, every minute is overtime
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const day = (iso: string, lang: Lang) => new Date(iso).toLocaleDateString(`${lang}-IN`, { weekday: 'short', day: 'numeric', month: 'short' });
const ms = (s: Shift, now: number) => (s.end ? new Date(s.end).getTime() : now) - new Date(s.start).getTime();
const clock = (msec: number) => {
  const s = Math.max(0, Math.floor(msec / 1000));
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':');
};
const hm = (msec: number) => {
  if (msec < 60000) return `${Math.max(0, Math.round(msec / 1000))} s`;
  const m = Math.round(msec / 60000);
  return `${Math.floor(m / 60)} h ${m % 60} m`;
};

/* Asks for one location fix, giving up quietly: check-in must still work on a phone without GPS. */
const locate = () => new Promise<GeolocationCoordinates | null>((resolve) => {
  if (!navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition((p) => resolve(p.coords), () => resolve(null), { timeout: 6000, maximumAge: 60000 });
});

/** The current time in ms, re-read every second while `running`. */
function useNow(running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  return now;
}

export function Home({ me, t, lang, onChange }: { me: Me; t: T; lang: Lang; onChange: () => void }) {
  const [fatigue, setFatigue] = useState<Fatigue | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recorded, setRecorded] = useState('');
  const [scanning, setScanning] = useState(false);

  useLive(() => {
    void api<Fatigue>('/api/me/wellbeing').then(setFatigue);
    void api<Shift[]>('/api/me/shifts').then(setShifts);
  }, [me.checked_in]);

  const open = shifts.find((s) => !s.end);
  const now = useNow(Boolean(open));

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setError('');
    try {
      const shift = await api<{ started: string; ended?: string }>(path, { method: 'POST', body });
      setCode('');
      setRecorded(shift.ended ? t('shift_recorded', { value: hm(ms({ start: shift.started, end: shift.ended }, 0)) }) : '');
      onChange();
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : t('error_generic'));
    } finally {
      setBusy(false);
    }
  }

  const checkIn = async (siteCode: string) => {
    const pos = await locate();
    await act('/api/shifts/check-in', { code: siteCode, lat: pos?.latitude, lng: pos?.longitude });
  };

  const today = new Date(now).toDateString();
  const todayMs = shifts.filter((s) => new Date(s.start).toDateString() === today).reduce((n, s) => n + ms(s, now), 0);
  const runningMs = open ? ms(open, now) : 0;
  // the server counts finished shifts; the one still running is added here, second by second
  const weekHours = (fatigue?.week_hours ?? 0) + runningMs / 3.6e6;
  const runningH = runningMs / 3.6e6;
  const greet: Key = new Date(now).getHours() < 12 ? 'greet_morning' : new Date(now).getHours() < 17 ? 'greet_afternoon' : 'greet_evening';
  const canScan = inApp() || (typeof window !== 'undefined' && 'BarcodeDetector' in window);
  const scan = async () => {
    if (!inApp()) return setScanning(true);
    const found = await nativeScan();   // the iPhone app's camera
    if (found) void checkIn(found);
  };

  return (
    <div className="space-y-5">
      <section className="border-b border-rule pb-6">
        <p className="text-[13px] font-medium text-seal">{new Date(now).toLocaleDateString(`${lang}-IN`, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="mt-2 font-display text-[2rem] leading-[1.1] tracking-[-0.02em]">{t(greet, { name: me.name.split(' ')[0] })}</h1>
        <p className="mt-1.5 text-[15px] text-muted">{me.trade} · {me.site?.name}</p>
      </section>

      {open ? (
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <Pill tone="verify">{t('on_shift_now')}</Pill>
              <span className="text-[13px] text-muted">{t('started_at', { time: time(open.start) })}</span>
            </div>
            <p className="mt-5 text-[13px] text-muted">{t('time_on_shift')}</p>
            <p role="timer" aria-label={`${t('time_on_shift')}: ${hm(runningMs)}`}
               className={`mt-1 font-display text-[clamp(2.8rem,15vw,3.6rem)] leading-none tabular-nums tracking-[-0.02em] ${runningH > DAILY_LIMIT_H ? 'text-query' : ''}`}>
              {clock(runningMs)}
            </p>
            {/* the day so far against the 9-hour legal limit; the tick marks where overtime starts */}
            <div className="relative mt-5 h-1.5 rounded-full bg-seal/15" aria-hidden="true">
              <div className={`h-full rounded-full transition-[width] duration-1000 ${runningH > DAILY_LIMIT_H ? 'bg-query' : runningH > 8 ? 'bg-amber-500' : 'bg-verify'}`}
                   style={{ width: `${Math.min(100, (runningH / 12) * 100)}%` }} />
              <span className="absolute -top-1.5 h-[18px] w-0.5 rounded-full bg-ink/70" style={{ left: `${(DAILY_LIMIT_H / 12) * 100}%` }} />
            </div>
            <p className={`mt-2 text-[12.5px] ${runningH > DAILY_LIMIT_H ? 'font-medium text-query' : 'text-muted'}`}>
              {runningH > DAILY_LIMIT_H ? t('overtime_now', { value: hm(runningMs - DAILY_LIMIT_H * 3.6e6) }) : t('overtime_after')}
            </p>
            <button className={`${bigPrimary} mt-5`} disabled={busy} onClick={() => void act('/api/shifts/check-out')}>
              <Icon name="logout" /> {t('check_out')}
            </button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="p-5">
            <p className="flex items-center gap-2 text-[15px] font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-muted/40" aria-hidden="true" />{t('off_shift')}
            </p>
            {recorded && <div className="mt-4"><Notice tone="verify" icon="check">{recorded}</Notice></div>}
            <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); void checkIn(code); }}>
              {canScan && (
                <button type="button" className={bigSecondary} onClick={() => void scan()}>
                  <Icon name="qr" /> {t('scan_qr')}
                </button>
              )}
              {scanning && <Scanner onCode={(c) => { setScanning(false); void checkIn(c); }} onClose={() => setScanning(false)} />}
              <label className="block">
                <span className="mb-1.5 block text-[14px] font-medium">{t('site_code')}</span>
                <input className={`${field} font-mono uppercase tracking-wider`} placeholder="SKY-7Q2" value={code}
                       onChange={(e) => setCode(e.target.value)} maxLength={20} required />
              </label>
              <button className={bigPrimary} disabled={busy}><Icon name="check" /> {t('check_in')}</button>
            </form>
          </div>
        </Card>
      )}
      {error && <Notice tone="query" icon="alert">{error}</Notice>}

      {fatigue && (
        <div className="rounded-xl border border-rule bg-desk">
          <div className="grid grid-cols-2 divide-x divide-rule border-b border-rule">
            <div className="px-5 py-4">
              <p className="flex items-center gap-2 text-[13px] text-muted"><span className="text-seal"><Icon name="clock" className="h-4 w-4" /></span>{t('today')}</p>
              <p className="mt-1.5 font-display text-[1.6rem] leading-none tabular-nums">{hm(todayMs)}</p>
            </div>
            <div className="px-5 py-4">
              <p className="flex items-center gap-2 text-[13px] text-muted"><span className="text-seal"><Icon name="grid" className="h-4 w-4" /></span>{t('this_week')}</p>
              <p className="mt-1.5 font-display text-[1.6rem] leading-none tabular-nums">{hm(weekHours * 3.6e6)}</p>
            </div>
          </div>
          <div className="p-5">
            <div className="relative h-1.5 rounded-full bg-seal/15" role="meter" aria-valuemin={0} aria-valuemax={72}
                 aria-valuenow={Math.round(weekHours)} aria-label={t('week_hours')}>
              <div className={`h-full rounded-full ${fatigue.level === 'ok' ? 'bg-verify' : fatigue.level === 'medium' ? 'bg-amber-500' : 'bg-query'}`}
                   style={{ width: `${Math.min(100, (weekHours / 72) * 100)}%` }} />
              <span className="absolute -top-1.5 h-[18px] w-0.5 rounded-full bg-ink/70" style={{ left: `${(48 / 72) * 100}%` }} aria-hidden="true" />
            </div>
            <p className="mt-2 text-[12.5px] text-muted">{t('legal_limit')}</p>
            <div className="mt-4">
              <Notice tone={levelTone(fatigue.level)} icon={fatigue.level === 'ok' ? 'check' : 'alert'}>
                <p className="font-semibold">{t(`fatigue_${fatigue.level}`)}</p>
                {fatigue.reasons.length > 0 && (
                  <ul className="mt-1 list-disc pl-5">
                    {fatigue.reasons.map((r) => <li key={r.code}>{t(`reason_${r.code}` as Key, { value: r.value ?? '' })}</li>)}
                  </ul>
                )}
              </Notice>
            </div>
          </div>
        </div>
      )}

      <Card>
        <ul className="divide-y divide-rule">
          {shifts.filter((s) => s.end).slice(-5).reverse().map((s) => (
            <li key={s.start} className="flex items-center justify-between gap-3 px-5 py-3 text-[14.5px]">
              <span className="w-28">{day(s.start, lang)}</span>
              <span className="text-muted tabular-nums">{time(s.start)} – {time(s.end!)}</span>
              <span className={`w-16 text-right font-medium tabular-nums ${ms(s, 0) > 12 * 3.6e6 ? 'text-query' : ''}`}>{hm(ms(s, 0))}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* Uses the phone's built-in barcode reader (Chrome on Android); the typed code is the fallback. */
function Scanner({ onCode, onClose }: { onCode: (c: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval>;
    // @ts-expect-error BarcodeDetector is not in TypeScript's DOM types yet
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then((s) => {
      stream = s;
      if (!video.current) return;
      video.current.srcObject = s;
      void video.current.play();
      timer = setInterval(async () => {
        const found = video.current && await detector.detect(video.current).catch(() => []);
        if (found?.length) onCode(found[0].rawValue);
      }, 400);
    }).catch(onClose);
    return () => { clearInterval(timer); stream?.getTracks().forEach((tr) => tr.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start the camera once per open
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border border-rule">
      <video ref={video} className="aspect-square w-full bg-ink object-cover" muted playsInline aria-label="Camera" />
      <button type="button" className="w-full py-2.5 text-[14px] text-muted hover:text-ink" onClick={onClose}>Close camera</button>
    </div>
  );
}
