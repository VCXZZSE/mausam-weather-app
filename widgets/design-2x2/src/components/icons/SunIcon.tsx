const RAYS = Array.from({ length: 12 }, (_, index) => index);

export default function SunIcon() {
  return (
    <div className="weather-icon sun-icon" aria-hidden="true">
      <svg viewBox="0 0 72 72" fill="none">
        <defs>
          <radialGradient id="sun-core" cx="35%" cy="30%">
            <stop offset="0" stopColor="#FFF9C8" />
            <stop offset=".42" stopColor="#FFE066" />
            <stop offset="1" stopColor="#FF9F0A" />
          </radialGradient>
          <filter id="sun-soft-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        <circle className="sun-aura" cx="36" cy="36" r="25" fill="#FFB72B" opacity=".3" filter="url(#sun-soft-glow)" />
        <g className="sun-rays-ring">
          {RAYS.map((ray) => (
            <rect
              key={ray}
              className="sun-ray"
              x="34.5"
              y="2"
              width="3"
              height={ray % 2 ? 8 : 10}
              rx="1.5"
              fill="url(#sun-core)"
              opacity={ray % 2 ? .7 : .95}
              transform={`rotate(${ray * 30} 36 36)`}
              style={{ animationDelay: `${ray * -0.12}s` }}
            />
          ))}
        </g>
        <circle className="sun-core" cx="36" cy="36" r="17" fill="url(#sun-core)" />
        <ellipse cx="31" cy="29" rx="6" ry="3.5" fill="white" opacity=".3" transform="rotate(-25 31 29)" />
      </svg>
    </div>
  );
}
