const RAIN_COLS = [10, 22, 34, 46, 58, 8, 20, 38, 50, 16, 30, 44];

export default function ThunderstormIcon() {
  return (
    <div className="relative flex flex-col items-center" style={{ width: 68, height: 68 }}>
      {/* Cloud */}
      <div className="cloud-main absolute top-0" style={{ width: 64, zIndex: 2 }}>
        <svg viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="tsi-cloud-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8090B0" />
              <stop offset="100%" stopColor="#5A6880" />
            </linearGradient>
          </defs>
          <path
            d="M52 28H12C7.58 28 4 24.42 4 20C4 16.13 6.85 12.93 10.6 12.14C10.21 11.14 10 10.09 10 9C10 4.58 13.58 1 18 1C19.93 1 21.7 1.67 23.1 2.78C25.04 1.01 27.65 0 30.5 0C36.3 0 41 4.7 41 10.5C41 10.73 40.99 10.96 40.97 11.18C42.27 10.44 43.79 10 45.5 10C50.19 10 54 13.81 54 18.5C54 23.74 49.74 28 44.5 28H52Z"
            fill="url(#tsi-cloud-grad)"
          />
        </svg>
      </div>

      {/* Lightning bolt */}
      <div className="absolute" style={{ top: 26, left: 20, zIndex: 3 }}>
        <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
          <defs>
            <linearGradient id="tsi-bolt-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFE55C" />
              <stop offset="100%" stopColor="#FF9C00" />
            </linearGradient>
            <filter id="tsi-bolt-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <path
            className="lightning-bolt"
            d="M16 2L4 16H11L8 26L20 12H13L16 2Z"
            fill="url(#tsi-bolt-grad)"
            filter="url(#tsi-bolt-glow)"
          />
        </svg>
      </div>

      {/* Rain drops */}
      <div className="absolute overflow-hidden" style={{ top: 38, left: 0, width: 68, height: 30 }}>
        {RAIN_COLS.map((left, i) => (
          <div
            key={i}
            className="rain-drop absolute"
            style={{
              left,
              top: 0,
              width: 1.5,
              height: 8,
              background: 'linear-gradient(to bottom, rgba(130,180,255,0.85), rgba(100,160,255,0.3))',
              borderRadius: 2,
              transform: 'rotate(12deg)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
