// Eight drops, tightly spaced, falling roughly four times as fast as the
// drizzle's three. Same cloud as DrizzleIcon and ThunderstormIcon so the
// three rain tiles read as one set; only the rate, the count and the face
// carry the intensity.
const DROPS = [
  { x: 16, y: 48, delay: 0 },
  { x: 22, y: 51, delay: -.44 },
  { x: 28, y: 48, delay: -.13 },
  { x: 34, y: 51, delay: -.51 },
  { x: 40, y: 48, delay: -.27 },
  { x: 46, y: 51, delay: -.58 },
  { x: 52, y: 48, delay: -.06 },
  { x: 58, y: 51, delay: -.35 },
];

export default function HeavyRainIcon() {
  return (
    <div className="weather-icon heavy-rain-icon" aria-hidden="true">
      <svg viewBox="0 0 72 72" fill="none">
        <defs>
          <linearGradient id="heavy-rain-cloud" x1="22" y1="12" x2="48" y2="47">
            <stop stopColor="#C5D1E6" />
            <stop offset=".48" stopColor="#7E8DAA" />
            <stop offset="1" stopColor="#49566F" />
          </linearGradient>
          <linearGradient id="heavy-rain-back-cloud" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#8E9CB7" />
            <stop offset="1" stopColor="#53617C" />
          </linearGradient>
        </defs>

        <g className="heavy-rain-back-cloud">
          <path d="M10 35.5a8 8 0 0 1 5.8-7.7A11.5 11.5 0 0 1 37 22.5a9.5 9.5 0 0 1 15.8 7.1A7.5 7.5 0 0 1 52 44H18a8.5 8.5 0 0 1-8-8.5Z" fill="url(#heavy-rain-back-cloud)" opacity=".7" />
        </g>
        <g className="heavy-rain-cloud-main">
          <path d="M13 38.5a8.5 8.5 0 0 1 7.2-8.4A13 13 0 0 1 45 25.3a10 10 0 0 1 14.1 9A8.8 8.8 0 0 1 54 51H21.5A12.5 12.5 0 0 1 13 38.5Z" fill="url(#heavy-rain-cloud)" />
          <path d="M20 34c4-8 15-11 22-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity=".18" />
          {/* Squinting: arcs braced against the downpour, not open circles. */}
          <g fill="none" stroke="#1E2830" strokeWidth="2.1" strokeLinecap="round">
            <path d="M26 41q3-2.6 6 0" />
            <path d="M40 41q3-2.6 6 0" />
          </g>
          <path d="M33 46.5q3-1.8 6 0" stroke="#1E2830" strokeWidth="1.7" strokeLinecap="round" fill="none" />
        </g>

        {DROPS.map((drop, index) => (
          <line
            key={index}
            className="svg-heavy-rain-drop"
            x1={drop.x}
            y1={drop.y}
            x2={drop.x - 3.5}
            y2={drop.y + 12}
            stroke="#7BC8FF"
            strokeWidth="1.9"
            strokeLinecap="round"
            style={{ animationDelay: `${drop.delay}s` }}
          />
        ))}
      </svg>
    </div>
  );
}
