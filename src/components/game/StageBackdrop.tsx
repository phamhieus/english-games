import type { CSSProperties, ReactNode } from 'react';
import type { StageDef } from '@/game/config/stages';
import { useDarkTheme } from '@/hooks/useDarkTheme';
import { isTouchDevice } from '@/hooks/useScreenKeyboard';

/**
 * Flat illustrated scenery for each stage, drawn behind the transparent Phaser canvas.
 * `mini` renders a still thumbnail (no ambient particles) for the stage picker.
 */

/** Deterministic 0..1 noise so particle layouts are stable between renders. */
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function Flower({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  return (
    <g>
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx={x} cy={y - r * 0.55} rx={r * 0.42} ry={r * 0.55} transform={`rotate(${i * 72} ${x} ${y})`} fill={fill} />
      ))}
      <circle cx={x} cy={y} r={r * 0.3} fill="#ffc43d" />
    </g>
  );
}

function Cloud({ x, y, s, fill = '#fff', opacity = 1 }: { x: number; y: number; s: number; fill?: string; opacity?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 40a20 20 0 0 1 20-20 28 28 0 0 1 52-6 22 22 0 0 1 28 26 14 14 0 0 1-4 28H14A14 14 0 0 1 0 40z"
      fill={fill}
      opacity={opacity}
    />
  );
}

/** A sprinkle of static stars (the twinkling ones are in the ambient layer). */
function StarField({ n, maxY }: { n: number; maxY: number }) {
  return (
    <g fill="#fff">
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={rnd(i, 21) * 1200} cy={rnd(i, 22) * maxY} r={1.5 + rnd(i, 23) * 2.5} opacity={0.5 + rnd(i, 24) * 0.5} />
      ))}
    </g>
  );
}

const SWAY: CSSProperties = { transformBox: 'fill-box', transformOrigin: '50% 100%', animation: 'sway 4s ease-in-out infinite' };
/** One wavy, tapering seaweed blade standing on (0, 0). */
const KELP = 'M-11 0C-30-48 4-92-14-146C-10-168 8-176 8-158C18-112 32-58 11 0Z';

