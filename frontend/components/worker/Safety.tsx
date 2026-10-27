'use client';

import { useState } from 'react';
import { Card, Icon, IconName, Notice, Pill, bigPrimary, field, levelTone } from '@/components/ui';
import { ApiError, HazardView, api } from '@/lib/api';
import type { Key, T } from '@/lib/i18n';
import { useLive } from '@/lib/useLive';

const CATEGORIES = ['fall', 'electrical', 'fire', 'chemical', 'biohazard', 'equipment', 'ergonomic', 'other'] as const;
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const STATUS_TONE = { open: 'caution', in_progress: 'seal', resolved: 'verify' } as const;

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** A big picture button for a radio choice: the icon carries the meaning for workers who read little. */
export const choice = (selected: boolean) =>
  `relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border bg-surface p-3 text-center text-[13.5px] transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-seal/20 ${
    selected ? 'border-seal font-semibold text-ink shadow-sheet ring-1 ring-seal' : 'border-rule text-ink hover:border-seal/40'}`;

export function Safety({ t }: { t: T }) {
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [mine, setMine] = useState<HazardView[]>([]);

  const load = () => { void api<HazardView[]>('/api/me/hazards').then(setMine); };
  useLive(load);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const h = await api<HazardView>('/api/hazards', { body: { category, severity, description, location, anonymous } });
      setResult({ ok: true, text: t('report_sent', { who: h.assigned_to, due: when(h.due) }) });
      setCategory(''); setSeverity(''); setDescription(''); setLocation('');
      load();
    } catch (err) {
      setResult({ ok: false, text: err instanceof ApiError && err.message ? err.message : t('error_generic') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="border-b border-rule pb-5">
        <h1 className="font-display text-[2rem] leading-[1.1] tracking-[-0.02em]">{t('safety_title')}</h1>
        <p className="mt-3 flex items-center gap-2 text-[14.5px] font-medium text-query"><Icon name="alert" />{t('emergency')}</p>
      </section>

      <form className="space-y-6" onSubmit={submit}>
        <fieldset>
          <legend className="mb-2.5 text-[15px] font-semibold">{t('what_danger')}</legend>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((c) => (
              <label key={c} className={choice(category === c)}>
                <input type="radio" name="category" value={c} className="sr-only" required checked={category === c} onChange={() => setCategory(c)} />
                <span className={category === c ? 'text-seal' : 'text-muted'}><Icon name={c as IconName} className="h-7 w-7" /></span>
                {t(`cat_${c}` as Key)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2.5 text-[15px] font-semibold">{t('how_serious')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {SEVERITIES.map((s) => (
              <label key={s} className={`${choice(severity === s)} flex-row justify-start px-4 py-3.5`}>
                <input type="radio" name="severity" value={s} className="sr-only" required checked={severity === s} onChange={() => setSeverity(s)} />
                <span className={`h-2.5 w-2.5 rounded-full ${s === 'low' ? 'bg-verify' : s === 'medium' ? 'bg-amber-500' : 'bg-query'}`} aria-hidden="true" />
                {t(`sev_${s}` as Key)}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1.5 block text-[15px] font-semibold">{t('describe')}</span>
          <textarea className={`${field} min-h-[96px]`} required minLength={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[15px] font-semibold">{t('where')}</span>
          <input className={field} maxLength={120} value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-rule bg-surface px-4 text-[15px]">
          <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--seal))]" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          <Icon name="lock" className="h-[18px] w-[18px] text-seal" />{t('anonymous')}
        </label>
        {result && <Notice tone={result.ok ? 'verify' : 'query'} icon={result.ok ? 'check' : 'alert'}>{result.text}</Notice>}
        <button className={bigPrimary} disabled={busy}>{t('submit_report')}</button>
      </form>

      {mine.length > 0 && (
        <Card title={t('my_reports')}>
          <ul className="divide-y divide-rule">
            {mine.map((h) => (
              <li key={h.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] font-medium">{h.description}</p>
                  <Pill tone={STATUS_TONE[h.status]}>{t(`status_${h.status}` as Key)}</Pill>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                  <Pill tone={levelTone(h.severity)}>{t(`sev_${h.severity}` as Key)}</Pill>
                  {when(h.created)}
                  {h.reporter === 'Anonymous' && <span className="inline-flex items-center gap-1"><Icon name="lock" className="h-3.5 w-3.5" />{t('sent_anonymously')}</span>}
                  {h.overdue && <span className="font-medium text-query">· {t('overdue', { who: h.assigned_to })}</span>}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
