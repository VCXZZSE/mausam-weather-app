/**
 * ThunderstormWidget — 2×2 weather widget preset for storm / rain conditions.
 *
 * Usage:
 *   <ThunderstormWidget mode="dark" data={{ temperature, location, condition, hi, lo }} />
 *
 * All data values are dynamic — supply them from your API response.
 */

import ThunderstormIcon from '../../components/icons/ThunderstormIcon';
import type { WidgetProps } from '../../types/weather';

const THEME = {
  dark: {
    bg: 'linear-gradient(135deg, #060810 0%, #0E1424 35%, #18202E 70%, #0A1020 100%)',
    glass: 'rgba(8, 12, 24, 0.5)',
    border: 'rgba(130, 160, 220, 0.12)',
    temp: 'rgba(200, 215, 245, 0.95)',
    label: 'rgba(160, 185, 225, 0.65)',
    sub: 'rgba(130, 155, 200, 0.5)',
  },
  light: {
    bg: 'linear-gradient(135deg, #C8D4E8 0%, #9AAAC8 30%, #6A7A9A 70%, #3A4A6A 100%)',
    glass: 'rgba(255, 255, 255, 0.22)',
    border: 'rgba(255, 255, 255, 0.38)',
    temp: 'rgba(20, 35, 70, 0.92)',
    label: 'rgba(30, 50, 90, 0.65)',
    sub: 'rgba(30, 50, 90, 0.45)',
  },
} as const;

export default function ThunderstormWidget({ data, mode }: WidgetProps) {
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
          <ThunderstormIcon />
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
