// Three drops, widely spaced, falling slowly — the light end of the rain
// family. Same cloud as ThunderstormIcon, minus the bolt and the back cloud's
// weight, so the three rain tiles read as one set.
const DROPS = [
  { x: 22, y: 50, delay: 0 },
  { x: 37, y: 48, delay: -1.5 },
  { x: 51, y: 50, delay: -.75 },
];

export default function DrizzleIcon() {
  return (
    <div className="weather-icon drizzle-icon" aria-hidden="true">
      <svg viewBox="0 0 72 72" fill="none">
        <defs>
          <linearGradient id="drizzle-cloud" x1="22" y1="12" x2="48" y2="47">
            <stop stopColor="#D5E1F2" />
            <stop offset=".48" stopColor="#93A6C2" />
            <stop offset="1" stopColor="#5D6E8A" />
          </linearGradient>
          <linearGradient id="drizzle-back-cloud" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#A2B2CB" />
            <stop offset="1" stopColor="#67758F" />
          </linearGradient>
        </defs>

        <g className="drizzle-back-cloud">
          <path d="M10 35.5a8 8 0 0 1 5.8-7.7A11.5 11.5 0 0 1 37 22.5a9.5 9.5 0 0 1 15.8 7.1A7.5 7.5 0 0 1 52 44H18a8.5 8.5 0 0 1-8-8.5Z" fill="url(#drizzle-back-cloud)" opacity=".55" />
        </g>
        <g className="drizzle-cloud-main">
          <path d="M13 38.5a8.5 8.5 0 0 1 7.2-8.4A13 13 0 0 1 45 25.3a10 10 0 0 1 14.1 9A8.8 8.8 0 0 1 54 51H21.5A12.5 12.5 0 0 1 13 38.5Z" fill="url(#drizzle-cloud)" />
          <path d="M20 34c4-8 15-11 22-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity=".2" />
          {/* Content face, set wide and lightly stroked — small-tile weights
              scale up over-heavy on the hero card. */}
          <g fill="#26313c">
            <circle cx="29" cy="40" r="2.1" />
            <circle cx="43" cy="40" r="2.1" />
          </g>
          <path d="M32 45q4 2.6 8 0" stroke="#26313c" strokeWidth="1.7" strokeLinecap="round" fill="none" />
        </g>

        {DROPS.map((drop, index) => (
          <line
            key={index}
            className="svg-drizzle-drop"
            x1={drop.x}
            y1={drop.y}
            x2={drop.x - 2}
            y2={drop.y + 7}
            stroke="#9BD6FF"
            strokeWidth="1.8"
            strokeLinecap="round"
            style={{ animationDelay: `${drop.delay}s` }}
          />
        ))}
      </svg>
    </div>
  );
}
