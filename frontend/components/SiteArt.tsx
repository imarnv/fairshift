/** The dashboard header's drawing, in the style of Docify's LawArt: a tower crane over a
 *  building going up, and a hospital beside it, the sectors this app serves. Muted fills
 *  from the app's palette on a faint disc, standing on y=162 like an object on the desk. */

// dusty versions of the app's colours: present, never loud
const C = { line: '#A69684', paper: '#FAF7F0', cream: '#F1EBDF', sand: '#E4DACB', clay: '#CDAE98', sage: '#BDBCA6', umber: '#A38D78' };

export function SiteArt({ className = '' }: { className?: string }) {
  const floors = [76, 90, 104, 118, 132];
  return (
    <svg viewBox="96 20 228 150" className={className} aria-hidden="true" fill="none"
         stroke={C.line} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="210" cy="96" r="60" fill="rgb(var(--seal) / 0.05)" stroke="none" />

      {/* tower crane: lattice mast, jib, counterweight, a beam on the hook */}
      <path d="M132 156V44h8v112" fill={C.paper} />
      {[52, 64, 76, 88, 100, 112, 124, 136, 148].map((y) => <path key={y} d={`M132 ${y}l8 8M140 ${y}l-8 8`} strokeWidth="0.8" />)}
      <path d="M116 38h104v6H116Z" fill={C.sand} />
      <path d="M136 38l-6-12h12Z" fill={C.sand} />
      <path d="M118 44h14v10h-14Z" fill={C.umber} />
      <path d="M140 44h10v8h-10Z" fill={C.cream} />
      <path d="M204 44v30" strokeWidth="0.9" />
      <path d="M192 74h24v5h-24Z" fill={C.clay} />

      {/* the building going up: finished floors below, open frame above */}
      <path d="M164 76h58v80h-58Z" fill={C.cream} />
      {floors.map((y) => <path key={y} d={`M164 ${y}h58`} />)}
      {floors.slice(1).map((y) => [170, 184, 198, 212].map((x) => (
        <path key={`${x}-${y}`} d={`M${x} ${y + 3}h6v8h-6Z`} fill={C.sand} strokeWidth="0.9" />
      )))}
      <path d="M164 76V60M193 76V60M222 76V60M164 60h58" strokeWidth="1" />

      {/* hospital: a plain block with its cross sign and a wide door */}
      <path d="M236 98h66v58h-66Z" fill={C.cream} />
      <path d="M232 92h74v6h-74Z" fill={C.sand} />
      <path d="M259 70h20v20h-20Z" fill={C.paper} />
      <path d="M269 74v12M263 80h12" stroke={C.clay} strokeWidth="3" />
      {[244, 284].map((x) => [106, 122].map((y) => <path key={`${x}-${y}`} d={`M${x} ${y}h10v9h-10Z`} fill={C.sage} strokeWidth="0.9" />))}
      <path d="M262 136h14v20h-14Z" fill={C.sand} />

      {/* the ground they stand on */}
      <path d="M104 156h212v6H104Z" fill={C.sand} />
    </svg>
  );
}
