'use client';

import type { Lang } from '@/lib/api';
import { LANGS, langName } from '@/lib/i18n';

/* Each language is shown in its own script, so a worker finds theirs without reading English. */
export function LangPicker({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <label className="inline-flex items-center">
      <span className="sr-only">Language</span>
      <select value={lang} onChange={(e) => onChange(e.target.value as Lang)}
              className="rounded-md border border-rule bg-surface px-2 py-1.5 text-[14px] font-medium text-ink transition hover:border-ink/35">
        {LANGS.map((l) => <option key={l} value={l}>{langName(l)}</option>)}
      </select>
    </label>
  );
}
