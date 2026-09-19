export default function OvercastIcon() {
  return (
    <div className="weather-icon overcast-icon" aria-hidden="true">
      <svg viewBox="0 0 72 72" fill="none">
        <defs>
          <linearGradient id="overcast-back" x1="18" y1="12" x2="49" y2="42">
            <stop stopColor="#E9F0F7" />
            <stop offset="1" stopColor="#9EADC0" />
          </linearGradient>
          <linearGradient id="overcast-front" x1="23" y1="27" x2="49" y2="59">
            <stop stopColor="#C9D5E3" />
            <stop offset="1" stopColor="#728197" />
          </linearGradient>
          <filter id="cloud-shadow" x="-30%" y="-40%" width="160%" height="190%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#26354B" floodOpacity=".3" />
          </filter>
        </defs>

        <g className="overcast-cloud-back">
          <path d="M8 30a8 8 0 0 1 7.2-8 12.5 12.5 0 0 1 23.6-3A9.5 9.5 0 0 1 55 25.7 7.7 7.7 0 0 1 53 41H18A10 10 0 0 1 8 30Z" fill="url(#overcast-back)" opacity=".88" />
          <path d="M17 24c5-6 14-7 20-2" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity=".3" />
        </g>
        <g className="overcast-cloud-front" filter="url(#cloud-shadow)">
          <path d="M15 44.5a9 9 0 0 1 8.3-9 13.5 13.5 0 0 1 25.4-3.7A10.5 10.5 0 0 1 64 41.2 9 9 0 0 1 56 58H25.5A10.5 10.5 0 0 1 15 44.5Z" fill="url(#overcast-front)" />
          <path d="M24 39c5-7 15-9 23-3" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity=".2" />
        </g>
        <g className="mist-line">
          <path d="M17 64h21" stroke="#C8D9EA" strokeWidth="2" strokeLinecap="round" />
          <path d="M45 64h11" stroke="#C8D9EA" strokeWidth="2" strokeLinecap="round" opacity=".65" />
        </g>
      </svg>
    </div>
  );
}
