'use client';

import { useEffect, useState } from 'react';
import { Card, Icon, Pill, bigSecondary, field, rupees } from '@/components/ui';
import { Lang, Payslip, api } from '@/lib/api';
import { Key, T, speak } from '@/lib/i18n';

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const months = () => [0, 1, 2].map((back) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - back); return d; });

export function Pay({ t, lang }: { t: T; lang: Lang }) {
  const [month, setMonth] = useState(monthKey(new Date()));
  const [slip, setSlip] = useState<Payslip | null>(null);
  const [talking, setTalking] = useState(false);

  useEffect(() => { void api<Payslip>(`/api/me/payslip?month=${month}`).then(setSlip); }, [month]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const label = (d: Date) => d.toLocaleDateString(`${lang}-IN`, { month: 'long', year: 'numeric' });

  function readAloud() {
    if (!slip) return;
    if (talking) { window.speechSynthesis.cancel(); setTalking(false); return; }
    const parts = [
      `${t('take_home')}: ${rupees(slip.net)}.`,
      ...slip.lines.filter((l) => l.amount).map((l) => `${t(`line_${l.key}` as Key)}: ${rupees(l.amount)}.`),
      t('days_worked', { value: slip.days_worked }),
    ];
    setTalking(true);
    speak(parts.join(' '), lang, () => setTalking(false));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-5">
        <h1 className="font-display text-[2rem] leading-[1.1] tracking-[-0.02em]">{t('nav_pay')}</h1>
        <label>
          <span className="sr-only">Month</span>
          <select className={`${field} w-auto py-2 text-[14px]`} value={month} onChange={(e) => setMonth(e.target.value)}>
            {months().map((d) => <option key={monthKey(d)} value={monthKey(d)}>{label(d)}</option>)}
          </select>
        </label>
      </div>

      {slip && (
        <>
          <div className="rounded-xl border border-rule bg-desk p-5">
            <p className="flex items-center gap-2 text-[13px] text-muted"><span className="text-seal"><Icon name="rupee" className="h-4 w-4" /></span>{t('take_home')}</p>
            <p className="mt-2 font-display text-[clamp(2rem,10vw,2.8rem)] leading-none tabular-nums">{rupees(slip.net)}</p>
            <div className="mt-3">
              {slip.payment?.status === 'paid'
                ? <Pill tone="verify">{t('paid_on', { date: new Date(slip.payment.paid_at!).toLocaleDateString(`${lang}-IN`, { day: 'numeric', month: 'short' }) })}</Pill>
                : <Pill tone="muted">{t('not_paid_yet')}</Pill>}
              {slip.payment?.payment_id && <p className="mt-1 font-mono text-[11.5px] text-muted">PhonePe {slip.payment.payment_id}</p>}
            </div>
            <p className="mt-2 text-[13px] text-muted">
              {t('days_worked', { value: slip.days_worked })} · {Math.round(slip.regular_hours + slip.overtime_hours)} h · ₹{slip.hourly_rate}/h
            </p>
            <button className={`${bigSecondary} mt-4`} onClick={readAloud} aria-pressed={talking}>
              <Icon name="speaker" className="h-5 w-5 text-seal" /> {talking ? t('stop') : t('read_aloud')}
            </button>
          </div>

          <Card>
            <dl className="divide-y divide-rule">
              {slip.lines.map((l) => (
                <div key={l.key} className="flex items-start justify-between gap-4 px-5 py-3.5">
                  <div>
                    <dt className="text-[15px] font-medium">{t(`line_${l.key}` as Key)}</dt>
                    <dd className="mt-0.5 font-mono text-[12px] text-muted">{l.detail}</dd>
                  </div>
                  <dd className={`text-[15px] font-semibold tabular-nums ${l.amount < 0 ? 'text-query' : l.key === 'overtime' && l.amount ? 'text-verify' : ''}`}>
                    {l.amount < 0 ? '−' : ''}{rupees(l.amount)}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between rounded-b-xl bg-paper px-5 py-3.5 font-semibold">
                <dt>{t('gross')}</dt><dd className="tabular-nums">{rupees(slip.gross)}</dd>
              </div>
            </dl>
          </Card>
        </>
      )}
    </div>
  );
}
