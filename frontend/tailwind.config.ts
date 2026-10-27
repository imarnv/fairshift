import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: Object.fromEntries(
        ['paper', 'surface', 'ink', 'muted', 'rule', 'seal', 'verify', 'query', 'caution', 'tape', 'manila', 'desk']
          .map((n) => [n, token(n)]),
      ),
      fontFamily: {
        display: ['var(--font-sans)', 'var(--font-indic)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'var(--font-indic)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // a sheet resting on the desk: a hairline, then a soft, low shadow
        sheet: '0 1px 0 rgb(61 57 41 / 0.04), 0 10px 28px -14px rgb(61 57 41 / 0.18)',
      },
    },
  },
  plugins: [],
} satisfies Config;
