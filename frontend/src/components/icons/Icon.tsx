import {
  ICON_SPECS,
  LUCIDE_ICONS,
  SVG_ASSETS,
  isLucideIcon,
  isSvgAssetIcon,
  type IconName,
} from "./iconMap"

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
  /** Overrides the per-icon default. Ignored by the weather/AQI artwork. */
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
  const fill = head.match(/\bfill="([^"]+)"/)?.[1]
  const stroke = head.match(/\bstroke="([^"]+)"/)?.[1]
  const strokeWidth = head.match(/\bstroke-width="([^"]+)"/)?.[1]
  const strokeLinecap = head.match(/\bstroke-linecap="([^"]+)"/)?.[1]
  const strokeLinejoin = head.match(/\bstroke-linejoin="([^"]+)"/)?.[1]
  const strokeMiterlimit = head.match(/\bstroke-miterlimit="([^"]+)"/)?.[1]
  const rest = markup.slice(open + 1)

  const attrs = [
    'xmlns="http://www.w3.org/2000/svg"',
    'xmlns:xlink="http://www.w3.org/1999/xlink"',
    `viewBox="${viewBox}"`,
    fill ? `fill="${fill}"` : "",
    stroke ? `stroke="${stroke}"` : "",
    strokeWidth ? `stroke-width="${strokeWidth}"` : "",
    strokeLinecap ? `stroke-linecap="${strokeLinecap}"` : "",
    strokeLinejoin ? `stroke-linejoin="${strokeLinejoin}"` : "",
    strokeMiterlimit ? `stroke-miterlimit="${strokeMiterlimit}"` : "",
    size === undefined ? "" : `width="${size}" height="${size}"`,
    className ? `class="${className}"` : "",
    label
      ? `role="img" aria-label="${label.replace(/"/g, "&quot;")}"`
      : 'aria-hidden="true"',
  ]
    .filter(Boolean)
    .join(" ")

  return `<svg ${attrs}>${rest}`
}

/**
 * The only way to render an icon. Components pass a name from the `IconName`
 * union; the art comes from `iconMap.ts` — inline path data for the interface
 * icons, a lucide-react glyph for the payload icons, a vendored SVG file for
 * weather and AQI.
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

  if (isLucideIcon(name)) {
    const Glyph = LUCIDE_ICONS[name]
    return (
      <Glyph
        {...(size === undefined ? {} : { size })}
        strokeWidth={strokeWidth ?? 1.8}
        className={className}
        data-icon={name}
        {...(label
          ? { role: "img", "aria-label": label }
          : { "aria-hidden": true })}
      />
    )
  }

  const spec = ICON_SPECS[name]
  const accessibility = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const }

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