/** Each scene; `night` = drawn for the dark theme (no sun: the backdrop adds a moon). */
const SCENES: Record<StageDef['id'], (night: boolean) => ReactNode> = {
  autumn: (night) => (
    <>
      {!night && <circle cx="1000" cy="130" r="56" fill="#ffb347" />}
      <Cloud x={140} y={110} s={1.2} />
      <Cloud x={700} y={70} s={0.9} />
      <path d="M0 620C180 560 380 570 560 620s400 20 640-30v210H0z" fill="#f4b183" />
      {(
        [
          [120, 600, 70, '#ff9f43'],
          [270, 635, 52, '#e8506a'],
          [520, 650, 46, '#e8873a'],
          [880, 612, 64, '#ffc43d'],
          [1060, 598, 74, '#ff9f43'],
        ] as const
      ).map(([x, y, r, c], i) => (
        <g key={i}>
          <rect x={x - 8} y={y} width="16" height={r * 1.3} rx="6" fill="#8a5a44" />
          <circle cx={x} cy={y - r * 0.25} r={r} fill={c} />
          <circle cx={x - r * 0.55} cy={y + r * 0.1} r={r * 0.6} fill={c} />
          <circle cx={x + r * 0.55} cy={y + r * 0.05} r={r * 0.65} fill={c} />
        </g>
      ))}
      <path d="M0 700C200 670 420 680 640 705s380 10 560-25v120H0z" fill="#e8956b" />
      <path d="M0 765C220 745 420 752 640 772s360 0 560-20v48H0z" fill="#c97b4a" />
      {Array.from({ length: 14 }, (_, i) => (
        <ellipse key={i} cx={60 + i * 85 + rnd(i, 41) * 30} cy={735 + rnd(i, 42) * 50} rx="9" ry="5" transform={`rotate(${rnd(i, 43) * 180} ${60 + i * 85} 760)`} fill={['#ff9f43', '#e8506a', '#ffc43d'][i % 3]} />
      ))}
    </>
  ),
  desert: (night) => (
    <>
      {!night && (
        <>
          <circle cx="980" cy="150" r="92" fill="#ffd166" opacity=".3" />
          <circle cx="980" cy="150" r="62" fill="#ffc43d" />
        </>
      )}
      <path d="M0 600C200 540 380 560 560 600s420 30 640-40v240H0z" fill="#f5d39a" />
      <path d="M300 602L420 440L540 602Z" fill="#e6b062" />
      <path d="M420 440L540 602H462Z" fill="#cf9a4f" />
      <path d="M520 612L600 505L680 612Z" fill="#e6b062" />
      <path d="M600 505L680 612H632Z" fill="#cf9a4f" />
      <path d="M0 690C240 640 460 660 700 700s360 10 500-30v130H0z" fill="#eeb766" />
      {(
        [
          [150, 712, 1],
          [1040, 702, 1.2],
          [860, 752, 0.8],
        ] as const
      ).map(([x, y, sc], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${sc})`}>
          <path d="M-14 -60H-34Q-42 -60 -42 -70V-90M14 -44H32Q40 -44 40 -54V-76" stroke="#4caf3a" strokeWidth="18" fill="none" strokeLinecap="round" />
          <rect x="-15" y="-112" width="30" height="112" rx="15" fill="#4caf3a" />
          <path d="M-4 -100V-10M6 -100V-10" stroke="#3a8f2c" strokeWidth="3" />
        </g>
      ))}
      <path d="M0 760C220 735 440 745 660 768s360 0 540-25v57H0z" fill="#e0a352" />
    </>
  ),
  jungle: () => (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={`a${i}`} cx={i * 150} cy={-30 + (i % 2) * 40} r="115" fill="#4caf3a" />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <circle key={`b${i}`} cx={75 + i * 150} cy={40 + (i % 2) * 24} r="78" fill="#3f9b2e" />
      ))}
      <rect x="60" y="260" width="50" height="540" fill="#6b4a32" />
      <rect x="1080" y="240" width="56" height="560" fill="#6b4a32" />
      {[200, 430, 760, 1000].map((x, i) => (
        <g key={i} style={{ ...SWAY, animationDelay: `${-i * 0.9}s` }}>
          <path d={`M${x} 80C${x + 22} 180 ${x - 22} 260 ${x} ${330 + i * 30}`} stroke="#2e7d22" strokeWidth="6" fill="none" strokeLinecap="round" />
          <ellipse cx={x + 10} cy={180} rx="12" ry="6" transform={`rotate(30 ${x + 10} 180)`} fill="#4caf3a" />
          <ellipse cx={x - 8} cy={260} rx="12" ry="6" transform={`rotate(-30 ${x - 8} 260)`} fill="#4caf3a" />
        </g>
      ))}
      <path d="M0 700C200 670 420 680 640 705s380 0 560-30v125H0z" fill="#3f9b2e" />
      {(
        [
          [40, 730, -30, '#2fae96'],
          [180, 760, 20, '#4caf3a'],
          [980, 740, -15, '#2fae96'],
          [1140, 720, 35, '#4caf3a'],
        ] as const
      ).map(([x, y, r, c], i) => (
        <path key={i} d="M0 0C-60 -40 -60 -120 0 -160C60 -120 60 -40 0 0Z" transform={`translate(${x} ${y}) rotate(${r})`} fill={c} />
      ))}
      {(
        [
          [300, 735],
          [620, 750],
          [860, 728],
        ] as const
      ).map(([x, y], i) => (
        <Flower key={i} x={x} y={y} r={20} fill="#ff4f6d" />
      ))}
      <path d="M0 772C240 752 460 760 680 780s340 0 520-18v38H0z" fill="#2e7d22" />
    </>
  ),
  city: () => (
    <>
      <StarField n={40} maxY={380} />
      <circle cx="200" cy="140" r="84" fill="#f3e3a2" opacity=".1" />
      <circle cx="200" cy="140" r="46" fill="#f3e3a2" />
      {Array.from({ length: 14 }, (_, i) => {
        const h = 220 + rnd(i, 51) * 220;
        return <rect key={`b${i}`} x={i * 90 - 20} y={760 - h} width="92" height={h} fill="#28305e" />;
      })}
      {Array.from({ length: 10 }, (_, i) => {
        const w = 90 + rnd(i, 61) * 40;
        const x = i * 125 - 10;
        const h = 160 + rnd(i, 62) * 200;
        const top = 760 - h;
        return (
          <g key={`f${i}`}>
            <rect x={x} y={top} width={w} height={h} fill="#323d75" />
            {Array.from({ length: Math.floor((h - 30) / 34) }, (_, r) =>
              Array.from({ length: Math.floor((w - 20) / 26) }, (_, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={x + 14 + c * 26}
                  y={top + 18 + r * 34}
                  width="12"
                  height="16"
                  rx="2"
                  fill={rnd(i * 31 + r * 7 + c, 63) > 0.55 ? '#ffd166' : '#3f4a85'}
                />
              )),
            )}
          </g>
        );
      })}
      <rect y="756" width="1200" height="44" fill="#141a35" />
      <path d="M0 778H1200" stroke="#ffd166" strokeWidth="4" strokeDasharray="40 30" />
    </>
  ),
  volcano: () => (
    <>
      <Cloud x={120} y={120} s={1.3} fill="#4a3440" opacity={0.8} />
      <Cloud x={760} y={70} s={1.1} fill="#4a3440" opacity={0.8} />
      <path d="M0 560L220 420L400 540L640 380L900 520L1200 400V800H0Z" fill="#2f1d27" />
      <ellipse cx="610" cy="300" rx="180" ry="90" fill="#ff6b3d" opacity=".18" />
      <path d="M300 740L560 300H660L920 740Z" fill="#3b2b33" />
      <path d="M560 300H660L645 330Q610 345 575 330Z" fill="#ff6b3d" />
      <path d="M585 330C570 420 600 480 560 560S520 680 540 740H566C556 680 600 600 610 520S600 400 600 335Z" fill="#ff9f43" />
      <path d="M640 334C660 420 700 470 720 560S760 680 770 740H748C736 680 700 600 690 520S650 420 628 338Z" fill="#ff6b3d" />
      <path d="M0 730C200 700 420 710 640 735s380 0 560-30v95H0z" fill="#241519" />
      {(
        [
          [180, 760, 70],
          [980, 770, 90],
        ] as const
      ).map(([x, y, rx], i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry="12" fill="#ff6b3d" />
      ))}
    </>
  ),
  aurora: () => (
    <>
      <StarField n={60} maxY={520} />
      <defs>
        <linearGradient id="aurora-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fe0c8" stopOpacity="0" />
          <stop offset=".55" stopColor="#6fe0c8" stopOpacity=".6" />
          <stop offset="1" stopColor="#7cc4f5" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="aurora-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b388ff" stopOpacity="0" />
          <stop offset=".5" stopColor="#ff9fc8" stopOpacity=".45" />
          <stop offset="1" stopColor="#b388ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g style={{ animation: 'aurora 8s ease-in-out infinite' }}>
        <path d="M-60 250C200 130 420 320 640 190S1000 110 1260 230V430C1000 300 820 390 610 360S220 300 -60 430Z" fill="url(#aurora-a)" />
      </g>
      <g style={{ animation: 'aurora 11s ease-in-out -4s infinite' }}>
        <path d="M-60 330C240 230 460 380 700 280S1040 230 1260 320V470C1040 380 860 460 660 430S260 380 -60 500Z" fill="url(#aurora-b)" />
      </g>
      <path d="M0 620L200 470L380 600L600 420L820 620L1020 480L1200 580V800H0Z" fill="#1d3557" />
      <path d="M600 420L660 474L628 468L600 486L570 468L540 476ZM200 470L248 506L220 502L196 516L170 504ZM1020 480L1066 514L1040 510L1016 524L992 512Z" fill="#cfe3f5" />
      <path d="M0 720C200 690 420 700 640 725s380 0 560-30v105H0z" fill="#163049" />
      {(
        [
          [90, 730, 1],
          [170, 750, 0.75],
          [1060, 728, 1.1],
          [1140, 755, 0.8],
        ] as const
      ).map(([x, y, sc], i) => (
        <path key={i} d="M0 -130L46 -40H22L56 20H-56L-22 -40H-46Z" transform={`translate(${x} ${y}) scale(${sc})`} fill="#0f2a2e" />
      ))}
    </>
  ),
  meadow: (night) => (
    <>
      {!night && (
        <>
          <circle cx="1020" cy="130" r="70" fill="#ffc43d" opacity=".25" />
          <circle cx="1020" cy="130" r="54" fill="#ffc43d" />
        </>
      )}
      <Cloud x={90} y={110} s={1.3} />
      <Cloud x={620} y={60} s={1} />
      <Cloud x={860} y={300} s={0.8} />
      <Cloud x={280} y={380} s={0.9} />
      <path d="M0 700C150 620 300 620 450 680s330 20 470-40 200-10 280 20v140H0z" fill="#9fdcc4" />
      <path d="M0 750C120 700 260 705 400 745s300 25 450-15 250-15 350 10v60H0z" fill="#4cc9a7" />
      <path d="M0 790c200-20 400-20 600 0s400 10 600-10v20H0z" fill="#2fa588" />
    </>
  ),
  garden: (night) => (
    <>
      {!night && <circle cx="1000" cy="140" r="56" fill="#ffe27a" />}
      <Cloud x={160} y={120} s={1.1} />
      <Cloud x={700} y={80} s={0.9} />
      <path d="M0 640C200 590 380 600 560 640s380 10 640-40v240H0z" fill="#b8e6c6" />
      {/* sakura tree */}
      <path d="M140 720C150 640 130 560 160 480M155 560C190 530 220 520 250 520M150 600C110 570 90 560 60 556" stroke="#8a5a44" strokeWidth="22" strokeLinecap="round" fill="none" />
      {[
        [160, 450, 70],
        [240, 500, 56],
        [70, 530, 52],
        [110, 470, 50],
        [210, 430, 48],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#ffb7c5' : '#ffc8d6'} />
      ))}
      <path d="M0 700C180 660 380 680 600 710s420 10 600-30v120H0z" fill="#8fd3a3" />
      <path d="M0 760C200 735 420 745 640 770s380 0 560-20v50H0z" fill="#6cc08a" />
      {Array.from({ length: 22 }, (_, i) => (
        <Flower
          key={i}
          x={40 + i * 54 + rnd(i, 1) * 20}
          y={725 + rnd(i, 2) * 60}
          r={10 + rnd(i, 3) * 8}
          fill={['#ff9fc8', '#ffffff', '#ffc43d', '#b7a4f7', '#ff8a7a'][i % 5]!}
        />
      ))}
    </>
  ),
  sunset: () => (
    <>
      <rect y="300" width="1200" height="200" fill="#ffc98f" />
      <rect y="440" width="1200" height="140" fill="#ffe0a3" />
      <circle cx="640" cy="570" r="150" fill="#ffd166" />
      <Cloud x={120} y={160} s={1.4} fill="#ffd0c2" />
      <Cloud x={820} y={110} s={1.1} fill="#ffd0c2" />
      <path d="M260 230l14 10 14-10M300 260l10 8 10-8M940 300l12 9 12-9" stroke="#7a3b4a" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect y="570" width="1200" height="230" fill="#3f98d6" />
      {[
        [80, 600, 220],
        [420, 640, 180],
        [860, 610, 260],
        [200, 690, 160],
        [700, 700, 240],
      ].map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height="7" rx="3.5" fill="#6fb6ea" />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={580 - i * 12} y={590 + i * 26} width={120 + i * 24} height="8" rx="4" fill="#ffd166" opacity=".8" />
      ))}
      <path d="M0 730C140 700 260 720 380 760V800H0Z" fill="#ffd28a" />
      <path d="M900 770C1000 730 1100 720 1200 735V800H900Z" fill="#ffd28a" />
      {/* palm */}
      <path d="M110 760C120 680 150 600 210 540" stroke="#7a4a35" strokeWidth="20" strokeLinecap="round" fill="none" />
      {[-60, -20, 20, 60, 100].map((r) => (
        <path key={r} d="M210 540c40-30 90-30 130 0-40-10-90-5-130 0z" transform={`rotate(${r} 210 540)`} fill="#2fa588" />
      ))}
    </>
  ),
  snow: (night) => (
    <>
      {!night && <circle cx="980" cy="140" r="50" fill="#fff6c9" />}
      <path d="M0 560L180 330L330 520L520 280L720 540L900 360L1080 520L1200 420V800H0Z" fill="#b9d3ee" />
      <path d="M180 330L230 395L200 385L170 405L140 380ZM520 280L585 362L545 350L510 375L470 345ZM900 360L950 425L915 415L885 432L855 410Z" fill="#fff" />
      <path d="M0 640L240 470L420 620L640 440L860 640L1040 500L1200 600V800H0Z" fill="#9fbde0" />
      <path d="M640 440L700 495L668 488L640 505L610 488L585 494ZM240 470L292 512L262 506L236 522L208 510Z" fill="#fff" />
      <path d="M0 700C200 670 420 690 620 715s380 10 580-25v110H0z" fill="#e8f3ff" />
      <path d="M0 760C220 740 420 750 640 772s360 0 560-20v48H0z" fill="#ffffff" />
      {[
        [90, 700, 1],
        [170, 720, 0.8],
        [1060, 700, 1.1],
        [1140, 730, 0.75],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x="-7" y="-10" width="14" height="22" fill="#7a4a35" />
          <path d="M0 -120L45 -40H-45Z M0 -90L52 -10H-52Z" fill="#1f8f73" />
          <path d="M0 -120L22 -82H-22Z" fill="#fff" />
        </g>
      ))}
    </>
  ),
  candy: () => (
    <>
      <Cloud x={120} y={120} s={1.2} />
      <Cloud x={760} y={90} s={1} />
      <Cloud x={980} y={300} s={0.7} />
      <path d="M0 620C180 560 360 570 520 620s380 20 680-40v220H0z" fill="#ffb3d1" />
      {/* lollipops */}
      {[
        [230, 560, '#ff6b8a', 1],
        [980, 540, '#7cc4f5', 0.85],
        [620, 600, '#ffc43d', 0.7],
      ].map(([x, y, c, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x="-6" y="0" width="12" height="160" rx="6" fill="#fff" />
          <circle r="62" fill={c as string} />
          <path d="M0 0a14 14 0 1 1 14 14a30 30 0 1 1 -30 -30a44 44 0 1 1 44 44" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
        </g>
      ))}
      {/* white frosting peeking above the pink hill */}
      <path d="M0 700C200 660 420 670 640 705s380 10 560-30v125H0z" transform="translate(0 -14)" fill="#fff" />
      <path d="M0 700C200 660 420 670 640 705s380 10 560-30v125H0z" fill="#ff8fbf" />
      <path d="M0 765C220 745 420 752 640 775s360 0 560-20v45H0z" fill="#ffd1e3" />
      {[
        [120, 760, '#b7a4f7'],
        [420, 778, '#6fe0c8'],
        [780, 772, '#ffc43d'],
        [1080, 750, '#7cc4f5'],
      ].map(([x, y, c], i) => (
        <path key={i} d="M-26 0Q-24 -40 0 -44Q24 -40 26 0Z" transform={`translate(${x} ${y})`} fill={c as string} />
      ))}
    </>
  ),
  ocean: () => (
    <>
      <rect width="1200" height="140" fill="#4aa8ec" />
      {[160, 420, 700, 980].map((x, i) => (
        <path key={i} d={`M${x} 0L${x + 70} 0L${x + 220} 700L${x + 90} 700Z`} fill="#fff" opacity=".08" />
      ))}
      <path d="M0 640C120 560 220 600 300 560s140 40 240 0 180 60 300 20 240 20 360-20V800H0Z" fill="#2577b8" />
      <path d="M0 720C200 690 420 700 640 725s380 0 560-30v105H0z" fill="#ffd28a" />
      {[
        [140, 760],
        [520, 750],
        [900, 770],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="40" ry="8" fill="#f2b866" />
      ))}
      {/* leafy seaweed clumps, only at the sides (the middle is the play field) */}
      {(
        [
          [70, 1, false],
          [175, 0.7, true],
          [1030, 0.75, false],
          [1135, 1.05, true],
        ] as const
      ).map(([x, s, flip], i) => (
        <g key={i} transform={`translate(${x} 772) scale(${flip ? -s : s} ${s})`}>
          <g style={{ ...SWAY, animationDelay: `${-i * 0.9}s` }}>
            <path d={KELP} transform="translate(-16 0) rotate(-26) scale(.62)" fill="#6fe0c8" />
            <path d={KELP} transform="rotate(-6)" fill="#2fae96" />
            <path d={KELP} transform="translate(18 0) rotate(14) scale(.78)" fill="#4cc9a7" />
          </g>
        </g>
      ))}
      <path d="M300 740V680M300 700L270 660M300 690L330 650M330 650V620M270 660V630" stroke="#ff8a7a" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M860 745V690M860 705L835 670M860 698L888 662" stroke="#ff9fc8" strokeWidth="14" strokeLinecap="round" fill="none" />
    </>
  ),
  night: () => (
    <>
      <rect y="420" width="1200" height="380" fill="#2c3a6b" />
      <StarField n={40} maxY={420} />
      <circle cx="960" cy="150" r="95" fill="#ffe9a3" opacity=".12" />
      <circle cx="960" cy="150" r="62" fill="#ffe9a3" />
      <circle cx="940" cy="130" r="12" fill="#f5d77a" />
      <circle cx="980" cy="175" r="8" fill="#f5d77a" />
      <Cloud x={120} y={200} s={1.1} fill="#3a4a85" />
      <Cloud x={620} y={300} s={0.8} fill="#3a4a85" />
      <path d="M0 640C150 580 320 590 460 640s360 10 520-40 160 0 220 20v180H0z" fill="#18214a" />
      {/* little houses with lit windows */}
      {[
        [760, 640],
        [840, 652],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x="-26" y="-40" width="52" height="44" fill="#121a3d" />
          <path d="M-34 -40L0 -70L34 -40Z" fill="#121a3d" />
          <rect x="-10" y="-28" width="14" height="14" fill="#ffd166" />
        </g>
      ))}
      <path d="M0 740C200 710 420 720 640 745s380 0 560-30v85H0z" fill="#121a3d" />
    </>
  ),
  space: () => (
    <>
      <ellipse cx="300" cy="300" rx="320" ry="140" fill="#3b2a6b" opacity=".7" />
      <StarField n={60} maxY={680} />
      <ellipse cx="900" cy="420" rx="260" ry="110" fill="#45307a" opacity=".6" />
      <g transform="rotate(-18 930 180)">
        <circle cx="930" cy="180" r="72" fill="#ffb870" />
        <path d="M865 160h130M870 195h110" stroke="#e8873a" strokeWidth="10" strokeLinecap="round" opacity=".6" />
        <ellipse cx="930" cy="180" rx="130" ry="26" fill="none" stroke="#ffd28a" strokeWidth="10" />
      </g>
      <circle cx="200" cy="200" r="38" fill="#7cc4f5" />
      <circle cx="188" cy="190" r="9" fill="#5fa6ec" />
      <circle cx="212" cy="215" r="6" fill="#5fa6ec" />
      <path d="M0 700C200 660 420 670 640 700s380 10 560-30v130H0z" fill="#a3adbd" />
      <path d="M0 760C220 735 420 745 640 768s360 0 560-25v57H0z" fill="#8a96a8" />
      {(
        [
          [160, 735, 40],
          [520, 720, 26],
          [880, 735, 34],
          [1080, 770, 22],
        ] as const
      ).map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.3} fill="#6f7a8c" />
      ))}
    </>
  ),
};

/** Moving bits: snow, petals, bubbles, twinkling stars… (skipped in thumbnails). */
function Ambient({ id }: { id: StageDef['id'] }) {
  const fall = (n: number, render: (i: number) => ReactNode, min = 9, spread = 8) =>
    Array.from({ length: n }, (_, i) => (
      <span
        key={i}
        className="absolute top-0"
        style={{
          left: `${rnd(i, 7) * 100}%`,
          animation: `fall ${min + rnd(i, 8) * spread}s linear ${-rnd(i, 9) * 20}s infinite`,
          ['--drift' as string]: `${(rnd(i, 10) - 0.5) * 120}px`,
        }}
      >
        {render(i)}
      </span>
    ));
  const stars = (n: number, top = 70) =>
    Array.from({ length: n }, (_, i) => (
      <span
        key={i}
        className="absolute rounded-full bg-white"
        style={{
          left: `${rnd(i, 1) * 100}%`,
          top: `${rnd(i, 2) * top}%`,
          width: 2 + rnd(i, 3) * 4,
          height: 2 + rnd(i, 3) * 4,
          animation: `twinkle ${2 + rnd(i, 4) * 3}s ease-in-out ${-rnd(i, 5) * 4}s infinite`,
        }}
      />
    ));
  switch (id) {
    case 'snow':
      return <>{fall(40, (i) => <span className="block rounded-full bg-white" style={{ width: 4 + rnd(i, 3) * 7, height: 4 + rnd(i, 3) * 7 }} />)}</>;
    case 'garden':
      return (
        <>
          {fall(
            18,
            (i) => (
              <svg viewBox="-10 -12 20 24" width={12 + rnd(i, 3) * 8} aria-hidden>
                <path d="M0 12C-9 6 -9 -6 -3 -12L0 -8L3 -12C9 -6 9 6 0 12Z" fill={i % 3 ? '#ffb7c5' : '#ffd6e2'} />
              </svg>
            ),
            12,
            10,
          )}
        </>
      );
    case 'candy':
      return (
        <>
          {fall(
            24,
            (i) => (
              <span
                className="block rounded-full"
                style={{ width: 4, height: 12, background: ['#ff6b8a', '#7cc4f5', '#ffc43d', '#6fe0c8', '#b7a4f7'][i % 5], transform: `rotate(${rnd(i, 4) * 180}deg)` }}
              />
            ),
            12,
            10,
          )}
        </>
      );
    case 'ocean':
      return (
        <>
          {Array.from({ length: 22 }, (_, i) => (
            <span
              key={i}
              className="absolute top-0 rounded-full border-2 border-white/70 bg-white/15"
              style={{
                left: `${rnd(i, 1) * 100}%`,
                width: 6 + rnd(i, 2) * 14,
                height: 6 + rnd(i, 2) * 14,
                animation: `rise ${6 + rnd(i, 3) * 8}s linear ${-rnd(i, 4) * 14}s infinite`,
              }}
            />
          ))}
          {[0, 1, 2].map((i) => (
            <span key={i} className="absolute left-0" style={{ top: `${20 + i * 18}%`, animation: `fly ${22 + i * 7}s linear ${-i * 9}s infinite` }}>
              <svg viewBox="0 0 60 30" width={46 - i * 8} aria-hidden>
                <path d="M10 15C18 3 38 3 46 15C38 27 18 27 10 15ZM46 15L58 5V25Z" fill={['#ffc43d', '#ff9fb8', '#6fe0c8'][i]} />
                <circle cx="20" cy="13" r="2.5" fill="#1f2a44" />
              </svg>
            </span>
          ))}
        </>
      );
    case 'night':
      return (
        <>
          {stars(45, 55)}
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={`f${i}`}
              className="animate-float absolute rounded-full bg-[#ffe066] shadow-[0_0_10px_3px_rgba(255,224,102,.6)]"
              style={{ left: `${rnd(i, 11) * 100}%`, top: `${60 + rnd(i, 12) * 25}%`, width: 5, height: 5, animationDelay: `${-rnd(i, 13) * 6}s` }}
            />
          ))}
        </>
      );
    case 'space':
      return (
        <>
          {stars(70, 85)}
          <span className="absolute top-[12%] left-0 h-0.5 w-24 rotate-[20deg] rounded-full bg-gradient-to-r from-transparent to-white" style={{ animation: 'fly 9s linear -3s infinite' }} />
        </>
      );
    case 'sunset':
      return (
        <>
          {[0, 1].map((i) => (
            <span key={i} className="absolute left-0" style={{ top: `${14 + i * 9}%`, animation: `fly ${28 + i * 8}s linear ${-i * 12}s infinite` }}>
              <svg viewBox="0 0 40 16" width={36 - i * 8} aria-hidden>
                <path d="M2 4Q11 -1 20 10Q29 -1 38 4" stroke="#7a3b4a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          ))}
        </>
      );
    case 'autumn':
      return (
        <>
          {fall(
            20,
            (i) => (
              <svg viewBox="-10 -12 20 24" width={14 + rnd(i, 3) * 10} aria-hidden>
                <path d="M0 -11C7 -6 8 4 0 11C-8 4 -7 -6 0 -11Z" fill={['#ff9f43', '#e8506a', '#ffc43d'][i % 3]} />
                <path d="M0 -8V11" stroke="#8a5a44" strokeWidth="1.4" />
              </svg>
            ),
            10,
            9,
          )}
        </>
      );
    case 'desert':
      return (
        <>
          {[0, 1].map((i) => (
            <span key={i} className="absolute left-0" style={{ bottom: `${6 + i * 5}%`, animation: `fly ${16 + i * 9}s linear ${-i * 8}s infinite` }}>
              <svg viewBox="-20 -20 40 40" width={34 - i * 8} className="animate-spin" style={{ animationDuration: '2.4s' }} aria-hidden>
                <circle r="16" fill="none" stroke="#b9895a" strokeWidth="3" />
                <path d="M-12 -6C0 -14 10 4 -4 10S8 -12 12 2" fill="none" stroke="#b9895a" strokeWidth="3" />
              </svg>
            </span>
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={`d${i}`}
              className="absolute left-0 h-1 w-1 rounded-full bg-[#e6b062]"
              style={{ top: `${30 + rnd(i, 71) * 55}%`, animation: `fly ${6 + rnd(i, 72) * 5}s linear ${-rnd(i, 73) * 10}s infinite` }}
            />
          ))}
        </>
      );
    case 'jungle':
      return (
        <>
          {[0, 1, 2].map((i) => (
            <span key={i} className="absolute left-0" style={{ top: `${28 + i * 16}%`, animation: `fly ${18 + i * 6}s linear ${-i * 7}s infinite` }}>
              <svg viewBox="-16 -12 32 24" width={30 - i * 4} className="animate-float" aria-hidden>
                <ellipse cx="-7" cy="-3" rx="8" ry="6" fill={['#ffc43d', '#7cc4f5', '#ff9fc8'][i]} />
                <ellipse cx="7" cy="-3" rx="8" ry="6" fill={['#ffc43d', '#7cc4f5', '#ff9fc8'][i]} />
                <ellipse cx="-5" cy="5" rx="5" ry="4" fill={['#ff9f43', '#3f98d6', '#e5607f'][i]} />
                <ellipse cx="5" cy="5" rx="5" ry="4" fill={['#ff9f43', '#3f98d6', '#e5607f'][i]} />
                <rect x="-1.2" y="-8" width="2.4" height="16" rx="1.2" fill="#1f2a44" />
              </svg>
            </span>
          ))}
          {fall(
            8,
            (i) => (
              <svg viewBox="-10 -12 20 24" width={14 + rnd(i, 3) * 8} aria-hidden>
                <path d="M0 -11C7 -6 8 4 0 11C-8 4 -7 -6 0 -11Z" fill={i % 2 ? '#4caf3a' : '#7ed957'} />
              </svg>
            ),
            12,
            8,
          )}
        </>
      );
    case 'city':
      return (
        <>
          {stars(20, 35)}
          <span className="absolute left-0 top-[14%]" style={{ animation: 'fly 26s linear -6s infinite' }}>
            <svg viewBox="0 0 60 20" width="56" aria-hidden>
              <path d="M4 10H48L56 6V14L48 10" fill="#c9d2e3" />
              <path d="M24 10L16 2H22L34 10ZM24 10L16 18H22L34 10Z" fill="#a7b0cc" />
              <circle cx="56" cy="10" r="2.5" fill="#ff6b6b" className="animate-[twinkle_1s_ease-in-out_infinite]" />
            </svg>
          </span>
        </>
      );
    case 'volcano':
      return (
        <>
          {Array.from({ length: 26 }, (_, i) => (
            <span
              key={i}
              className="absolute top-0 rounded-full bg-[#ff9f43] shadow-[0_0_8px_2px_rgba(255,107,61,.7)]"
              style={{
                left: `${35 + rnd(i, 81) * 30}%`,
                width: 3 + rnd(i, 82) * 4,
                height: 3 + rnd(i, 82) * 4,
                animation: `rise ${4 + rnd(i, 83) * 4}s linear ${-rnd(i, 84) * 8}s infinite`,
              }}
            />
          ))}
        </>
      );
    case 'aurora':
      return <>{stars(40, 60)}</>;
    default:
      return null;
  }
}

/** Dark-theme versions of the daytime stages: night sky colour and where the moon goes. */
const NIGHT: Partial<Record<StageDef['id'], { sky: string; moon: [number, number] }>> = {
  meadow: { sky: '#1b2442', moon: [1020, 130] },
  garden: { sky: '#19293a', moon: [1000, 140] },
  sunset: { sky: '#2a1f3d', moon: [1010, 110] },
  snow: { sky: '#19233f', moon: [980, 140] },
  candy: { sky: '#2a1d3a', moon: [1010, 120] },
  autumn: { sky: '#2a1f2e', moon: [1000, 130] },
  desert: { sky: '#1f2240', moon: [980, 150] },
  jungle: { sky: '#132820', moon: [1000, 300] },
};

function Moon({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="88" fill="#f3e3a2" opacity=".1" />
      <circle cx={x} cy={y} r="50" fill="#f3e3a2" />
      <circle cx={x - 16} cy={y - 14} r="9" fill="#e6d38a" />
      <circle cx={x + 14} cy={y + 12} r="6" fill="#e6d38a" />
    </g>
  );
}

/** Twinkling stars added over a daytime stage at night. */
function NightStars() {
  return (
    <>
      {Array.from({ length: 24 }, (_, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${rnd(i, 31) * 100}%`,
            top: `${rnd(i, 32) * 42}%`,
            width: 2 + rnd(i, 33) * 3,
            height: 2 + rnd(i, 33) * 3,
            animation: `twinkle ${2 + rnd(i, 34) * 3}s ease-in-out ${-rnd(i, 35) * 4}s infinite`,
          }}
        />
      ))}
    </>
  );
}

