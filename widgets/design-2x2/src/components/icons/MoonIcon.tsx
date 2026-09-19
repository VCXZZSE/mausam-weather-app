const STARS = [
  { x: 8, y: 14, r: 1.4, cls: 'star-1' },
  { x: 57, y: 11, r: 1, cls: 'star-2' },
  { x: 62, y: 40, r: 1.4, cls: 'star-3' },
  { x: 12, y: 55, r: .9, cls: 'star-4' },
];

export default function MoonIcon() {
  return (
    <div className="weather-icon moon-icon" aria-hidden="true">
      <svg viewBox="0 0 72 72" fill="none">
        <defs>
          <linearGradient id="moon-face" x1="18" y1="15" x2="55" y2="57">
            <stop stopColor="#FFFFFF" />
            <stop offset=".48" stopColor="#DCE7FA" />
            <stop offset="1" stopColor="#9CB5E1" />
          </linearGradient>
          <linearGradient id="moon-shadow" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#3F528D" />
            <stop offset="1" stopColor="#101A43" />
          </linearGradient>
          <filter id="moon-soft-glow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <mask id="crescent-mask">
            <circle cx="35" cy="36" r="22" fill="white" />
            <circle cx="46" cy="27" r="22" fill="black" />
          </mask>
        </defs>

        {STARS.map((star, index) => (
          <g key={index} className={star.cls} style={{ transformOrigin: `${star.x}px ${star.y}px` }}>
            <circle cx={star.x} cy={star.y} r={star.r} fill="white" />
            <path d={`M${star.x - 3} ${star.y}h6M${star.x} ${star.y - 3}v6`} stroke="#E9F1FF" strokeWidth=".6" strokeLinecap="round" />
          </g>
        ))}
        <circle className="moon-aura" cx="35" cy="36" r="25" fill="#AFC7FF" opacity=".3" filter="url(#moon-soft-glow)" />
        <g className="moon-body">
          <circle cx="35" cy="36" r="22" fill="url(#moon-face)" mask="url(#crescent-mask)" />
          <circle cx="24" cy="31" r="3" fill="url(#moon-shadow)" opacity=".14" mask="url(#crescent-mask)" />
          <circle cx="29" cy="45" r="2" fill="url(#moon-shadow)" opacity=".16" mask="url(#crescent-mask)" />
          <circle cx="19" cy="40" r="1.5" fill="white" opacity=".25" mask="url(#crescent-mask)" />
        </g>
      </svg>
    </div>
  );
}
