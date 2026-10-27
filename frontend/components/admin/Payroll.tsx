'use client';

import { useEffect, useState } from 'react';
import { Card, Heading, Notice, Pill, Stat, field, primary, rupees } from '@/components/ui';
import { ApiError, Overview, PaymentView, Payroll as PayrollData, api } from '@/lib/api';
import { useLive } from '@/lib/useLive';

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const months = () => [0, 1, 2].map((back) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - back); return d; });
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Pay each worker's take-home for a month through PhonePe. The amount is the server's payslip figure. */
export function Payroll({ sites }: { sites: Overview['sites'] }) {
  const [month, setMonth] = useState(monthKey(new Date()));
  const [data, setData] = useState<PayrollData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const siteName = Object.fromEntries(sites.map((s) => [s.id, s.name]));

  const load = () => { void api<PayrollData>(`/api/admin/payroll?month=${month}`).then(setData); };
  useLive(load, [month]);

  // Back from PhonePe's page (?paid=<order>): ask the server, which asks PhonePe, what really happened.
  useEffect(() => {
    const order = new URLSearchParams(window.location.search).get('paid');
    if (!order) return;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    api<PaymentView>(`/api/admin/payroll/check/${encodeURIComponent(order)}`, { method: 'POST' })
      .then((p) => {
        setMessage(p.status === 'paid'
          ? { ok: true, text: `Paid ${rupees(p.amount)}. PhonePe transaction ${p.payment_id}.` }
          : { ok: false, text: p.status === 'failed' ? 'The payment failed. Nothing was paid.' : 'The payment was not completed. Nothing was paid.' });
        load();
      })
      .catch(() => setMessage({ ok: false, text: 'Could not confirm the payment with PhonePe. Refresh to check again.' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on return from PhonePe
  }, []);

  async function pay(id: string) {
    setBusy(id);
    setMessage(null);
    try {
      const order = await api<{ redirect_url: string }>(`/api/admin/payroll/${id}/order`, { body: { month } });
      window.location.href = order.redirect_url;   // PhonePe's own payment page; it sends the employer back here
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError && e.message ? e.message : 'The payment could not be started.' });
      setBusy(null);
    }
  }

  const rows = data?.workers ?? [];
  const total = rows.reduce((n, w) => n + w.net, 0);
  const paid = rows.filter((w) => w.payment?.status === 'paid');
  const paidTotal = paid.reduce((n, w) => n + w.net, 0);

  return (
    <>
      <Heading kicker="Payroll" title="Pay wages"
               sub="Each worker's take-home comes from their payslip, with overtime at double rate and PF and ESI deducted. Payments run through PhonePe and count only once PhonePe confirms them to the server.">
        <label className="flex items-center gap-2 text-[14px] text-muted">
          Month
          <select className={`${field} w-auto py-1.5 text-[14px] text-ink`} value={month} onChange={(e) => setMonth(e.target.value)}>
            {months().map((d) => <option key={monthKey(d)} value={monthKey(d)}>{d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</option>)}
          </select>
        </label>
      </Heading>

      {data && !data.enabled && (
        <div className="mb-4"><Notice tone="caution" icon="alert">Payments are not set up on this server yet: PhonePe sandbox credentials are needed.</Notice></div>
      )}
      {message && <div className="mb-4"><Notice tone={message.ok ? 'verify' : 'query'} icon={message.ok ? 'check' : 'alert'}>{message.text}</Notice></div>}

      <div className="mb-6 grid divide-y divide-rule rounded-xl border border-rule bg-desk sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat icon="rupee" label="Take-home this month" value={rupees(Math.round(total))} note={`${rows.length} workers`} />
        <Stat icon="check" label="Paid" value={rupees(Math.round(paidTotal))} note={`${paid.length} of ${rows.length} workers`} />
        <Stat icon="clock" label="Still to pay" value={rupees(Math.round(total - paidTotal))} note={`${rows.length - paid.length} workers`} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <caption className="sr-only">Wages for {month} and their payment status</caption>
            <thead className="border-b border-rule text-[12px] text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Worker</th>
                <th scope="col" className="px-3 py-3 font-medium">Hours</th>
                <th scope="col" className="px-3 py-3 font-medium">Take-home</th>
                <th scope="col" className="px-3 py-3 font-medium">Status</th>
                <th scope="col" className="px-5 py-3 text-right font-medium"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((w) => (
                <tr key={w.id} className="align-middle transition-colors hover:bg-paper/60">
                  <td className="px-5 py-3.5">
                    <p className="font-medium">{w.name}</p>
                    <p className="text-[12.5px] text-muted">{w.trade} · {siteName[w.site_id]}</p>
                  </td>
                  <td className="px-3 py-3.5 tabular-nums">{w.hours}</td>
                  <td className="px-3 py-3.5 font-medium tabular-nums">{rupees(w.net)}</td>
                  <td className="px-3 py-3.5">
                    {w.payment?.status === 'paid'
                      ? <><Pill tone="verify">Paid · {when(w.payment.paid_at!)}</Pill><p className="mt-1 font-mono text-[11.5px] text-muted">{w.payment.payment_id}</p></>
                      : <Pill tone="muted">Not paid</Pill>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {w.payment?.status !== 'paid' && (
                      <button className={primary} disabled={!data?.enabled || busy !== null || w.net < 1} onClick={() => void pay(w.id)}>
                        {busy === w.id ? 'Opening PhonePe…' : `Pay ${rupees(Math.round(w.net))}`}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-[12.5px] text-muted">
        {data?.mode === 'production' ? 'Live mode: payments move real money.' : 'PhonePe sandbox: use PhonePe\'s test payment options. No real money moves.'}
      </p>
    </>
  );
}
