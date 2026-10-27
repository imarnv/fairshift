'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, Notice, Wordmark, field, primary } from '@/components/ui';
import { api } from '@/lib/api';

type Result = { valid: boolean; claims: { name: string; skill: string; trade: string; issuer: string; issued: string } | null };

/* Public page a new employer opens from a Skill Passport QR. The credential sits in
   the URL fragment, which browsers never send to the server's access logs. */
export default function Verify() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const check = async (tk: string) => setResult(await api<Result>('/api/passport/verify', { body: { token: tk.trim() } }));

  useEffect(() => {
    const fromLink = window.location.hash.slice(1);
    if (fromLink) { setToken(fromLink); void check(fromLink); }
  }, []);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto max-w-xl px-6 py-6"><Link href="/" aria-label="ShiftSaathi home"><Wordmark className="text-[1.6rem]" /></Link></header>
      <main id="main" className="mx-auto max-w-xl space-y-6 px-6 pb-16 pt-6">
        <div>
          <p className="text-[13px] font-medium text-seal">Skill Passport</p>
          <h1 className="mt-2 font-display text-[2.4rem] leading-[1.1] tracking-[-0.01em]">Check a credential</h1>
          <p className="mt-2 text-[15px] text-muted">Each credential is signed by the employer who issued it. Change even one letter and the check fails.</p>
        </div>
        {result && (result.valid && result.claims ? (
          <Card>
            <div className="space-y-4 p-5">
              <Notice tone="verify" icon="check"><strong>Genuine.</strong> The signature matches.</Notice>
              <dl className="grid grid-cols-[110px_1fr] gap-y-2.5 text-[15px]">
                <dt className="text-muted">Worker</dt><dd className="font-semibold">{result.claims.name}</dd>
                <dt className="text-muted">Skill</dt><dd className="font-semibold">{result.claims.skill}</dd>
                <dt className="text-muted">Trade</dt><dd>{result.claims.trade}</dd>
                <dt className="text-muted">Issued by</dt><dd>{result.claims.issuer}</dd>
                <dt className="text-muted">Date</dt><dd>{new Date(result.claims.issued).toLocaleDateString('en-IN', { dateStyle: 'long' })}</dd>
              </dl>
            </div>
          </Card>
        ) : <Notice tone="query" icon="alert"><strong>Not genuine.</strong> This credential was altered, or was not issued through ShiftSaathi.</Notice>)}
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void check(token); }}>
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-medium">Credential code</span>
            <textarea className={`${field} min-h-[96px] font-mono text-[12.5px]`} required maxLength={2000} value={token} onChange={(e) => setToken(e.target.value)} />
          </label>
          <button className={`${primary} py-2.5`}>Check credential</button>
        </form>
      </main>
    </div>
  );
}
