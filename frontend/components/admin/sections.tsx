'use client';

import { useState } from 'react';
import { SiteArt } from '@/components/SiteArt';
import { Card, Heading, Icon, IconName, Notice, Pill, Stat, Tile, barColour, btn, field, levelTone, primary } from '@/components/ui';
import { FeedbackGroup, HazardView, Overview, Reason, WorkerStatus, api } from '@/lib/api';
import { useLive } from '@/lib/useLive';

type Go = (s: 'overview' | 'workers' | 'safety' | 'feedback') => void;

const SECTOR: Record<string, [string, IconName]> = {
  construction: ['Construction', 'building'], hospital: ['Hospital', 'hospital'], education: ['College', 'college'], factory: ['Factory', 'factory'],
};
const STATUS: Record<HazardView['status'], [string, 'caution' | 'seal' | 'verify']> = {
  open: ['Open', 'caution'], in_progress: ['Being fixed', 'seal'], resolved: ['Fixed', 'verify'],
};

const REASON: Record<string, (r: Reason) => string> = {
  week_over_60: (r) => `${r.value} h in 7 days, over 60`,
  week_over_48: (r) => `${r.value} h in 7 days, over 48`,
  long_shifts: (r) => `${r.value} shifts over 12 h`,
  short_rest: (r) => `${r.value}× under 11 h rest`,
  no_rest_day: (r) => `${r.value} days without a day off`,
  fatigue_high: () => 'Severe fatigue',
  fatigue_medium: () => 'Long hours',
  attendance_drop: (r) => `Hours down ${r.value}% on the fortnight before`,
  new_joiner: () => 'Joined under 90 days ago',
  reports_ignored: (r) => `${r.value} safety report left overdue`,
  low_site_rating: (r) => `Site rated ${r.value}/5 by staff`,
};
const reason = (r: Reason) => REASON[r.code]?.(r) ?? r.code;
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const indexTone = (n: number) => (n >= 70 ? 'verify' : n >= 50 ? 'caution' : 'query');

function useData<T>(path: string, version = 0) {
  const [data, setData] = useState<T | null>(null);
  useLive(() => { void api<T>(path).then(setData); }, [path, version]);
  return data;
}

/* ── Overview ─────────────────────────────────────────────────────────────── */

