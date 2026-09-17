/**
 * Widget B — Visual / icon-forward design.
 * Android 2×2 home screen widget: 155dp × 155dp canvas.
 * Large SVG weather icon, bold temp, detail strip at bottom.
 */
import { WeatherData } from '../lib/weather'
import { WeatherIcon } from './WeatherIcon'

interface Props {
  data: WeatherData
  dark: boolean
}

const W = 288
const R = 20

export function WidgetB({ data, dark }: Props) {
  const hi    = dark ? '#FFFFFF'               : '#1A1A1A'
  const lo    = dark ? 'rgba(255,255,255,0.44)' : 'rgba(26,26,26,0.40)'
  const sep   = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'
  const bg    = dark ? 'rgba(28,28,32,0.94)'   : 'rgba(248,248,250,0.90)'
  const bdr   = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const iconC = dark ? '#FFD60A' : '#F59E0B'
  const iconS = dark ? '#7BA7D4' : '#93C5FD'

  const font = "'Google Sans', 'Roboto', system-ui, sans-serif"
  const T = (clr: string, sz: number, wt: number, extra?: React.CSSProperties) => ({
    color: clr, fontSize: sz, fontWeight: wt, lineHeight: 1,
    fontFamily: font, ...extra,
  } as React.CSSProperties)

  if (data.loading || data.error) {
    return (
      <div style={{
        width: W, height: W, borderRadius: R,
        background: bg, border: `1px solid ${bdr}`,
        backdropFilter: 'blur(32px) saturate(160%)',
        WebkitBackdropFilter: 'blur(32px) saturate(160%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={T(lo, 14, 400)}>
          {data.loading ? 'Loading…' : 'Unavailable'}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      width: W, height: W, borderRadius: R,
      background: bg, border: `1px solid ${bdr}`,
      backdropFilter: 'blur(32px) saturate(160%)',
      WebkitBackdropFilter: 'blur(32px) saturate(160%)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top: icon + temp */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center',
        padding: '24px 24px 14px',
        gap: 14,
      }}>
        <WeatherIcon condition={data.conditionKey} size={84} color={iconC} secondaryColor={iconS} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={T(hi, 52, 700, { letterSpacing: '-1px' })}>{data.temp}°</span>
          <span style={T(lo, 14, 500, { textTransform: 'capitalize', letterSpacing: '0.01em' })}>
            {data.condition}
          </span>
          <span style={T(lo, 13, 400, {
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110,
          })}>
            {data.city}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: sep, margin: '0 18px' }} />

      {/* Bottom strip: feels like / next change */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '14px 24px 20px',
        gap: 0,
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={T(lo, 11, 500, { letterSpacing: '0.06em', textTransform: 'uppercase' })}>Feels like</span>
          <span style={T(hi, 20, 700)}>{data.feelsLike}°</span>
        </div>
        <div style={{ width: 1, height: 32, background: sep }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 20 }}>
          <span style={T(lo, 11, 500, { letterSpacing: '0.06em', textTransform: 'uppercase' })}>Changes in</span>
          <span style={T(hi, 20, 700)}>{data.nextHours} hrs</span>
        </div>
      </div>
    </div>
  )
}
