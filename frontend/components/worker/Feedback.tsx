'use client';

import { useState } from 'react';
import { Icon, Notice, bigPrimary, field } from '@/components/ui';
import { choice } from '@/components/worker/Safety';
import { api } from '@/lib/api';
import type { Key, T } from '@/lib/i18n';

const TOPICS = ['manager', 'conditions', 'pay', 'safety'] as const;
const FACES = ['😞', '🙁', '😐', '🙂', '😄'];  // faces carry the meaning for workers who cannot read the labels

export function Feedback({ t }: { t: T }) {
  const [topic, setTopic] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('busy');
    try {
      await api('/api/feedback', { body: { topic, rating, comment: comment || null } });
      setTopic(''); setRating(0); setComment('');
      setState('sent');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="space-y-5">
      <section className="border-b border-rule pb-5">
        <h1 className="font-display text-[2rem] leading-[1.1] tracking-[-0.02em]">{t('feedback_title')}</h1>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-rule bg-desk p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-dashed border-seal/50 text-seal"><Icon name="lock" /></span>
          <p className="text-[14px] leading-relaxed text-muted">{t('feedback_private')}</p>
        </div>
      </section>

      <form className="space-y-6" onSubmit={submit}>
        <fieldset>
          <legend className="sr-only">Topic</legend>
          <div className="grid grid-cols-2 gap-2">
            {TOPICS.map((tp) => (
              <label key={tp} className={`${choice(topic === tp)} min-h-[52px] text-[15px]`}>
                <input type="radio" name="topic" className="sr-only" required checked={topic === tp} onChange={() => setTopic(tp)} />
                {t(`topic_${tp}` as Key)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2.5 text-[15px] font-semibold">{t('rating')}</legend>
          <div className="grid grid-cols-5 gap-2">
            {FACES.map((face, i) => (
              <label key={face} className={`${choice(rating === i + 1)} px-1 py-3`}>
                <input type="radio" name="rating" className="sr-only" required checked={rating === i + 1} onChange={() => setRating(i + 1)} />
                <span className="text-[1.7rem] leading-none" aria-hidden="true">{face}</span>
                <span className="text-[11px] leading-tight">{t(`rate_${i + 1}` as Key)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1.5 block text-[15px] font-semibold">{t('comment')}</span>
          <textarea className={`${field} min-h-[96px]`} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>

        {state === 'sent' && <Notice tone="verify" icon="check">{t('feedback_sent')}</Notice>}
        {state === 'error' && <Notice tone="query" icon="alert">{t('error_generic')}</Notice>}
        <button className={bigPrimary} disabled={state === 'busy'}>{t('send')}</button>
      </form>
    </div>
  );
}
