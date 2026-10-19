import { useState } from 'react';

/**
 * Small dependency-free SVG charts. Each is a single series, so the title names it
 * (no legend). Marks: 2px line, 8px markers, 4px rounded bar ends on the baseline,
 * recessive gridlines; text uses ink tokens. Every mark has a hover/focus tooltip.
 */

const W = 560;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };
const SERIES = '#7b6ad8';
const GRID = 'rgba(45,42,74,0.08)';
const INK_MUTED = '#6b6890';

interface Tip {
  x: number;
  y: number;
  text: string;
}

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-ink px-2.5 py-1 text-xs font-semibold text-white shadow"
      style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%`, marginTop: -8 }}
    >
      {tip.text}
    </div>
  );
}

function yTicks(max: number, count = 4): number[] {
  const step = Math.max(1, Math.ceil(max / count));
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

export function BarChart({
  data,
  label,
  formatTip,
  xLabelEvery = 1,
}: {
  data: { key: string; label: string; value: number }[];
  label: string;
  formatTip: (d: { label: string; value: number }) => string;
  xLabelEvery?: number;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = yTicks(max);
  const top = ticks[ticks.length - 1] ?? max;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(4, Math.min(36, slot - 2));
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill={INK_MUTED}>
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const h = Math.max(0, (d.value / top) * innerH);
          const r = Math.min(4, h / 2, barW / 2);
          const x0 = cx - barW / 2;
          const yb = PAD.top + innerH;
          // Rounded top corners only; flat on the baseline.
          const path =
            h > 0
              ? `M${x0},${yb} V${yb - h + r} Q${x0},${yb - h} ${x0 + r},${yb - h} H${x0 + barW - r} Q${x0 + barW},${yb - h} ${x0 + barW},${yb - h + r} V${yb} Z`
              : '';
          const show = () => setTip({ x: cx, y: yb - h, text: formatTip(d) });
          return (
            <g key={d.key}>
              {path && <path d={path} fill={SERIES} />}
              <rect
                x={cx - slot / 2}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill="transparent"
                tabIndex={0}
                aria-label={formatTip(d)}
                onMouseEnter={show}
                onFocus={show}
                onMouseLeave={() => setTip(null)}
                onBlur={() => setTip(null)}
              />
              {(data.length - 1 - i) % xLabelEvery === 0 && (
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill={INK_MUTED}>
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="rgba(45,42,74,0.25)" />
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

export function LineChart({
  data,
  label,
  formatTip,
}: {
  data: { key: string; label: string; value: number }[];
  /** values are 0..1 */
  label: string;
  formatTip: (d: { label: string; value: number }) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - v * innerH;
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const hovered = hover !== null ? data[hover] : undefined;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.round(rel * Math.max(0, data.length - 1)));
  };

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill={INK_MUTED}>
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}
        {data.length > 1 && <polyline points={points} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" />}
        {data.map((d, i) => (
          <circle key={d.key} cx={x(i)} cy={y(d.value)} r={hover === i ? 5.5 : 4} fill={SERIES} stroke="#fff" strokeWidth={2} />
        ))}
        {hovered && hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="rgba(45,42,74,0.3)" strokeDasharray="3 3" />
        )}
        <text x={PAD.left} y={H - 8} fontSize="11" fill={INK_MUTED}>
          {data[0]?.label}
        </text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="11" fill={INK_MUTED}>
          {data[data.length - 1]?.label}
        </text>
        <rect
          x={PAD.left - 8}
          y={PAD.top}
          width={innerW + 16}
          height={innerH}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hovered && hover !== null && <Tooltip tip={{ x: x(hover), y: y(hovered.value), text: formatTip(hovered) }} />}
    </div>
  );
}
