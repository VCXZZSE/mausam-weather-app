export type FogPhase = 'day' | 'night';

/**
 * Same cloud family as OvercastIcon — its front lobe geometry and palette,
 * sitting lower in the tile, with the sun/moon gone and fog bands drifting
 * across the body. The bands' static opacity sits on an outer group and the
 * animation on an inner one, so a CSS opacity animation never lands on a
 * node that also carries an SVG opacity attribute.
 */
export default function FogIcon({ phase = 'day' }: { phase?: FogPhase } = {}) {
  const isNight = phase === 'night';
  const band = isNight ? '#E8EEFA' : '#FFFFFF';
  const ink = isNight ? '#1E293B' : '#334155';

  return (
    <div className="weather-icon fog-icon" aria-hidden="true">
      <svg viewBox="0 0 72 72" fill="none">
        <defs>
          <linearGradient id={`fog-back-${phase}`} x1="18" y1="18" x2="49" y2="48">
            <stop stopColor={isNight ? '#CBD5E1' : '#E9F0F7'} />
            <stop offset="1" stopColor={isNight ? '#64748B' : '#9EADC0'} />
          </linearGradient>
          <linearGradient id={`fog-front-${phase}`} x1="23" y1="31" x2="49" y2="63">
            <stop stopColor={isNight ? '#94A3B8' : '#C9D5E3'} />
            <stop offset="1" stopColor={isNight ? '#475569' : '#728197'} />
          </linearGradient>
          <filter id={`fog-shadow-${phase}`} x="-30%" y="-40%" width="160%" height="190%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor={isNight ? '#0F172A' : '#26354B'} floodOpacity=".3" />
          </filter>
          {/* Feathers the bands out at both ends. The fade lives in a mask
              on the static parent, anchored to the viewBox, rather than
              being painted onto the bands: a gradient on the bands travels
              with them as they drift and arrives at the edge still
              part-opaque. Here it also keeps them inside the 72x72 box —
              the tile svg is overflow:visible, so bands painted past the
              viewBox would spill into the widget's own layout. */}
          <linearGradient id={`fog-band-fade-${phase}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="72" y2="0">
            <stop stopColor="#fff" stopOpacity="0" />
            <stop offset=".18" stopColor="#fff" stopOpacity="1" />
            <stop offset=".82" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={`fog-band-mask-${phase}`} maskUnits="userSpaceOnUse" x="0" y="0" width="72" height="72">
            <rect x="0" y="0" width="72" height="72" fill={`url(#fog-band-fade-${phase})`} />
          </mask>
        </defs>

        <g className="fog-cloud-back">
          <path d="M8 34a8 8 0 0 1 7.2-8 12.5 12.5 0 0 1 23.6-3A9.5 9.5 0 0 1 55 29.7 7.7 7.7 0 0 1 53 45H18A10 10 0 0 1 8 34Z" fill={`url(#fog-back-${phase})`} opacity=".8" />
        </g>
        <g className="fog-cloud-front" filter={`url(#fog-shadow-${phase})`}>
          <path d="M15 48.5a9 9 0 0 1 8.3-9 13.5 13.5 0 0 1 25.4-3.7A10.5 10.5 0 0 1 64 45.2 9 9 0 0 1 56 62H25.5A10.5 10.5 0 0 1 15 48.5Z" fill={`url(#fog-front-${phase})`} />
          <ellipse cx="24" cy="55" rx="4" ry="2.4" fill={isNight ? '#E3A2B6' : '#FCA5A5'} opacity=".45" />
          <ellipse cx="55" cy="55" rx="4" ry="2.4" fill={isNight ? '#E3A2B6' : '#FCA5A5'} opacity=".45" />
          {/* Half-closed: only the lower arc of each eye is drawn, so the
              flat top edge reads as a lowered lid. */}
          <g className="fog-icon-eyes" fill={ink}>
            <path d="M27.5 49Q31 53.6 34.5 49Z" />
            <path d="M44.5 49Q48 53.6 51.5 49Z" />
          </g>
          <path d="M35 56q4 3 8 0" stroke={ink} strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
        <g className="fog-bands" mask={`url(#fog-band-mask-${phase})`} fill={band}>
          <g className="fog-band" opacity=".3">
            <g className="fog-band-drift fog-band-drift-1">
              <rect x="-8" y="33" width="88" height="3.4" rx="1.7" />
            </g>
          </g>
          <g className="fog-band" opacity=".38">
            <g className="fog-band-drift fog-band-drift-2">
              <rect x="-8" y="47" width="88" height="3.8" rx="1.9" />
            </g>
          </g>
          <g className="fog-band" opacity=".26">
            <g className="fog-band-drift fog-band-drift-3">
              <rect x="-8" y="60" width="88" height="3.2" rx="1.6" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
