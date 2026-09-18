import OvercastIcon from '../../components/icons/OvercastIcon';
import type { WidgetProps } from '../../types/weather';

const THEME = {
  dark: {
    bg: 'linear-gradient(135deg, #0A0E14 0%, #151B25 35%, #242C3A 70%, #141A24 100%)',
    glass: 'rgba(12, 16, 24, 0.46)',
    border: 'rgba(170, 190, 220, 0.12)',
    temp: 'rgba(214, 224, 240, 0.95)',
    label: 'rgba(176, 190, 214, 0.65)',
    sub: 'rgba(148, 164, 190, 0.5)',
  },
  light: {
    bg: 'linear-gradient(135deg, #EEF2F8 0%, #D2DAE6 30%, #A9B5C8 70%, #7C8AA2 100%)',
    glass: 'rgba(255, 255, 255, 0.26)',
    border: 'rgba(255, 255, 255, 0.45)',
    temp: 'rgba(30, 42, 64, 0.92)',
    label: 'rgba(42, 56, 82, 0.65)',
    sub: 'rgba(42, 56, 82, 0.45)',
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
          <OvercastIcon phase="day" />
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
