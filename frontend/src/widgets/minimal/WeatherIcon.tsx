export type ConditionKey =
  | 'clear' | 'partly-cloudy' | 'cloudy' | 'foggy'
  | 'drizzle' | 'rain' | 'heavy-rain'
  | 'snow' | 'thunderstorm' | 'unknown';

interface Props {
  condition: ConditionKey
  size?: number
  color?: string          // primary icon color
  secondaryColor?: string // clouds / accents
}

export function WeatherIcon({ condition, size = 48, color = '#FFD60A', secondaryColor = '#98C1FF' }: Props) {
  const s = size
  const cx = s / 2
  const cy = s / 2

  switch (condition) {
    case 'clear':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <circle cx={cx} cy={cy} r={s * 0.22} fill={color} />
          {[0,45,90,135,180,225,270,315].map(deg => {
            const r1 = s * 0.30, r2 = s * 0.42
            const rad = (deg * Math.PI) / 180
            return (
              <line key={deg}
                x1={cx + r1 * Math.cos(rad)} y1={cy + r1 * Math.sin(rad)}
                x2={cx + r2 * Math.cos(rad)} y2={cy + r2 * Math.sin(rad)}
                stroke={color} strokeWidth={s * 0.055} strokeLinecap="round"
              />
            )
          })}
        </svg>
      )

    case 'partly-cloudy':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <circle cx={s * 0.38} cy={s * 0.38} r={s * 0.18} fill={color} />
          <ellipse cx={s * 0.54} cy={s * 0.64} rx={s * 0.26} ry={s * 0.17} fill={secondaryColor} />
          <circle cx={s * 0.38} cy={s * 0.60} r={s * 0.14} fill={secondaryColor} />
          <circle cx={s * 0.62} cy={s * 0.60} r={s * 0.12} fill={secondaryColor} />
        </svg>
      )

    case 'cloudy':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <ellipse cx={cx} cy={s * 0.62} rx={s * 0.32} ry={s * 0.19} fill={secondaryColor} />
          <circle cx={s * 0.36} cy={s * 0.55} r={s * 0.18} fill={secondaryColor} />
          <circle cx={s * 0.60} cy={s * 0.55} r={s * 0.15} fill={secondaryColor} />
          <circle cx={s * 0.48} cy={s * 0.46} r={s * 0.14} fill={secondaryColor} />
        </svg>
      )

    case 'foggy':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          {[0.35, 0.48, 0.61, 0.74].map((yRatio, i) => (
            <line key={i}
              x1={s * 0.15} y1={s * yRatio} x2={s * (0.85 - (i % 2) * 0.1)} y2={s * yRatio}
              stroke={secondaryColor} strokeWidth={s * 0.06} strokeLinecap="round" strokeOpacity={0.8 - i * 0.1}
            />
          ))}
        </svg>
      )

    case 'drizzle':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <ellipse cx={cx} cy={s * 0.42} rx={s * 0.28} ry={s * 0.17} fill={secondaryColor} />
          <circle cx={s * 0.36} cy={s * 0.35} r={s * 0.15} fill={secondaryColor} />
          <circle cx={s * 0.60} cy={s * 0.35} r={s * 0.13} fill={secondaryColor} />
          {[[0.36,0.64],[0.50,0.70],[0.64,0.64]].map(([x,y],i) => (
            <line key={i}
              x1={s*x} y1={s*y} x2={s*x - s*0.04} y2={s*y + s*0.1}
              stroke="#6BAED6" strokeWidth={s*0.05} strokeLinecap="round"
            />
          ))}
        </svg>
      )

    case 'rain':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <ellipse cx={cx} cy={s * 0.40} rx={s * 0.30} ry={s * 0.18} fill={secondaryColor} />
          <circle cx={s * 0.34} cy={s * 0.33} r={s * 0.17} fill={secondaryColor} />
          <circle cx={s * 0.62} cy={s * 0.33} r={s * 0.14} fill={secondaryColor} />
          {[[0.30,0.62],[0.46,0.68],[0.62,0.62],[0.38,0.75],[0.54,0.75]].map(([x,y],i) => (
            <line key={i}
              x1={s*x} y1={s*y} x2={s*x - s*0.05} y2={s*y + s*0.13}
              stroke="#4A9EDB" strokeWidth={s*0.055} strokeLinecap="round"
            />
          ))}
        </svg>
      )

    case 'heavy-rain':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <ellipse cx={cx} cy={s * 0.36} rx={s * 0.32} ry={s * 0.19} fill={secondaryColor} />
          <circle cx={s * 0.33} cy={s * 0.29} r={s * 0.18} fill={secondaryColor} />
          <circle cx={s * 0.64} cy={s * 0.29} r={s * 0.15} fill={secondaryColor} />
          {[[0.26,0.60],[0.38,0.66],[0.50,0.60],[0.62,0.66],[0.74,0.60],
            [0.32,0.75],[0.44,0.75],[0.56,0.75],[0.68,0.75]].map(([x,y],i) => (
            <line key={i}
              x1={s*x} y1={s*y} x2={s*x - s*0.06} y2={s*y + s*0.13}
              stroke="#2B7DB5" strokeWidth={s*0.055} strokeLinecap="round"
            />
          ))}
        </svg>
      )

    case 'snow':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <ellipse cx={cx} cy={s * 0.40} rx={s * 0.28} ry={s * 0.17} fill={secondaryColor} />
          <circle cx={s * 0.36} cy={s * 0.33} r={s * 0.15} fill={secondaryColor} />
          <circle cx={s * 0.60} cy={s * 0.33} r={s * 0.13} fill={secondaryColor} />
          {[[0.32,0.64],[0.50,0.70],[0.68,0.64]].map(([x,y],i) => (
            <g key={i} stroke="#B0D4F1" strokeWidth={s*0.018} strokeLinecap="round">
              <path d={`M${s*x} ${s*(y-0.055)} V${s*(y+0.055)}`} />
              <path d={`M${s*(x-0.048)} ${s*(y-0.027)} L${s*(x+0.048)} ${s*(y+0.027)}`} />
              <path d={`M${s*(x-0.048)} ${s*(y+0.027)} L${s*(x+0.048)} ${s*(y-0.027)}`} />
            </g>
          ))}
        </svg>
      )

    case 'thunderstorm':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <ellipse cx={cx} cy={s * 0.38} rx={s * 0.30} ry={s * 0.18} fill={secondaryColor} />
          <circle cx={s * 0.34} cy={s * 0.31} r={s * 0.17} fill={secondaryColor} />
          <circle cx={s * 0.62} cy={s * 0.31} r={s * 0.14} fill={secondaryColor} />
          <polygon
            points={`${s*0.54},${s*0.55} ${s*0.44},${s*0.68} ${s*0.50},${s*0.68} ${s*0.42},${s*0.82} ${s*0.58},${s*0.64} ${s*0.52},${s*0.64}`}
            fill="#FFD60A"
          />
        </svg>
      )

    default:
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
          <circle cx={cx} cy={cy} r={s * 0.22} fill={secondaryColor} opacity={0.6} />
        </svg>
      )
  }
}
