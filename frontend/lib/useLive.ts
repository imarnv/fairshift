'use client';

import { DependencyList, useEffect, useRef } from 'react';

const EVERY_MS = 15_000;

/** Runs `load` now, then every 15 s while the page is visible, and again the moment the
 *  tab comes back into view, so a manager's update reaches the worker without a reload.
 *  Limit: polling, not push. Fine for a few hundred users; move to Firestore listeners
 *  or server-sent events when traffic makes 15 s polls costly. */
export function useLive(load: () => void, deps: DependencyList = []) {
  const latest = useRef(load);
  latest.current = load;

  useEffect(() => {
    const run = () => { if (document.visibilityState === 'visible') latest.current(); };
    latest.current();
    const timer = setInterval(run, EVERY_MS);
    document.addEventListener('visibilitychange', run);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', run); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller's deps decide when to restart
  }, deps);
}
