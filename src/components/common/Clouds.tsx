/** Decorative soft clouds and floating bubbles (pure CSS, aria-hidden). */
export function Clouds() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="cloud animate-float" style={{ width: 160, height: 44, top: '12%', left: '-30px' }} />
      <div className="cloud animate-float" style={{ width: 120, height: 34, top: '30%', right: '6%', animationDelay: '-2s' }} />
      <div className="cloud animate-float" style={{ width: 200, height: 52, bottom: '18%', left: '8%', animationDelay: '-4s', opacity: 0.55 }} />
      <div className="cloud animate-float" style={{ width: 140, height: 40, bottom: '6%', right: '-20px', animationDelay: '-1s', opacity: 0.6 }} />
      {[
        { l: '22%', t: '62%', s: 18, c: '#ffb0d3' },
        { l: '78%', t: '54%', s: 26, c: '#c9aaff' },
        { l: '62%', t: '14%', s: 14, c: '#8eeadf' },
        { l: '8%', t: '44%', s: 12, c: '#ffc48c' },
      ].map((b, i) => (
        <span
          key={i}
          className="animate-float absolute rounded-full"
          style={{
            left: b.l,
            top: b.t,
            width: b.s,
            height: b.s,
            background: `radial-gradient(circle at 35% 30%, #fff 0 18%, ${b.c} 22%)`,
            opacity: 0.7,
            animationDelay: `${-i * 1.3}s`,
          }}
        />
      ))}
    </div>
  );
}