export function StageBackdrop({ stage, mini = false }: { stage: StageDef; mini?: boolean }) {
  // In the dark theme the daytime stages turn into their night versions.
  const night = useDarkTheme() ? NIGHT[stage.id] : undefined;
  const filterId = `night-${stage.id}`;
  // Phones: the drifting CSS particles are dozens of extra layers composited under the game canvas every frame.
  const ambient = !mini && !isTouchDevice();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: night?.sky ?? stage.sky }}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 800" preserveAspectRatio={mini ? 'xMidYMid slice' : 'xMidYMax slice'}>
        {night && (
          <defs>
            {/* darker, cooler colours: scales RGB down and nudges everything towards blue */}
            <filter id={filterId} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values="0.42 0.05 0.04 0 0.02  0.04 0.44 0.05 0 0.03  0.06 0.08 0.56 0 0.07  0 0 0 1 0" />
            </filter>
          </defs>
        )}
        {night && <StarField n={30} maxY={360} />}
        {night && <Moon x={night.moon[0]} y={night.moon[1]} />}
        <g filter={night ? `url(#${filterId})` : undefined}>{SCENES[stage.id](!!night)}</g>
      </svg>
      {ambient && night && <NightStars />}
      {ambient && <Ambient id={stage.id} />}
    </div>
  );
}
