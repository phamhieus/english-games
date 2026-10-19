import type { CSSProperties } from 'react';

const INK = '#1f2a44';

/** Balloon colours (fill, shade) used to tell word sets apart. */
export const SET_COLORS = [
  ['#7cc4f5', '#3f98d6'],
  ['#ff9fb8', '#e5607f'],
  ['#ffc43d', '#d99a0b'],
  ['#6fe0c8', '#2fae96'],
  ['#b7a4f7', '#7c68d8'],
  ['#ffb870', '#e8873a'],
] as const;

/** Flat outlined balloon, drawn in a 0 0 60 84 box (body on top, string below). */
export function FlatBalloon({
  color,
  shade,
  label,
  className,
  style,
}: {
  color: string;
  shade: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 60 84" className={className} style={style} aria-hidden>
      <path d="M30 60c-4 6-1 12 3 22" stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <path d="M25 62h10l-5-6z" fill={shade} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <ellipse cx={30} cy={31} rx={26} ry={28} fill={color} stroke={INK} strokeWidth={3} />
      <rect x={13} y={15} width={7} height={14} rx={3.5} fill="#fff" opacity={0.65} />
      {label && (
        <text x={30} y={36} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={13} fill={INK}>
          {label}
        </text>
      )}
    </svg>
  );
}

/** App mark: a red balloon with a little wiggle. */
export function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <FlatBalloon color="#d6402e" shade="#a52e20" className="animate-wiggle h-10 w-7 origin-bottom" />
      {withText && <Wordmark className="text-2xl" />}
    </span>
  );
}

/**
 * Heading in the logo's flat lettering (like "Word" + "Shooter"): everything but the last word in
 * the text colour, the last word in the logo red. `onColor` = on a purple/coloured panel
 * (white first part, a brighter red so it stays readable).
 */
export function BrandTitle({ children, onColor = false, className = '' }: { children: string; onColor?: boolean; className?: string }) {
  const i = children.lastIndexOf(' ');
  return (
    <span className={`font-display leading-none font-bold tracking-tight ${className}`}>
      {i >= 0 && <span className={onColor ? 'text-white' : 'text-ink'}>{children.slice(0, i + 1)}</span>}
      <span className={onColor ? 'text-brand' : 'text-candy-pink'}>{children.slice(i + 1)}</span>
    </span>
  );
}

/** The "WordShooter" wordmark on its own (no balloon), at any size. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display leading-none font-bold tracking-tight text-ink ${className}`}>
      Word<span className="text-candy-pink">Shooter</span>
    </span>
  );
}

/** Slowly rotating sunburst rays (place inside a relative, overflow-hidden box). */
export function Sunburst() {
  return (
    <svg viewBox="-100 -100 200 200" className="absolute -top-1/4 -left-1/4 h-[150%] w-[150%] animate-spin" style={{ animationDuration: '60s' }} aria-hidden>
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M0 0L-13 -100H13Z" transform={`rotate(${i * 30})`} fill="#fff" opacity=".12" />
      ))}
    </svg>
  );
}


/** Reward coin (the shop currency). */
export function Coin({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" width={size} height={size} className={className} aria-hidden>
      <circle r="10.5" fill="#ffc43d" stroke={INK} strokeWidth="2.2" />
      <circle r="7" fill="none" stroke="#d99a0b" strokeWidth="1.6" />
      <path d="M0 -4.5L1.3 -1.4L4.5 -1.4L1.9 0.6L2.9 3.8L0 1.9L-2.9 3.8L-1.9 0.6L-4.5 -1.4L-1.3 -1.4Z" fill="#fff6c9" />
    </svg>
  );
}
