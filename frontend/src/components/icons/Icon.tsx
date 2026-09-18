import { ICON_SPECS, SVG_ASSETS, isSvgAssetIcon, type IconName } from "./iconMap"

export type {
  IconName,
  PersonalizedIcon,
  WeatherIconName,
  AqiIconName,
  AqiBand,
} from "./iconMap"
export {
  isIconName,
  resolveIconName,
  LEGACY_EMOJI_ALIASES,
  weatherIconForCondition,
  aqiBandForIndex,
  aqiBandForLabel,
  AQI_BANDS,
  FALLBACK_WEATHER_ICON,
} from "./iconMap"

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
  /** Overrides the per-icon default. Line icons only. */
  strokeWidth?: number
}

/**
 * Rewrites the root <svg> of a vendored file so it carries our sizing and
 * accessibility attributes instead of its own. The artwork itself is
 * untouched; only attributes on the outermost tag are replaced.
 */
function prepareAssetSvg(
  markup: string,
  size: number | undefined,
  label: string | undefined,
  className: string | undefined,
): string {
  const open = markup.indexOf(">")
  if (open === -1) return markup

  const head = markup.slice(0, open)
  const viewBox = head.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24"
  const rest = markup.slice(open + 1)

  const attrs = [
    'xmlns="http://www.w3.org/2000/svg"',
    'xmlns:xlink="http://www.w3.org/1999/xlink"',
    `viewBox="${viewBox}"`,
    size === undefined ? "" : `width="${size}" height="${size}"`,
    className ? `class="${className}"` : "",
    label ? `role="img" aria-label="${label.replace(/"/g, "&quot;")}"` : 'aria-hidden="true"',
  ]
    .filter(Boolean)
    .join(" ")

  return `<svg ${attrs}>${rest}`
}

/**
 * The only way to render an icon. Components pass a name from the `IconName`
 * union; the art comes from `iconMap.ts` — inline path data for the interface
 * icons, a vendored SVG file for weather and AQI.
 *
 * Line icons inherit colour (`stroke="currentColor"`), so they follow whatever
 * the surrounding theme rule sets and need no per-theme handling here. The
 * weather artwork is deliberately full-colour.
 *
 * Every icon carries `data-icon="<name>"`, which is how tests assert on which
 * icon rendered now that there is no emoji text to match against.
 */
export function Icon({ name, size, label, className, strokeWidth }: IconProps) {
  // Narrowing here leaves `name` as a LineIconName below, so ICON_SPECS is
  // indexed with a key it is guaranteed to have.
  if (isSvgAssetIcon(name)) {
    const html = prepareAssetSvg(SVG_ASSETS[name], size, label, className)
    // The markup is a build-time import from our own assets directory, never
    // anything user- or network-supplied.
    return (
      <span
        className="icon-asset"
        data-icon={name}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

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
      data-icon={name}
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
