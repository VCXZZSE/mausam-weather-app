// Comfort & Feel dial - a colour-coded thermometer/humidity mark that replaces
// the comfort emoji, which rendered inconsistently across platform emoji fonts.

type ComfortTone = {
  /** Drives the ring, glyph and the index/label text so the card reads as one unit. */
  color: string
  /** 0-1 mercury fill of the thermometer stem. */
  mercury: number
}

// comfort.icon is the only field that separates "too cold" from "too hot" - both
// score the same on the index - so it stays the discriminator while label carries
// severity. Anything unrecognised falls back to the label alone.
export function comfortTone(label: string, icon: string): ComfortTone {
  if (icon === "🥶") return { color: "#60a5fa", mercury: 0.16 }
  if (label === "Comfortable") return { color: "#34d399", mercury: 0.5 }
  if (label === "Very Uncomfortable") return { color: "#f87171", mercury: 0.94 }
  return { color: "#f59e0b", mercury: 0.78 }
}

/** Replaces the comfort emoji: a tinted dial with a thermometer + humidity drop. */
export function ComfortIndicator({
  label,
  icon,
  size = 48,
}: {
  label: string
  icon: string
  size?: number
}) {
  const { color, mercury } = comfortTone(label, icon)
  const stemTop = 15
  const stemBottom = 27
  const fillHeight = (stemBottom - stemTop) * mercury

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={`Comfort: ${label}`}
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <circle cx="24" cy="24" r="23" fill={`${color}1f`} />
      <circle cx="24" cy="24" r="23" stroke={`${color}66`} strokeWidth="1.5" />

      {/* Glyph bbox is x 16.75-35, y 12.75-34.25; nudge it onto the circle's centre. */}
      <g transform="translate(-1.9 0.5)">
        {/* Thermometer - stem outline, bulb, then the mercury at the state's level. */}
        <rect
          x="17.75"
          y="12.75"
          width="6.5"
          height="15"
          rx="3.25"
          stroke={`${color}b3`}
          strokeWidth="1.5"
        />
        <circle cx="21" cy="30" r="4.25" stroke={`${color}b3`} strokeWidth="1.5" />
        <circle cx="21" cy="30" r="2.5" fill={color} />
        <rect
          x="19.75"
          y={stemBottom - fillHeight}
          width="2.5"
          height={fillHeight}
          rx="1.25"
          fill={color}
        />

        {/* Humidity drop. */}
        <path
          d="M31 17.5c2.6 3.2 4 5.2 4 7a4 4 0 0 1-8 0c0-1.8 1.4-3.8 4-7z"
          stroke={`${color}b3`}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
