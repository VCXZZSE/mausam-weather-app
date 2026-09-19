/**
 * HeavyRainWidget — 2×2 weather widget preset for heavy rain (WMO 63, 65, 82).
 */

import HeavyRainIcon from '../../components/icons/HeavyRainIcon';
import type { WidgetProps } from '../../types/weather';

const THEME = {
  dark: {
    bg: 'linear-gradient(140deg, #0A1018 0%, #16243A 42%, #2B405C 100%)',
    glass: 'rgba(6, 11, 20, 0.44)',
    border: 'rgba(168, 198, 232, 0.13)',
    temp: 'rgba(214, 229, 246, 0.96)',
    label: 'rgba(174, 199, 228, 0.68)',
    sub: 'rgba(146, 175, 208, 0.5)',
  },
  light: {
    bg: 'linear-gradient(140deg, #DCE7F2 0%, #A5BCD4 42%, #6B87A6 100%)',
    glass: 'rgba(255, 255, 255, 0.28)',
    border: 'rgba(255, 255, 255, 0.55)',
    temp: 'rgba(16, 28, 44, 0.92)',
    label: 'rgba(24, 40, 62, 0.68)',
    sub: 'rgba(24, 40, 62, 0.48)',
  },
} as const;

export default function HeavyRainWidget({ data, mode }: WidgetProps) {
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
          <HeavyRainIcon />
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
