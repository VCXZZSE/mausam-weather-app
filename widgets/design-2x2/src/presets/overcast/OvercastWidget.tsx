/**
 * OvercastWidget — 2×2 weather widget preset for cloudy / overcast conditions.
 *
 * All data values are dynamic — supply them from your API response.
 */

import OvercastIcon from '../../components/icons/OvercastIcon';
import type { WidgetProps } from '../../types/weather';

const THEME = {
  dark: {
    bg: 'linear-gradient(140deg, #101721 0%, #263343 42%, #465568 100%)',
    glass: 'rgba(12, 19, 29, 0.38)',
    border: 'rgba(205, 222, 240, 0.14)',
    temp: 'rgba(228, 237, 246, 0.96)',
    label: 'rgba(198, 215, 232, 0.7)',
    sub: 'rgba(175, 195, 215, 0.52)',
  },
  light: {
    bg: 'linear-gradient(140deg, #F1F5F8 0%, #C9D5E0 42%, #91A2B4 100%)',
    glass: 'rgba(255, 255, 255, 0.25)',
    border: 'rgba(255, 255, 255, 0.52)',
    temp: 'rgba(31, 46, 61, 0.92)',
    label: 'rgba(47, 65, 84, 0.68)',
    sub: 'rgba(47, 65, 84, 0.48)',
  },
} as const;

export default function OvercastWidget({ data, mode }: WidgetProps) {
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
          <OvercastIcon />
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
