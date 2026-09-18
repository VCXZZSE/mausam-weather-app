/**
 * Static overcast art for the 2x2 widget presets, which are mirrored to the
 * native Android tile. That tile renders through RemoteViews, so no CSS
 * reaches it and nothing here is animated — the animated version of this
 * illustration lives on the hero card (.cloud-character-overcast in App.tsx).
 *
 * Because no stylesheet targets these shapes, the disc's `opacity` attribute
 * is the only thing setting its dimming; there is no CSS opacity animation
 * that could override it.
 */

/** Which disc sits behind the cloud: the sun by day, the moon by night. */
export type OvercastPhase = 'day' | 'night';

const ART = {
  day: {
    cloud: ['#F4F7FC', '#B8C6DA'],
    back:  ['#DEE6F2', '#AEBBCF'],
    disc:  ['#FFE6B0', '#F0B75F'],
    discOpacity: 0.62,
    ink:   '#334155',
    blush: '#FCA5A5',
  },
  night: {
    cloud: ['#CBD5E1', '#94A3B8'],
    back:  ['#B5C2D5', '#8393AB'],
    disc:  ['#E9EFFC', '#B1C1DF'],
    discOpacity: 0.5,
    ink:   '#1E293B',
    blush: '#E3A2B6',
  },
} as const;

export default function OvercastIcon({ phase }: { phase: OvercastPhase }) {
  const a = ART[phase];
  return (
    <div className="relative" style={{ width: 68, height: 68 }}>
      <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`oci-cloud-${phase}`} gradientUnits="userSpaceOnUse" x1="0" y1="25" x2="0" y2="57">
            <stop offset="0%" stopColor={a.cloud[0]} />
            <stop offset="100%" stopColor={a.cloud[1]} />
          </linearGradient>
          <linearGradient id={`oci-back-${phase}`} gradientUnits="userSpaceOnUse" x1="0" y1="16" x2="0" y2="31.5">
            <stop offset="0%" stopColor={a.back[0]} />
            <stop offset="100%" stopColor={a.back[1]} />
          </linearGradient>
          {/* Fades out rather than stopping flat, so the glow has no hard rim */}
          <radialGradient id={`oci-glow-${phase}`} cx="50%" cy="50%" r="50%">
            <stop offset="52%" stopColor={a.disc[0]} stopOpacity="0.4" />
            <stop offset="100%" stopColor={a.disc[0]} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`oci-disc-${phase}`} cx="38%" cy="32%" r="72%">
            <stop offset="0%" stopColor={a.disc[0]} />
            <stop offset="100%" stopColor={a.disc[1]} />
          </radialGradient>
        </defs>

        {/* Background scenery — sun by day, moon by night. Dimmed, and
            deliberately faceless: the cloud in front is the character.
            The cloud hides ~2/3 of the disc, so the sky reads as covered. */}
        <g opacity={a.discOpacity}>
          <circle cx="47" cy="28" r="16" fill={`url(#oci-glow-${phase})`} />
          <circle cx="47" cy="28" r="12.5" fill={`url(#oci-disc-${phase})`} />
          {phase === 'night' && (
            <>
              <circle cx="50.5" cy="21" r="2.3" fill={a.disc[1]} opacity="0.5" />
              <circle cx="43.5" cy="19.5" r="1.4" fill={a.disc[1]} opacity="0.4" />
            </>
          )}
        </g>

        {/* Smaller, fainter cloud further back, for depth */}
        <g opacity="0.5">
          <g fill={`url(#oci-back-${phase})`}>
            <circle cx="16" cy="23" r="7" />
            <circle cx="24" cy="24.5" r="5.5" />
            <rect x="10" y="24" width="20" height="7.5" rx="3.75" />
          </g>
        </g>

        {/* Foreground cloud — the character */}
        <g fill={`url(#oci-cloud-${phase})`}>
          <circle cx="24" cy="38" r="13" />
          <circle cx="44" cy="34" r="12.5" />
          <circle cx="54" cy="41" r="8.5" />
          <rect x="10" y="39" width="48" height="18" rx="9" />
        </g>
        <ellipse cx="22" cy="30" rx="8" ry="3.6" fill="#FFFFFF" opacity="0.28" />

        {/* Face */}
        <ellipse cx="21" cy="47" rx="3.4" ry="2.2" fill={a.blush} opacity="0.45" />
        <ellipse cx="45" cy="47" rx="3.4" ry="2.2" fill={a.blush} opacity="0.45" />
        <g fill={a.ink}>
          <circle cx="28" cy="42" r="2.2" />
          <circle cx="39" cy="42" r="2.2" />
        </g>
        <path
          d="M30 47.5q3.5 3.6 7 0"
          fill="none"
          stroke={a.ink}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
