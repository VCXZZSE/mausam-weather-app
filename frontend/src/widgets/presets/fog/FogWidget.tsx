/**
 * FogWidget — 2×2 weather widget preset for fog / mist / haze / smoke.
 */

import FogIcon from '../../components/icons/FogIcon';
import type { WidgetProps } from '../../types/weather';

const THEME = {
  dark: {
    bg: 'linear-gradient(140deg, #171D25 0%, #2C3742 42%, #4E5A66 100%)',
    glass: 'rgba(18, 24, 31, 0.36)',
    border: 'rgba(208, 220, 232, 0.14)',
    temp: 'rgba(230, 237, 243, 0.96)',
    label: 'rgba(200, 214, 226, 0.7)',
    sub: 'rgba(178, 193, 207, 0.52)',
  },
  light: {
    bg: 'linear-gradient(140deg, #F4F6F8 0%, #D3DAE1 42%, #9CA8B4 100%)',
    glass: 'rgba(255, 255, 255, 0.28)',
    border: 'rgba(255, 255, 255, 0.55)',
    temp: 'rgba(35, 46, 57, 0.92)',
    label: 'rgba(52, 65, 79, 0.68)',
    sub: 'rgba(52, 65, 79, 0.48)',
  },
} as const;

export default function FogWidget({ data, mode }: WidgetProps) {
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
          <FogIcon phase="day" />
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