export function OverviewSection({ name, overview: o, go }: { name: string; overview: Overview | null; go: Go }) {
  const hazards = useData<HazardView[]>('/api/admin/hazards');
  const workers = useData<WorkerStatus[]>('/api/admin/workers');
  const now = new Date();
  const hour = now.getHours();
  const part = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : 'evening';
  const status = o
    ? [o.overdue_hazards && `${o.overdue_hazards} hazard${o.overdue_hazards === 1 ? '' : 's'} past deadline`,
       o.fatigue_high && `${o.fatigue_high} worker${o.fatigue_high === 1 ? '' : 's'} need rest`].filter(Boolean).join(' · ') || 'Every site is in good shape.'
    : 'Loading your sites…';
  const urgent = (hazards ?? []).filter((h) => h.status !== 'resolved').slice(0, 4);
  const atRisk = (workers ?? []).filter((w) => w.quit_risk.level !== 'low').slice(0, 4);

  return (
    <>
      {/* An open header: the drawing stands on the rule beneath the greeting, like an object on a desk. */}
      <section className="mb-10 flex items-end justify-between gap-8 border-b border-rule">
        <div className="pb-8 pt-2">
          <p className="text-[13px] font-medium text-seal">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="mt-3 font-display text-[2.4rem] leading-[1.05] tracking-[-0.03em] sm:text-[3.25rem]">Good {part}, {name}</h1>
          <p className="mt-3 text-[15px] text-muted">{status}</p>
          {o && o.overdue_hazards > 0 && <button onClick={() => go('safety')} className={`${btn} mt-5 px-4 py-2`}>Review hazards</button>}
        </div>
        <SiteArt className="pointer-events-none -mb-[9px] hidden h-[170px] w-auto shrink-0 md:block" />
      </section>

      {o && (
        <>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[1.6rem] leading-tight">Your sites</h2>
            <span className="text-[14px] text-muted">Ranked by Fair Workplace Index</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {o.sites.map((s, i) => (
              <button key={s.id} onClick={() => go('workers')} style={{ animationDelay: `${i * 45}ms` }}
                      className="rise group relative flex flex-col overflow-hidden rounded-xl border border-rule bg-surface p-4 text-left shadow-sheet transition duration-200 hover:-translate-y-0.5 hover:border-seal/40 hover:shadow-[0_18px_36px_-18px_rgb(61_57_41/0.28)] focus-visible:-translate-y-0.5">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-seal transition-transform duration-300 ease-out group-hover:scale-x-100" />
                <div className="flex items-start justify-between">
                  <Tile icon={SECTOR[s.sector][1]} />
                  <span className="text-right">
                    <span className="block font-display text-[1.75rem] leading-none tabular-nums">{s.fairness_index}</span>
                    <span className="text-[11px] text-muted">index</span>
                  </span>
                </div>
                <h3 className="mt-3 font-display text-[1.1rem] leading-tight">{s.name}</h3>
                <p className="mt-1 text-[12.5px] leading-snug text-muted">
                  {SECTOR[s.sector][0]} · {s.city} · {s.workers} workers · rated {s.rating ?? 'n/a'}
                </p>
                <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-seal/10">
                  <span className={`block h-full rounded-full ${barColour(indexTone(s.fairness_index))}`} style={{ width: `${s.fairness_index}%` }} />
                </span>
              </button>
            ))}
          </div>

          <div className="mb-3 mt-10 flex items-baseline justify-between">
            <h2 className="font-display text-[1.6rem] leading-tight">This week</h2>
            <button onClick={() => go('workers')} className="text-[13px] font-medium text-seal hover:underline">All workers →</button>
          </div>
          <div className="grid divide-y divide-rule rounded-xl border border-rule bg-desk sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <Stat icon="clock" label="Hours worked" value={o.week_hours.toLocaleString('en-IN')} note={`${o.on_site} on site right now`} />
            <Stat icon="alert" label="Need rest" value={o.fatigue_high} note="Over 60 h, or no day off" />
            <Stat icon="users" label="Likely to leave" value={o.quit_risk_high} note="Quit-risk score of 50+" />
            <Stat icon="shield" label="Open hazards" value={o.open_hazards} note={`${o.overdue_hazards} past deadline, escalated`} />
          </div>

          <Card className="mt-6 p-5"><HoursChart days={o.daily_hours} /></Card>
        </>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <Card title="Needs action" action={<button className="text-[13px] font-medium text-seal hover:underline" onClick={() => go('safety')}>All hazards →</button>}>
          <ul className="divide-y divide-rule">
            {urgent.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">{h.description}</p>
                  <p className={`mt-0.5 text-[13px] ${h.overdue ? 'text-query' : 'text-muted'}`}>
                    {h.site} · {h.overdue ? `overdue, now with ${h.assigned_to}` : `due ${when(h.due)}`}
                  </p>
                </div>
                <Pill tone={levelTone(h.severity)}>{h.severity}</Pill>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Likely to leave" action={<button className="text-[13px] font-medium text-seal hover:underline" onClick={() => go('workers')}>All workers →</button>}>
          <ul className="divide-y divide-rule">
            {atRisk.map((w) => (
              <li key={w.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium">{w.name} <span className="font-normal text-muted">· {w.trade}</span></p>
                  <p className="mt-0.5 text-[13px] text-muted">{w.quit_risk.reasons.map(reason).join(' · ')}</p>
                </div>
                <Pill tone={levelTone(w.quit_risk.level)}>{w.quit_risk.score}</Pill>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section className="mt-10 grid gap-px overflow-hidden rounded-xl border border-rule bg-rule md:grid-cols-3">
        {[['SDG 8.5 · Fair pay', 'Overtime at the legal double rate, on a payslip every worker can hear in their own language.'],
          ['SDG 8.8 · Safe work', 'Hazards carry deadlines and escalate on their own; fatigue is flagged before it causes injury.'],
          ['SDG 8.8 · Labour rights', 'Workers speak up without fear: feedback is encrypted and never linked to a name.']].map(([title, body]) => (
          <div key={title} className="bg-surface p-5">
            <p className="text-[12px] font-medium text-seal">{title}</p>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </section>
    </>
  );
}

/** Hours worked per day across every site, after Docify's pages chart. Hover a day for its value. */
function HoursChart({ days }: { days: Overview['daily_hours'] }) {
  const top = Math.max(...days.map((d) => d.hours));
  const max = Math.max(40, Math.ceil(top / 40) * 40);   // a round scale, so gridlines read as whole numbers
  const total = days.reduce((n, d) => n + d.hours, 0);
  return (
    <div>
      <p className="text-[13px] text-muted">Hours worked by day</p>
      <p className="mt-1 font-display text-[1.75rem] leading-none tabular-nums">
        {total.toLocaleString('en-IN')}<span className="ml-2 font-sans text-[14px] font-normal text-muted">hours in the last {days.length} days</span>
      </p>
      <div className="mt-7 flex gap-2">
        <div className="flex h-36 flex-col justify-between text-right text-[10.5px] tabular-nums text-muted" aria-hidden="true">
          <span className="-mt-1.5">{max}</span><span>{max / 2}</span><span className="-mb-1.5">0</span>
        </div>
        <div className="relative h-36 flex-1">
          {[0, 50, 100].map((y) => <div key={y} className="absolute inset-x-0 border-t border-dashed border-rule" style={{ top: `${y}%` }} />)}
          <div className="relative flex h-full items-end gap-[3px]">
            {days.map((d) => (
              <div key={d.date} className="group relative flex h-full flex-1 items-end justify-center hover:bg-ink/[0.03]"
                   role="img" aria-label={`${fmtDay(d.date)}: ${d.hours} hours`}>
                {d.hours > 0 && <div className="w-full max-w-[26px] rounded-t-[3px] bg-seal group-hover:bg-ink" style={{ height: `${Math.max(3, (d.hours / max) * 100)}%` }} />}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-paper group-hover:block">
                  {fmtDay(d.date)} · {d.hours} h
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-8 mt-2 flex justify-between text-[11px] text-muted" aria-hidden="true">
        <span>{fmtDay(days[0].date)}</span><span>Today</span>
      </div>
    </div>
  );
}

/* ── Workers ──────────────────────────────────────────────────────────────── */

export function WorkersSection({ sites }: { sites: Overview['sites'] }) {
  const [site, setSite] = useState('');
  const [presence, setPresence] = useState<'' | 'on' | 'off'>('');
  const [endorsing, setEndorsing] = useState<string | null>(null);
  const [skill, setSkill] = useState('');
  const [done, setDone] = useState('');
  const rows = useData<WorkerStatus[]>('/api/admin/workers');
  const siteName = Object.fromEntries(sites.map((s) => [s.id, s.name]));
  const shown = (rows ?? []).filter((w) => (!site || w.site_id === site) && (!presence || w.checked_in === (presence === 'on')));
  const onSite = (rows ?? []).filter((w) => w.checked_in).length;

  async function endorse(id: string, worker: string) {
    await api(`/api/admin/workers/${id}/credentials`, { body: { skill } });
    setDone(`Signed “${skill}” into ${worker}’s Skill Passport.`);
    setEndorsing(null);
    setSkill('');
  }

  return (
    <>
      <Heading kicker="Workers" title="Who needs attention" sub="Sorted by quit risk. Each flag names the rule that raised it, so you can fix the cause instead of guessing.">
        <div className="flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label="Show" className="flex gap-0.5 rounded-lg border border-rule bg-surface p-0.5 text-[13px]">
          {([['', 'Everyone'], ['on', `On site now · ${onSite}`], ['off', 'Off site']] as const).map(([v, label]) => (
            <button key={v} role="radio" aria-checked={presence === v} onClick={() => setPresence(v)}
                    className={`rounded-md px-2.5 py-1 ${presence === v ? 'bg-ink/[0.08] font-medium text-ink' : 'text-muted hover:text-ink'}`}>{label}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[14px] text-muted">
          Site
          <select className={`${field} w-auto py-1.5 text-[14px] text-ink`} value={site} onChange={(e) => setSite(e.target.value)}>
            <option value="">All sites</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        </div>
      </Heading>
      {done && <div className="mb-4"><Notice tone="verify" icon="check">{done}</Notice></div>}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[14px]">
            <caption className="sr-only">Workers with their fatigue and quit-risk flags</caption>
            <thead className="border-b border-rule text-[12px] text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Worker</th>
                <th scope="col" className="px-3 py-3 font-medium">Right now</th>
                <th scope="col" className="px-3 py-3 font-medium">Hours, 7 days</th>
                <th scope="col" className="px-3 py-3 font-medium">Fatigue</th>
                <th scope="col" className="px-3 py-3 font-medium">Quit risk</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Skill Passport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {shown.length === 0 && rows && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">No workers match these filters.</td></tr>
              )}
              {shown.map((w) => (
                <tr key={w.id} className="align-top transition-colors hover:bg-paper/60">
                  <td className="px-5 py-3.5">
                    <p className="font-medium">{w.name}</p>
                    <p className="text-[12.5px] text-muted">{w.trade} · {siteName[w.site_id]}</p>
                  </td>
                  <td className="px-3 py-3.5">
                    {w.on_site_since
                      ? <Pill tone="verify">On site · since {new Date(w.on_site_since).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</Pill>
                      : <Pill tone="muted">Off site</Pill>}
                  </td>
                  <td className="px-3 py-3.5 font-medium tabular-nums">{w.fatigue.week_hours}</td>
                  <td className="max-w-[220px] px-3 py-3.5">
                    <Pill tone={levelTone(w.fatigue.level)}>{w.fatigue.level === 'ok' ? 'Rested' : w.fatigue.level === 'high' ? 'Needs rest' : 'Long hours'}</Pill>
                    <p className="mt-1 text-[12.5px] text-muted">{w.fatigue.reasons.map(reason).join(' · ')}</p>
                  </td>
                  <td className="max-w-[260px] px-3 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 font-medium tabular-nums">{w.quit_risk.score}</span>
                      <span className="block h-1.5 w-20 overflow-hidden rounded-full bg-seal/10" aria-hidden="true">
                        <span className={`block h-full rounded-full ${barColour(levelTone(w.quit_risk.level))}`} style={{ width: `${w.quit_risk.score}%` }} />
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-muted">{w.quit_risk.reasons.map(reason).join(' · ')}</p>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {endorsing === w.id ? (
                      <form className="flex justify-end gap-2" onSubmit={(e) => { e.preventDefault(); void endorse(w.id, w.name); }}>
                        <label className="sr-only" htmlFor={`skill-${w.id}`}>Skill to certify for {w.name}</label>
                        <input id={`skill-${w.id}`} className={`${field} w-44 py-1.5 text-[14px]`} placeholder="e.g. First aid" autoFocus
                               minLength={3} maxLength={80} required value={skill} onChange={(e) => setSkill(e.target.value)} />
                        <button className={primary}>Sign</button>
                      </form>
                    ) : (
                      <button className={btn} onClick={() => setEndorsing(w.id)}>Certify a skill</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ── Safety ───────────────────────────────────────────────────────────────── */

export function SafetySection() {
  const [version, setVersion] = useState(0);
  const list = useData<HazardView[]>('/api/admin/hazards', version);

  async function setStatus(id: string, status: string) {
    await api(`/api/admin/hazards/${id}`, { method: 'PATCH', body: { status } });
    setVersion((v) => v + 1);
  }

  return (
    <>
      <Heading kicker="Safety" title="Hazard reports"
               sub="Critical hazards must be fixed in 4 hours, high in 24, medium in 3 days. A missed deadline moves the report to the site manager, then to HR & Safety." />
      <Card>
        <ul className="divide-y divide-rule">
          {(list ?? []).map((h) => (
            <li key={h.id} className="relative flex flex-wrap items-start justify-between gap-4 px-5 py-4">
              {h.overdue && <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-tape" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={levelTone(h.severity)}>{h.severity}</Pill>
                  <span className="text-[12px] capitalize text-muted">{h.category}</span>
                  {h.channel === 'voice' && <span className="inline-flex items-center gap-1 text-[12px] text-seal"><Icon name="mic" className="h-3.5 w-3.5" />by voice</span>}
                </div>
                <p className="mt-1.5 text-[15px] font-medium">{h.description}</p>
                <p className="mt-0.5 text-[13px] text-muted">{h.site}{h.location && ` · ${h.location}`} · {h.reporter} · {when(h.created)}</p>
                <p className={`mt-1 text-[13px] font-medium ${h.overdue ? 'text-query' : h.status === 'resolved' ? 'text-verify' : 'text-muted'}`}>
                  {h.status === 'resolved' ? (h.met_deadline ? 'Fixed within its deadline' : 'Fixed, but late')
                    : h.overdue ? `Overdue since ${when(h.due)} · escalated to ${h.assigned_to}` : `Due ${when(h.due)} · ${h.assigned_to}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Pill tone={STATUS[h.status][1]}>{STATUS[h.status][0]}</Pill>
                <label>
                  <span className="sr-only">Change status of: {h.description}</span>
                  <select className={`${field} w-auto py-1.5 text-[14px]`} value={h.status} onChange={(e) => void setStatus(h.id, e.target.value)}>
                    {Object.entries(STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

/* ── Feedback ─────────────────────────────────────────────────────────────── */

export function FeedbackSection() {
  const groups = useData<FeedbackGroup[]>('/api/admin/feedback');
  return (
    <>
      <Heading kicker="Feedback" title="What staff say, anonymously"
               sub="No worker's name is ever stored with feedback. Comments are AES-256 encrypted and only opened once five or more different people at a site have answered, so no one can be singled out." />
      <div className="grid gap-6 lg:grid-cols-2">
        {(groups ?? []).map((g) => (
          <Card key={g.site_id} title={g.site} action={<span className="text-[13px] text-muted">{g.responses} responses</span>}>
            {g.hidden ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-seal/40 text-seal"><Icon name="lock" /></span>
                <p className="mt-4 font-display text-[1.1rem]">Withheld to protect anonymity</p>
                <p className="mt-1 max-w-[28ch] text-[13.5px] text-muted">{g.people} of the {g.needed} different people needed before anything is shown.</p>
              </div>
            ) : (
              <div className="space-y-5 p-5">
                <p className="font-display text-[2.1rem] leading-none tabular-nums">{g.average}<span className="ml-2 font-sans text-[14px] font-normal text-muted">out of 5</span></p>
                <dl className="space-y-2.5 text-[14px]">
                  {Object.entries(g.topics ?? {}).map(([topic, avg]) => (
                    <div key={topic} className="flex items-center gap-3">
                      <dt className="w-24 capitalize text-muted">{topic}</dt>
                      <dd className="flex flex-1 items-center gap-2">
                        <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-seal/10" aria-hidden="true">
                          <span className={`block h-full rounded-full ${barColour(avg >= 3.5 ? 'verify' : avg >= 2.5 ? 'caution' : 'query')}`} style={{ width: `${(avg / 5) * 100}%` }} />
                        </span>
                        <span className="w-8 text-right tabular-nums">{avg}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <ul className="space-y-2 border-t border-rule pt-4">
                  {g.comments?.map((c) => <li key={c} className="rounded-lg bg-paper px-3 py-2 text-[14px] leading-relaxed">“{c}”</li>)}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
