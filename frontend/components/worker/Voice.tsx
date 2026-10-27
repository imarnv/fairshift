'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon, Notice, bigSecondary } from '@/components/ui';
import type { Lang } from '@/lib/api';
import type { T } from '@/lib/i18n';
import { VoiceEvent, startVoice } from '@/lib/voice';

type Line = { role: 'user' | 'assistant' | 'action'; text: string };

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/* Full-screen talk panel. One big button, live captions, nothing to read to get started. */
export function Voice({ t, lang, onClose }: { t: T; lang: Lang; onClose: () => void }) {
  const [state, setState] = useState<'connecting' | 'live' | 'error'>('connecting');
  const [message, setMessage] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const stop = useRef<(() => void) | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const onEvent = (e: VoiceEvent) => {
      if (e.type === 'ready') setState('live');
      else if (e.type === 'error') { setState('error'); setMessage(e.message); }
      else if (e.type === 'closed') setState((s) => (s === 'live' ? s : 'error'));
      else if (e.type === 'action') {
        const text = e.name === 'report_hazard'
          ? t('report_sent', { who: e.result.assigned_to ?? '', due: e.result.deadline ? when(e.result.deadline) : '' })
          : t('feedback_sent');
        setLines((prev) => [...prev, { role: 'action', text }]);
      }
      else if (e.type === 'transcript') {
        // Captions arrive in fragments; join consecutive fragments from the same speaker.
        setLines((prev) => {
          const last = prev[prev.length - 1];
          return last?.role === e.role ? [...prev.slice(0, -1), { ...last, text: last.text + e.text }] : [...prev, { role: e.role, text: e.text }];
        });
      }
    };
    startVoice(lang, onEvent)
      .then((s) => { if (cancelled) s(); else stop.current = s; })
      .catch(() => { setState('error'); setMessage(t('mic_denied')); });
    return () => { cancelled = true; stop.current?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one session per open panel
  }, []);

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [lines]);

  return (
    <div role="dialog" aria-modal="true" aria-label={t('talk')} className="fixed inset-0 z-40 flex flex-col bg-paper">
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-10">
        <div className="mx-auto max-w-lg space-y-3" aria-live="polite">
          <h1 className="font-display text-[2rem] leading-[1.1] tracking-[-0.02em]">{t('talk')}</h1>
          <p className="border-b border-rule pb-5 text-[15px] text-muted">{t('talk_help')}</p>
          {lines.map((l, i) => l.role === 'action' ? (
            <div key={i} className="mx-auto max-w-[92%]"><Notice tone="verify" icon="check">{l.text}</Notice></div>
          ) : (
            <p key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15.5px] leading-relaxed ${
              l.role === 'user' ? 'ml-auto bg-seal text-white' : 'border border-rule bg-surface shadow-sheet'}`}>
              {l.text}
            </p>
          ))}
          <div ref={end} />
        </div>
      </div>

      <div className="border-t border-rule bg-surface px-4 pb-8 pt-6">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
          {state === 'error'
            ? <div className="w-full"><Notice tone="query" icon="alert">{message || t('voice_unavailable')}</Notice></div>
            : (
              <>
                <span className={`relative grid h-24 w-24 place-items-center rounded-full bg-seal text-white ${state === 'live' ? 'pulse-ring' : 'opacity-60'}`}>
                  <Icon name="mic" className="relative h-10 w-10" />
                </span>
                <p className="font-display text-[1.15rem]" role="status">{state === 'live' ? t('listening') : t('connecting')}</p>
              </>
            )}
          <button className={`${bigSecondary} max-w-xs`} onClick={onClose}>{t('end_call')}</button>
        </div>
      </div>
    </div>
  );
}
