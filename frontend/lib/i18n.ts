import strings from './strings.json';
import type { Lang } from './api';

export type Key = keyof typeof strings.en;
export const LANGS = Object.keys(strings) as Lang[];

/* BCP-47 tags for <html lang> and for the browser's speech voices. */
export const SPEECH_TAG: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN' };

export function translator(lang: Lang) {
  return (key: Key, vars: Record<string, string | number> = {}) =>
    (strings[lang][key] ?? strings.en[key]).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export type T = ReturnType<typeof translator>;
export const langName = (lang: Lang) => strings[lang].lang_name;

/* Reads text aloud with the phone's own speech engine: no download, works for
   workers who cannot read the screen. */
export function speak(text: string, lang: Lang, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = SPEECH_TAG[lang];
  u.rate = 0.9;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}
