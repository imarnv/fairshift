'use client';

import { useEffect, useState } from 'react';
import { Payroll } from '@/components/admin/Payroll';
import { FeedbackSection, OverviewSection, SafetySection, WorkersSection } from '@/components/admin/sections';
import { ICONS, Icon, IconName, Wordmark } from '@/components/ui';
import { Me, Overview, api, session } from '@/lib/api';
import { useLive } from '@/lib/useLive';
import { useTab } from '@/lib/useTab';

type Section = 'overview' | 'workers' | 'payroll' | 'safety' | 'feedback';
const NAV: [Section, string, IconName][] = [
  ['overview', 'Overview', 'home'], ['workers', 'Workers', 'users'], ['payroll', 'Payroll', 'rupee'], ['safety', 'Safety', 'shield'], ['feedback', 'Feedback', 'lock'],
];
const SECTIONS = NAV.map(([id]) => id);

export default function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [section, go] = useTab(SECTIONS, 'overview');

  useEffect(() => {
    if (!session.get()) { window.location.href = '/login/'; return; }
    void api<Me>('/api/me').then((m) => {
      if (m.role !== 'manager') { window.location.href = '/worker/'; return; }
      setMe(m);
    });
  }, []);
  // the sidebar counts and the overview stay current while the page is open
  useLive(() => { if (me) void api<Overview>('/api/admin/overview').then(setOverview); }, [me]);

  if (!me) return null;
  const onSite = overview ? Math.round((100 * overview.on_site) / Math.max(1, overview.workers)) : 0;

  const navItem = ([id, label, icon]: [Section, string, IconName], mobile: boolean) => (
    <button key={id} onClick={() => go(id)} aria-current={section === id ? 'page' : undefined}
            className={`relative flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-[15px] transition-colors ${
              section === id ? 'bg-surface font-semibold text-ink shadow-sheet' : 'text-muted hover:bg-surface/70 hover:text-ink'
            } ${mobile ? '' : 'w-full'}`}>
      {section === id && !mobile && <span aria-hidden="true" className="absolute inset-y-2 -left-3 w-[3px] rounded-r-full bg-tape" />}
      <Icon name={icon} />{label}
    </button>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-rule bg-paper px-3 py-6 lg:flex">
        <button className="px-2 text-left" onClick={() => go('overview')} aria-label="Overview"><Wordmark /></button>
        <nav aria-label="Dashboard" className="mt-6 space-y-0.5">{NAV.map((n) => navItem(n, false))}</nav>
        {overview && overview.overdue_hazards > 0 && (
          <button onClick={() => go('safety')} className="mx-1 mt-4 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-left text-[13px] text-caution">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />{overview.overdue_hazards} hazard{overview.overdue_hazards === 1 ? '' : 's'} past deadline
          </button>
        )}
        <button onClick={() => go('workers')} className="mx-1 mb-4 mt-auto rounded-lg border border-rule bg-surface p-3 text-left shadow-sheet transition hover:border-seal/40">
          <span className="flex items-baseline justify-between text-[12px]">
            <span className="text-muted">On site now</span>
            <span className="text-[13px] font-medium tabular-nums">{overview ? `${overview.on_site} of ${overview.workers}` : '–'}</span>
          </span>
          <span className="mt-2 block h-1 overflow-hidden rounded-full bg-seal/10">
            <span className="block h-full rounded-full bg-seal/70 transition-[width] duration-700" style={{ width: `${onSite}%` }} />
          </span>
          <span className="mt-1.5 block text-[11px] text-muted">across {overview?.sites.length ?? 0} sites</span>
        </button>
        <div className="border-t border-rule px-2 pt-4">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-seal/10 text-[13px] font-semibold uppercase text-seal">
              {me.name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{me.name}</p>
              <button onClick={() => { session.clear(); window.location.href = '/login/'; }} className="text-[12px] text-muted hover:text-ink">Sign out</button>
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-10 border-b border-rule bg-paper/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Wordmark />
          <button onClick={() => { session.clear(); window.location.href = '/login/'; }} aria-label="Sign out" className="text-muted hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true"><path d={ICONS.logout} /></svg>
          </button>
        </div>
        <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto px-3 pb-2">{NAV.map((n) => navItem(n, true))}</nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-[100rem] px-4 py-8 sm:px-10 sm:py-10 2xl:px-16">
        {section === 'overview' && <OverviewSection name={me.name.split(' ')[0]} overview={overview} go={go} />}
        {section === 'workers' && <WorkersSection sites={overview?.sites ?? []} />}
        {section === 'payroll' && <Payroll sites={overview?.sites ?? []} />}
        {section === 'safety' && <SafetySection />}
        {section === 'feedback' && <FeedbackSection />}
      </main>
    </div>
  );
}
