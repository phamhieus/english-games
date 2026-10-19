import { FlatBalloon } from './Art';

/** Decorative flat scenery: sun, clouds, layered hills and a few balloons drifting up (aria-hidden). */
function Cloud({ x, y, s, delay }: { x: number; y: number; s: number; delay: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="animate-float" style={{ animationDelay: delay }}>
        <path d="M0 40a20 20 0 0 1 20-20 28 28 0 0 1 52-6 22 22 0 0 1 28 26 14 14 0 0 1-4 28H14A14 14 0 0 1 0 40z" style={{ fill: 'var(--scene-cloud)' }} />
      </g>
    </g>
  );
}

const DRIFTERS = [
  { left: '4%', size: 34, color: '#ff9fb8', shade: '#e5607f', duration: 28, delay: -4 },
  { left: '22%', size: 26, color: '#ffc43d', shade: '#d99a0b', duration: 34, delay: -20 },
  { left: '48%', size: 30, color: '#7cc4f5', shade: '#3f98d6', duration: 31, delay: -12 },
  { left: '71%', size: 24, color: '#b7a4f7', shade: '#7c68d8', duration: 37, delay: -28 },
  { left: '90%', size: 36, color: '#6fe0c8', shade: '#2fae96', duration: 29, delay: -16 },
];

export function Clouds({ balloons = true }: { balloons?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="scenery" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice">
        <circle cx="1020" cy="130" r="70" style={{ fill: 'var(--scene-sun-glow)' }} opacity="0.25" />
        <circle cx="1020" cy="130" r="54" style={{ fill: 'var(--scene-sun)' }} />
        <Cloud x={90} y={110} s={1.3} delay="0s" />
        <Cloud x={620} y={60} s={1} delay="-2s" />
        <Cloud x={860} y={300} s={0.8} delay="-4s" />
        <Cloud x={280} y={380} s={0.9} delay="-1s" />
        <path d="M0 700C150 620 300 620 450 680s330 20 470-40 200-10 280 20v140H0z" style={{ fill: 'var(--scene-hill-1)' }} />
        <path d="M0 750C120 700 260 705 400 745s300 25 450-15 250-15 350 10v60H0z" style={{ fill: 'var(--scene-hill-2)' }} />
        <path d="M0 790c200-20 400-20 600 0s400 10 600-10v20H0z" style={{ fill: 'var(--scene-hill-3)' }} />
      </svg>
      {balloons &&
        DRIFTERS.map((b) => (
          <div
            key={b.left}
            className="animate-drift absolute top-0"
            style={{ left: b.left, animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s` }}
          >
            <FlatBalloon color={b.color} shade={b.shade} className="animate-bob" style={{ width: b.size, opacity: 'var(--scene-balloon-opacity, 0.85)' }} />
          </div>
        ))}
    </div>
  );
}
