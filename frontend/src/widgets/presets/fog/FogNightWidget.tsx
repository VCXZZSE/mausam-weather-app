/**
 * FogNightWidget — 2×2 weather widget preset for fog / mist / haze / smoke at night.
 */

import FogIcon from '../../components/icons/FogIcon';
import type { WidgetProps } from '../../types/weather';

const THEME = {
  dark: {
    bg: 'linear-gradient(140deg, #0A0E16 0%, #1A2230 42%, #343F4E 100%)',
    glass: 'rgba(10, 14, 26, 0.44)',
    border: 'rgba(156, 178, 214, 0.12)',
    temp: 'rgba(210, 221, 238, 0.95)',
    label: 'rgba(172, 190, 218, 0.65)',
    sub: 'rgba(146, 166, 198, 0.5)',
  },
  light: {
    bg: 'linear-gradient(140deg, #D8DEE9 0%, #B4BFD2 42%, #808C9F 100%)',
    glass: 'rgba(255, 255, 255, 0.22)',
    border: 'rgba(255, 255, 255, 0.45)',
    temp: 'rgba(22, 30, 52, 0.92)',
    label: 'rgba(33, 44, 72, 0.65)',
    sub: 'rgba(33, 44, 72, 0.45)',
  },
} as const;

export default function FogNightWidget({ data, mode }: WidgetProps) {
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
          <FogIcon phase="night" />
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
