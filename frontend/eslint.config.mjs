import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/* Next.js's recommended rules, including React hooks and Core Web Vitals checks. */
export default [
  { ignores: ['.next/', 'out/', 'node_modules/', 'public/'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];
