/**
 * DrizzleWidget — 2×2 weather widget preset for light rain (WMO 51/53/55, 61, 80).
 */

import DrizzleIcon from '../../components/icons/DrizzleIcon';
import type { WidgetProps } from '../../types/weather';

const THEME = {
  dark: {
    bg: 'linear-gradient(140deg, #121A26 0%, #24344B 42%, #415A78 100%)',
    glass: 'rgba(11, 18, 30, 0.38)',
    border: 'rgba(190, 214, 240, 0.14)',
    temp: 'rgba(225, 236, 248, 0.96)',
    label: 'rgba(190, 210, 232, 0.7)',
    sub: 'rgba(164, 188, 214, 0.52)',
  },
  light: {
    bg: 'linear-gradient(140deg, #EDF3F9 0%, #C2D3E4 42%, #8AA3BE 100%)',
    glass: 'rgba(255, 255, 255, 0.28)',
    border: 'rgba(255, 255, 255, 0.55)',
    temp: 'rgba(24, 38, 55, 0.92)',
    label: 'rgba(36, 54, 76, 0.68)',
    sub: 'rgba(36, 54, 76, 0.48)',
  },
} as const;

export default function DrizzleWidget({ data, mode }: WidgetProps) {
  const t = THEME[mode];

  return (
    <div
      className="widget-enter relative overflow-hidden"
      style={{
        width: 170,
        height: 170,
        borderRadius: 28,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: t.bg,
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: 28,
          background: t.glass,
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: `1px solid ${t.border}`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.label, lineHeight: 1 }}>
            {data.location}
          </div>
          <div style={{ fontSize: 9, fontWeight: 400, color: t.sub, marginTop: 2, letterSpacing: '0.03em' }}>
            {data.condition}
          </div>
        </div>
        <div style={{ transform: 'scale(0.66)', transformOrigin: 'top right', marginTop: -4, marginRight: -4 }}>
          <DrizzleIcon />
        </div>
      </div>

      <div style={{ position: 'relative', fontSize: 54, fontWeight: 200, color: t.temp, lineHeight: 1, letterSpacing: '-0.03em', marginLeft: -2 }}>
        {data.temperature}
      </div>

      <div style={{ position: 'relative', display: 'flex', gap: 10, fontSize: 10, fontWeight: 500, color: t.label, letterSpacing: '0.02em' }}>
        <span>H: {data.hi}</span>
        <span>L: {data.lo}</span>
      </div>
    </div>
  );
}
