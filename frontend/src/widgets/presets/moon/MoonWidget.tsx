import MoonIcon from '../../components/icons/MoonIcon';
import type { WidgetProps } from '../../types/weather';

const THEME = {
  dark: {
    bg: 'linear-gradient(135deg, #020510 0%, #08102A 35%, #0E183C 70%, #06102E 100%)',
    glass: 'rgba(6, 10, 30, 0.5)',
    border: 'rgba(160, 185, 255, 0.12)',
    temp: 'rgba(215, 225, 255, 0.95)',
    label: 'rgba(180, 200, 255, 0.65)',
    sub: 'rgba(150, 175, 240, 0.5)',
  },
  light: {
    bg: 'linear-gradient(135deg, #D0D8F8 0%, #A8B8E8 30%, #7080C0 70%, #4050A0 100%)',
    glass: 'rgba(255, 255, 255, 0.22)',
    border: 'rgba(255, 255, 255, 0.42)',
    temp: 'rgba(15, 25, 80, 0.92)',
    label: 'rgba(30, 50, 130, 0.65)',
    sub: 'rgba(30, 50, 130, 0.45)',
  },
} as const;

export default function MoonWidget({ data, mode }: WidgetProps) {
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
          <MoonIcon />
        </div>
      </div>

      {/* Temperature */}
      <div style={{ position: 'relative', fontSize: 50, fontWeight: 200, color: t.temp, lineHeight: 1, letterSpacing: '-0.03em', marginLeft: -2 }}>
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
