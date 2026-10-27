'use client';

import { useState } from 'react';
import { QrCode } from '@/components/QrCode';
import { Notice, Pill, btn } from '@/components/ui';
import { Credential, Me, api } from '@/lib/api';
import type { T } from '@/lib/i18n';
import { useLive } from '@/lib/useLive';

const verifyUrl = (token: string) => `${window.location.origin}/verify/#${token}`;

export function Passport({ me, t }: { me: Me; t: T }) {
  const [creds, setCreds] = useState<Credential[] | null>(null);
  const [copied, setCopied] = useState('');

  useLive(() => { void api<Credential[]>('/api/me/passport').then(setCreds); });

  async function share(c: Credential) {
    const url = verifyUrl(c.token);
    if (navigator.share) {
      await navigator.share({ title: c.skill, text: `${me.name}: ${c.skill}`, url }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(c.id);
    }
  }

  return (
    <div className="space-y-5">
      <section className="border-b border-rule pb-5">
        <h1 className="font-display text-[2rem] leading-[1.1] tracking-[-0.02em]">{t('passport_title')}</h1>
        <p className="mt-2 text-[15px] text-muted">{t('passport_help')}</p>
      </section>
      {creds?.length === 0 && <Notice tone="muted" icon="badge">{t('no_credentials')}</Notice>}
      {creds?.map((c) => (
        <article key={c.id} className="overflow-hidden rounded-xl border border-rule bg-surface shadow-sheet">
          <div className="flex items-center justify-between border-b border-rule bg-desk px-5 py-2.5">
            <span className="text-[12px] font-medium text-seal">{me.name} · {me.trade}</span>
            <Pill tone="verify">Ed25519 signed</Pill>
          </div>
          <div className="flex flex-col items-center gap-5 p-5 sm:flex-row sm:items-start">
            <div className="rounded-lg border border-rule bg-white p-2"><QrCode value={verifyUrl(c.token)} label={`${c.skill}: verification code`} size={150} /></div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="font-display text-[1.3rem] leading-tight">{c.skill}</h2>
              <p className="mt-1.5 text-[14px] text-muted">
                {t('issued_by', { issuer: c.issuer, date: new Date(c.issued).toLocaleDateString('en-IN', { dateStyle: 'medium' }) })}
              </p>
              <button className={`${btn} mt-4 px-4 py-2`} onClick={() => void share(c)}>{copied === c.id ? t('copied') : t('copy_link')}</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
