'use client';

import { useCallback, useEffect, useState } from 'react';
import { LangPicker } from '@/components/LangPicker';
import { Icon, IconName, Wordmark } from '@/components/ui';
import { Feedback } from '@/components/worker/Feedback';
import { Home } from '@/components/worker/Home';
import { Passport } from '@/components/worker/Passport';
import { Pay } from '@/components/worker/Pay';
import { Safety } from '@/components/worker/Safety';
import { Voice } from '@/components/worker/Voice';
import { Lang, Me, api, session } from '@/lib/api';
import { Key, translator } from '@/lib/i18n';
import { useTab } from '@/lib/useTab';

const TABS: [string, IconName][] = [['home', 'home'], ['pay', 'rupee'], ['safety', 'shield'], ['feedback', 'chat'], ['passport', 'badge']];
const TAB_IDS = TABS.map(([id]) => id);

export default function WorkerApp() {
  const [me, setMe] = useState<Me | null>(null);
  const [tab, go] = useTab(TAB_IDS, 'home');
  const [talking, setTalking] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(() => {
    void api<Me>('/api/me').then((m) => {
      if (m.role !== 'worker') window.location.href = '/admin/';
      else setMe(m);
    });
  }, []);

  useEffect(() => {
    if (!session.get()) window.location.href = '/login/';
    else load();
  }, [load]);

  useEffect(() => { if (me) document.documentElement.lang = me.lang; }, [me]);

  if (!me) return null;
  const t = translator(me.lang);

  const changeLang = (lang: Lang) => {
    setMe({ ...me, lang });
    void api('/api/me/lang', { method: 'PUT', body: { lang } });
  };
  const signOut = () => { session.clear(); window.location.href = '/login/'; };

  return (
    <div className="min-h-dvh pb-28">
      <header className="sticky top-0 z-20 border-b border-rule bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <Wordmark className="text-[1.2rem] max-[360px]:text-[1rem]" />
          <div className="flex items-center gap-1">
            <button onClick={() => setTalking(true)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-seal px-3.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-ink">
              <Icon name="mic" className="h-[18px] w-[18px]" /> <span className="max-[400px]:sr-only">{t('talk')}</span>
            </button>
            <LangPicker lang={me.lang} onChange={changeLang} />
            <button className="grid h-10 w-9 place-items-center rounded-md text-muted hover:text-ink" onClick={signOut} aria-label={t('sign_out')}>
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-lg px-4 pt-6" key={`${tab}-${refresh}`}>
        {tab === 'home' && <Home me={me} t={t} lang={me.lang} onChange={load} />}
        {tab === 'pay' && <Pay t={t} lang={me.lang} />}
        {tab === 'safety' && <Safety t={t} />}
        {tab === 'feedback' && <Feedback t={t} />}
        {tab === 'passport' && <Passport me={me} t={t} />}
      </main>

      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-surface/95 backdrop-blur">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map(([id, icon]) => (
            <li key={id}>
              <button onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}
                      className={`relative flex min-h-[68px] w-full flex-col items-center justify-center gap-1 px-0.5 text-center text-[11px] leading-tight transition-colors ${
                        tab === id ? 'font-semibold text-seal' : 'text-muted hover:text-ink'}`}>
                {tab === id && <span aria-hidden="true" className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-tape" />}
                <Icon name={icon} className="h-6 w-6" />
                {t(`nav_${id}` as Key)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {talking && <Voice t={t} lang={me.lang} onClose={() => { setTalking(false); setRefresh((n) => n + 1); }} />}
    </div>
  );
}
