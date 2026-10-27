import { BuiltFor, FeatureGrid, PhonePreview, Security, SiteFooter, TryNow, TypedHero } from '@/components/landing';
import { Wordmark } from '@/components/ui';

/** Each figure gets a picture of itself, as on Docify's landing. */
const FACTS: { value: string; unit: string; label: string; art: React.ReactNode }[] = [
  { value: '2', unit: '×', label: 'pay for every overtime hour, worked out by the Factories Act rules, never by hand',
    art: (
      <div aria-hidden="true" className="w-full shrink-0 rounded-lg border border-rule bg-paper/60 p-3 font-mono text-[11.5px] leading-relaxed sm:w-auto sm:whitespace-nowrap">
        <p><span className="mr-2 text-muted">mon–sat</span>6 × 10 h = 60 h</p>
        <p><span className="mr-2 text-muted">over 48</span>12 h × ₹95 × 2</p>
        <p className="mt-2 border-t border-rule pt-2 text-verify">₹2,280 overtime, on the slip</p>
      </div>
    ) },
  { value: '5', unit: '+', label: 'answers needed before any feedback is shown, so no one can be singled out',
    art: (
      <div aria-hidden="true" className="flex shrink-0 gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={`grid h-11 w-11 place-items-center rounded-full ${i < 4 ? 'bg-seal/60' : 'border border-dashed border-tape/70'}`}>
            {i < 4 && <svg viewBox="0 0 24 24" className="h-5 w-5 text-paper" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M7 10V7.5a5 5 0 0 1 10 0V10M5.5 10h13v10h-13z" /></svg>}
          </span>
        ))}
      </div>
    ) },
];

const STEPS = [
  ['Check in', 'Scan the QR poster at the gate. The shift starts; no register, no supervisor signature.'],
  ['Work the shift', 'Hours add up on their own. Past 48 in a week, the worker and the manager both see it.'],
  ['See the pay', 'The payslip shows every hour and rupee, in the worker’s language, read aloud if needed.'],
  ['Speak up', 'Report a hazard or rate the manager. Nothing ties it back to a name.'],
];

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-10 xl:max-w-7xl 2xl:max-w-[90rem]">
        <Wordmark className="text-[1.6rem]" />
        <nav aria-label="Page" className="flex items-center gap-5">
          <a href="#features" className="hidden text-sm text-muted hover:text-ink sm:inline">Features</a>
          <a href="#how" className="hidden text-sm text-muted hover:text-ink sm:inline">How it works</a>
          <TryNow />
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-10 xl:max-w-7xl 2xl:max-w-[90rem]">
        <section className="flex flex-col gap-12 py-8 lg:min-h-[calc(100dvh-76px)]">
          <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
            <div>
              <p className="text-[17px] font-semibold text-ink">Built for India’s daily-wage and shift workforce</p>
              <TypedHero />
              <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">
                ShiftSaathi gives workers their hours, pay and safety in their own language, by voice or touch, and gives
                employers an honest view of how their workforce is really doing.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <TryNow large />
                <a href="#how" className="text-sm text-muted underline underline-offset-4 hover:text-ink">See how it works</a>
              </div>
            </div>
            <div>
              <PhonePreview />
              <p className="mt-3 text-center text-[12px] font-medium text-muted">The worker app, in Tamil</p>
            </div>
          </div>
          <BuiltFor />
        </section>

        <section className="grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule shadow-sheet md:grid-cols-2">
          {FACTS.map((f) => (
            <div key={f.label} className="flex flex-col gap-6 bg-surface p-7 sm:flex-row sm:items-center sm:justify-between lg:p-9">
              <div>
                <p className="font-display tabular-nums leading-none">
                  <span className="text-[4.5rem] font-semibold tracking-[-0.045em]">{f.value}</span>
                  <span className="ml-1.5 text-[2.1rem] font-medium tracking-[-0.02em] text-seal">{f.unit}</span>
                </p>
                <p className="mt-3 max-w-[30ch] text-[14.5px] leading-relaxed text-muted">{f.label}</p>
              </div>
              {f.art}
            </div>
          ))}
        </section>

        <section id="features" className="scroll-mt-8 pt-24">
          <h2 className="text-center font-display text-[2.6rem] leading-[1.1] sm:text-[3.4rem]">Everything a shift needs</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[17px] leading-relaxed text-muted">
            Eight tools on one phone, made for workers who may not read well and may not own a smartphone of their own.
          </p>
          <div className="mt-10 lg:mt-16"><FeatureGrid /></div>
        </section>

        <section id="how" className="scroll-mt-8 py-24">
          <h2 className="font-display text-[2.4rem] leading-[1.1]">How it works</h2>
          <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="border-t-2 border-ink pt-5">
                <span className="font-mono text-[13px] text-seal">{i + 1}</span>
                <p className="mt-2 font-display text-[1.25rem]">{title}</p>
                <p className="mt-2 max-w-[32ch] text-[14.5px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <Security />
      </main>
      <SiteFooter />
    </div>
  );
}
