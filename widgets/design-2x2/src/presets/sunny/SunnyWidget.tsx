/**
 * SunnyWidget — 2×2 weather widget preset for sunny/clear-sky conditions.
 *
 * Usage:
 *   <SunnyWidget mode="dark" data={{ temperature, location, condition, hi, lo }} />
 *
 * All data values are dynamic — supply them from your API response.
 */

import SunIcon from '../../components/icons/SunIcon';
import type { WidgetProps } from '../../types/weather';

const THEME = {
  dark: {
    bg: 'linear-gradient(135deg, #1A1000 0%, #3A2200 35%, #5C3500 70%, #7A4800 100%)',
    glass: 'rgba(20, 12, 0, 0.42)',
    border: 'rgba(255, 200, 80, 0.14)',
    temp: 'rgba(255, 220, 120, 0.95)',
    label: 'rgba(255, 190, 80, 0.65)',
    sub: 'rgba(255, 170, 60, 0.5)',
  },
  light: {
    bg: 'linear-gradient(135deg, #FFF6D0 0%, #FFE090 30%, #FFB347 70%, #FF8C00 100%)',
    glass: 'rgba(255, 255, 255, 0.28)',
    border: 'rgba(255, 255, 255, 0.5)',
    temp: 'rgba(90, 40, 0, 0.9)',
    label: 'rgba(100, 50, 0, 0.65)',
    sub: 'rgba(100, 50, 0, 0.45)',
  },
} as const;

export default function SunnyWidget({ data, mode }: WidgetProps) {
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
      }}
    >
      {/* Frosted glass overlay */}
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

      {/* Top row: location + icon */}
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
          <SunIcon />
        </div>
      </div>

      {/* Temperature */}
      <div style={{ position: 'relative', fontSize: 54, fontWeight: 200, color: t.temp, lineHeight: 1, letterSpacing: '-0.03em', marginLeft: -2 }}>
        {data.temperature}
      </div>

      {/* Hi / Lo */}
      <div style={{ position: 'relative', display: 'flex', gap: 10, fontSize: 10, fontWeight: 500, color: t.label, letterSpacing: '0.02em' }}>
        <span>H: {data.hi}</span>
        <span>L: {data.lo}</span>
      </div>
    </div>
  );
}
