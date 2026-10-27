'use client';

import { useEffect, useState } from 'react';

/** The open section, kept in the URL hash (#safety), so a reload stays on it and the
 *  browser's Back button steps between sections. */
export function useTab<T extends string>(tabs: readonly T[], first: T): [T, (t: T) => void] {
  const [tab, setTab] = useState<T>(first);

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1) as T;
      setTab(tabs.includes(h) ? h : first);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [tabs, first]);

  const go = (t: T) => {
    if (t === tab) return;
    window.location.hash = t;   // fires hashchange, which sets the tab
    window.scrollTo(0, 0);
  };
  return [tab, go];
}
