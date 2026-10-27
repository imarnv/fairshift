import qrcode from 'qrcode-generator';

/* Renders as SVG: sharp at any size, no canvas, no network. */
export function QrCode({ value, label, size = 176 }: { value: string; label: string; size?: number }) {
  const qr = qrcode(0, 'M');
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} role="img" aria-label={label}
         className="rounded-lg bg-white" shapeRendering="crispEdges">
      <path d={d} fill="#000" />
    </svg>
  );
}
