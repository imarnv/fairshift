/* The iPhone app (ios/) injects window.ShiftSaathiNative. It gives the page a native QR
   scanner, since Safari's web view has no BarcodeDetector, and marks the worker-only shell. */

declare global { interface Window { ShiftSaathiNative?: { scan: () => void } } }

export const inApp = () => typeof window !== 'undefined' && Boolean(window.ShiftSaathiNative);

/** Opens the native scanner; resolves with the code, or null if the worker closed it. */
export function nativeScan(): Promise<string | null> {
  return new Promise((resolve) => {
    window.addEventListener('native-scan', (e) => resolve((e as CustomEvent<string | null>).detail), { once: true });
    window.ShiftSaathiNative?.scan();
  });
}
