export type OvercastPhase = 'day' | 'night';

export default function OvercastIcon({ phase = 'day' }: { phase?: OvercastPhase } = {}) {
  const isNight = phase === 'night';
  return (
    <div className="weather-icon overcast-icon" aria-hidden="true">
      <svg viewBox="0 0 72 72" fill="none">
        <defs>
          <linearGradient id={`overcast-back-${phase}`} x1="18" y1="12" x2="49" y2="42">
            <stop stopColor={isNight ? '#CBD5E1' : '#E9F0F7'} />
            <stop offset="1" stopColor={isNight ? '#64748B' : '#9EADC0'} />
          </linearGradient>
          <linearGradient id={`overcast-front-${phase}`} x1="23" y1="27" x2="49" y2="59">
            <stop stopColor={isNight ? '#94A3B8' : '#C9D5E3'} />
            <stop offset="1" stopColor={isNight ? '#475569' : '#728197'} />
          </linearGradient>
          <filter id={`cloud-shadow-${phase}`} x="-30%" y="-40%" width="160%" height="190%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor={isNight ? '#0F172A' : '#26354B'} floodOpacity=".3" />
          </filter>
        </defs>

        <g className="overcast-cloud-back">
          <path d="M8 30a8 8 0 0 1 7.2-8 12.5 12.5 0 0 1 23.6-3A9.5 9.5 0 0 1 55 25.7 7.7 7.7 0 0 1 53 41H18A10 10 0 0 1 8 30Z" fill={`url(#overcast-back-${phase})`} opacity=".88" />
          <path d="M17 24c5-6 14-7 20-2" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity=".3" />
        </g>
        <g className="overcast-cloud-front" filter={`url(#cloud-shadow-${phase})`}>
          <path d="M15 44.5a9 9 0 0 1 8.3-9 13.5 13.5 0 0 1 25.4-3.7A10.5 10.5 0 0 1 64 41.2 9 9 0 0 1 56 58H25.5A10.5 10.5 0 0 1 15 44.5Z" fill={`url(#overcast-front-${phase})`} />
          <path d="M24 39c5-7 15-9 23-3" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity=".2" />
        </g>
        <g className="mist-line">
          <path d="M17 64h21" stroke={isNight ? '#94A3B8' : '#C8D9EA'} strokeWidth="2" strokeLinecap="round" />
          <path d="M45 64h11" stroke={isNight ? '#94A3B8' : '#C8D9EA'} strokeWidth="2" strokeLinecap="round" opacity=".65" />
        </g>
      </svg>
    </div>
  );
}
