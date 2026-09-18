import { ICON_SPECS, type IconName } from "./iconMap"

export type { IconName, PersonalizedIcon } from "./iconMap"
export { isIconName, resolveIconName, LEGACY_EMOJI_ALIASES } from "./iconMap"

type IconProps = {
  name: IconName
  /**
   * Omit to let CSS size the icon — the components this replaces sized their
   * SVGs from the stylesheet, so passing a number here where they did not
   * would change the layout.
   */
  size?: number
  /**
   * Accessible name. Provide it when the icon is the only carrier of the
   * information; omit it for decoration sitting beside a text label, and the
   * icon is hidden from assistive tech instead.
   */
  label?: string
  className?: string
  /** Overrides the per-icon default from ICON_SPECS. */
  strokeWidth?: number
}

/**
 * The only way to render an icon. Components pass a name from the `IconName`
 * union; the art and its stroke weight come from `iconMap.ts`.
 *
 * Colour is inherited (`stroke="currentColor"`), so icons follow whatever
 * `color` the surrounding theme rule sets and need no per-theme handling here.
 */
export function Icon({
  name,
  size,
  label,
  className,
  strokeWidth,
}: IconProps) {
  const spec = ICON_SPECS[name]
  const accessibility = label
    ? ({ role: "img" as const, "aria-label": label })
    : ({ "aria-hidden": true as const })

  return (
    <svg
      viewBox="0 0 24 24"
      {...(size === undefined ? {} : { width: size, height: size })}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? spec.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...accessibility}
    >
      {spec.circles?.map((circle) => (
        <circle
          key={`${circle.cx}-${circle.cy}-${circle.r}`}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
        />
      ))}
      {spec.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
