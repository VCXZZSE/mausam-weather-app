import OvercastIcon from '../../components/icons/OvercastIcon';
import type { WidgetProps } from '../../types/weather';

const THEME = {
  dark: {
    bg: 'linear-gradient(135deg, #04070F 0%, #0A1020 35%, #141C30 70%, #080E1C 100%)',
    glass: 'rgba(8, 12, 26, 0.5)',
    border: 'rgba(150, 175, 225, 0.12)',
    temp: 'rgba(206, 218, 242, 0.95)',
    label: 'rgba(168, 188, 226, 0.65)',
    sub: 'rgba(140, 162, 206, 0.5)',
  },
  light: {
    bg: 'linear-gradient(135deg, #C9D2E6 0%, #A2AEC8 30%, #6E7C9C 70%, #414E74 100%)',
    glass: 'rgba(255, 255, 255, 0.2)',
    border: 'rgba(255, 255, 255, 0.38)',
    temp: 'rgba(18, 28, 60, 0.92)',
    label: 'rgba(28, 42, 82, 0.65)',
    sub: 'rgba(28, 42, 82, 0.45)',
  },
} as const;

export default function OvercastNightWidget({ data, mode }: WidgetProps) {
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
          <OvercastIcon phase="night" />
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
