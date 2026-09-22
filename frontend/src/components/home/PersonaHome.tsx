// The persona-driven parts of the homepage.
//
// services/homePresets.ts decides *what* a persona sees and in what order; this
// file draws it. Every tile reads from the weather payload the homepage already
// has - nothing here fetches, and nothing here invents a reading. A tile whose
// data is missing from the payload returns null so the grid closes up around it
// rather than showing an empty card.

import { useTranslation, isTightUnit } from "@/i18n"
import { Icon } from "@/components/icons/Icon"
import { ComfortIndicator, comfortTone } from "@/components/common/ComfortIndicator"
import {
  AdviceLine,
  Badge,
  Bar,
  Card,
  CardLabel,
  IconByName,
  INDIA_NAQI_GRADIENT,
} from "@/components/common/Tiles"
import {
  convertRain,
  convertTemperature,
  formatClockTimeStr,
  useSettings,
} from "@/services/settingsStore"
import {
  resolveWeatherIcon,
  type DashboardWeatherData,
} from "@/services/weatherData"
import type {
  GlanceId,
  HeroStatId,
  MetricId,
  MetricTile,
} from "@/services/homePresets"
import type { ReactNode } from "react"

type Weather = DashboardWeatherData

/**
 * A square tile has room for one instruction, not three.
 *
 * The rules engine joins advice with " · " ("Drink 3-4L water today · Avoid
 * exertion 11 AM-4 PM · Use ORS if feeling dehydrated"). Rendering all of it in
 * a one-column tile overflows a fixed-aspect box and clips mid-sentence, which
 * reads worse than showing less. Each segment stands on its own, so the first
 * one is a complete piece of advice; the rest are on the tab the tile links to.
 */
function leadAdvice(text: string): string {
  const [first] = text.split(/\s*·\s*/).filter(Boolean)
  return first ?? text
}

// ── Hero stat strip ───────────────────────────────────────────────────────────

/**
 * The three readings under the hero temperature. Which three is the preset's
 * call: a commuter opens on visibility, a farmer on dew point, and neither has
 * to hunt for it further down the page.
 */
export function HeroStatStrip({
  weather,
  stats,
}: {
  weather: Weather
  stats: readonly HeroStatId[]
}) {
  const { t, td, n } = useTranslation()
  const [settings] = useSettings()
  const { current } = weather

  const read = (id: HeroStatId): { v: string; u: string; l: string } => {
    switch (id) {
      case "wind":
        return {
          v: n(current.windSpeed),
          u: t("unit.kmh"),
          l: t("stat.wind", { direction: td(current.windDirection) }),
        }
      case "gust":
        return { v: n(current.windGust), u: t("unit.kmh"), l: t("stat.gust") }
      case "humidity":
        return { v: n(current.humidity), u: t("unit.percent"), l: t("stat.humidity") }
      case "visibility":
        return { v: n(current.visibility), u: t("unit.km"), l: t("stat.visibility") }
      case "pressure":
        return { v: n(current.pressure), u: t("unit.hpa"), l: t("stat.pressure") }
      case "dewPoint":
        return {
          v: n(convertTemperature(current.dewPoint, settings.temperatureUnit)),
          u: t("unit.degree"),
          l: t("stat.dewPoint"),
        }
      case "heatIndex":
        return {
          v: n(convertTemperature(current.heatIndex, settings.temperatureUnit)),
          u: t("unit.degree"),
          l: t("stat.heatIndex"),
        }
      case "uv":
        return { v: n(weather.uv.index), u: "", l: t("stat.uv") }
      case "rainChance":
        return {
          v: n(weather.rainfall.chance),
          u: t("unit.percent"),
          l: t("stat.rainChance"),
        }
      case "waterTemp":
        return {
          v: n(
            convertTemperature(
              weather.swimming.waterTemperature,
              settings.temperatureUnit,
            ),
          ),
          u: t("unit.degree"),
          l: t("stat.waterTemp"),
        }
    }
  }

  return (
    <div
      className="weather-stats-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        marginTop: 20,
        paddingTop: 18,
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {stats.map((id) => {
        const s = read(id)
        return (
          <div className="weather-stat" key={id} style={{ textAlign: "center" }}>
            <div className="weather-stat-label">{s.l}</div>
            <div
              className="weather-stat-value"
              style={{ fontSize: 13, fontWeight: 800, color: "white", marginTop: 4 }}
            >
              {s.v}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.35)",
                  marginInlineStart: !s.u || isTightUnit(s.u) ? 0 : 2,
                }}
              >
                {s.u}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Glance rail ───────────────────────────────────────────────────────────────

type GlanceChip = { id: GlanceId; icon: string; label: string; value: string; tone: string }

/**
 * Four chips of the persona's own headline readings, sitting between the hero
 * card and the detail below it. This replaces the backend's fixed
 * Health/Move/Commute/Outdoors row on a persona homepage: those four are the
 * right four for nobody in particular.
 */
export function GlanceRail({
  weather,
  glance,
}: {
  weather: Weather
  glance: readonly GlanceId[]
}) {
  const { t, td, n, nu } = useTranslation()
  const [settings] = useSettings()
  const { current } = weather

  const build = (id: GlanceId): GlanceChip | null => {
    switch (id) {
      case "aqi":
        return {
          id,
          icon: "heart",
          label: t("glance.air"),
          value: weather.airQuality
            ? `${n(weather.airQuality.index)} · ${td(weather.airQuality.label)}`
            : t("common.unavailable"),
          tone: "glance-air",
        }
      case "pollen":
        return {
          id,
          icon: "pollen",
          label: t("glance.pollen"),
          value: td(weather.pollen.overall),
          tone: "glance-pollen",
        }
      case "uv":
        return {
          id,
          icon: "sun",
          label: t("glance.sun"),
          value: `${n(weather.uv.index)} · ${td(weather.uv.label)}`,
          tone: "glance-sun",
        }
      case "humidity":
        return {
          id,
          icon: "hydration",
          label: t("glance.humidity"),
          value: nu(current.humidity, "unit.percent"),
          tone: "glance-water",
        }
      case "rain":
        return {
          id,
          icon: "umbrella",
          label: t("glance.rain"),
          value: nu(weather.rainfall.chance, "unit.percent"),
          tone: "glance-water",
        }
      case "wind":
        return {
          id,
          icon: "wind",
          label: t("glance.wind"),
          value: `${nu(current.windSpeed, "unit.kmh")} ${td(current.windDirection)}`,
          tone: "glance-wind",
        }
      case "heat":
        return {
          id,
          icon: "hot",
          label: t("glance.heat"),
          value: nu(
            convertTemperature(current.heatIndex, settings.temperatureUnit),
            "unit.degree",
          ),
          tone: "glance-heat",
        }
      case "visibility":
        return {
          id,
          icon: "visibility",
          label: t("glance.visibility"),
          value: nu(current.visibility, "unit.km"),
          tone: "glance-road",
        }
      case "soil":
        return {
          id,
          icon: "sprout",
          label: t("glance.soil"),
          value: td(weather.garden.soil),
          tone: "glance-soil",
        }
      case "sea":
        return {
          id,
          icon: "waves",
          label: t("glance.sea"),
          value: td(weather.swimming.badge),
          tone: "glance-sea",
        }
      case "run":
        return {
          id,
          icon: "trending-up",
          label: t("glance.run"),
          value: weather.running.start
            ? `${formatClockTimeStr(weather.running.start, settings.timeFormat)}–${formatClockTimeStr(weather.running.end, settings.timeFormat)}`
            : t("common.unavailable"),
          tone: "glance-move",
        }
      case "commute":
        return {
          id,
          icon: "commute",
          label: t("glance.commute"),
          value: td(weather.commute.status),
          tone: "glance-road",
        }
      case "comfort":
        return {
          id,
          icon: "comfortable",
          label: t("glance.comfort"),
          value: td(weather.comfort.label),
          tone: "glance-comfort",
        }
      case "sunset":
        return {
          id,
          icon: "evening",
          label: t("glance.sunset"),
          value: formatClockTimeStr(weather.astronomy.sunset, settings.timeFormat),
          tone: "glance-sun",
        }
      case "alerts": {
        const count = weather.alerts.length
        return {
          id,
          icon: count ? "warning" : "success",
          label: t("glance.alerts"),
          value: count
            ? t("glance.alertsActive", { count })
            : t("glance.allClear"),
          tone: count ? "glance-warn" : "glance-clear",
        }
      }
    }
  }

  const chips = glance.map(build).filter((chip): chip is GlanceChip => chip !== null)
  if (!chips.length) return null

  return (
    <div className="audience-focus persona-glance">
      <div className="audience-focus-heading">{t("glance.heading")}</div>
      <div className="audience-focus-grid">
        {chips.map((chip) => (
          <div key={chip.id} className={`audience-focus-card ${chip.tone}`}>
            <span className="audience-focus-icon">
              <IconByName name={chip.icon} />
            </span>
            <div>
              <strong>{chip.label}</strong>
              <small>{chip.value}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Metric tiles ──────────────────────────────────────────────────────────────

/** A row of small readings inside a wide tile. */
function TileStats({
  items,
}: {
  items: Array<{ key: string; label: string; value: ReactNode }>
}) {
  return (
    <div className="tile-stat-row">
      {items.map((item) => (
        <div className="tile-stat" key={item.key}>
          <div className="tile-stat-label">{item.label}</div>
          <div className="tile-stat-value">{item.value}</div>
        </div>
      ))}
    </div>
  )
}

function AqiTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td, n } = useTranslation()
  return (
    <Card
      className="metric-primary-card aqi-tile"
      grad="linear-gradient(140deg,#431407 0%,#1c0803 100%)"
      border="rgba(245,158,11,0.12)"
      span2={wide}
    >
      {weather.airQuality ? (
        <>
          <Badge color="#fbbf24" bg="rgba(245,158,11,0.14)">
            {t("badge.indiaAqi", { index: weather.airQuality.index })}
          </Badge>
          <CardLabel>{t("card.airQuality")}</CardLabel>
          <div className="aqi-status">{td(weather.airQuality.label)}</div>
          <div className="aqi-meter">
            <Bar
              pct={(weather.airQuality.index / weather.airQuality.scaleMax) * 100}
              fill={INDIA_NAQI_GRADIENT}
              height={5}
            />
          </div>
          <div className="aqi-pollutants">
            {weather.airQuality.pollutants
              .slice(0, wide ? 4 : 2)
              .map((pollutant) => (
                <div className="aqi-pollutant" key={pollutant.label}>
                  <div className="aqi-pollutant-label">{pollutant.label}</div>
                  <div
                    className="aqi-pollutant-value"
                    style={{ color: pollutant.color }}
                  >
                    {n(pollutant.value)}
                  </div>
                </div>
              ))}
          </div>
          {wide && (
            <div className="tile-advice">
              <AdviceLine
                text={td(weather.airQuality.advice)}
                tone={weather.airQuality.adviceTone}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <CardLabel>{t("card.airQuality")}</CardLabel>
          <div className="aqi-unavailable">
            <div className="aqi-unavailable-title">{t("aqi.unavailable")}</div>
            <div className="aqi-unavailable-note">{t("aqi.noStation")}</div>
          </div>
        </>
      )}
    </Card>
  )
}

function UvTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td, n } = useTranslation()
  return (
    <Card
      className="metric-primary-card uv-tile"
      grad="linear-gradient(140deg,#7c2d12 0%,#2c0e07 100%)"
      border="rgba(251,146,60,0.1)"
      span2={wide}
    >
      <Badge color="#fb923c" bg="rgba(251,146,60,0.14)">
        {td(weather.uv.label).toUpperCase()}
      </Badge>
      <CardLabel>{t("card.uvIndex")}</CardLabel>
      <div className="metric-card-number metric-index">{n(weather.uv.index)}</div>
      <div className="metric-card-emphasis">{td(weather.uv.recommendation)}</div>
      <div className="metric-card-note">
        {t("uv.peak", { value: td(weather.uv.peakHours) })}
      </div>
    </Card>
  )
}

function RunTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td } = useTranslation()
  const [settings] = useSettings()
  return (
    <Card
      className="metric-primary-card run-tile"
      grad="linear-gradient(140deg,#064e3b 0%,#022c22 100%)"
      border="rgba(52,211,153,0.1)"
      span2={wide}
    >
      <Badge color="#34d399" bg="rgba(52,211,153,0.14)">
        {td(weather.running.badge)}
      </Badge>
      <CardLabel>
        {weather.running.dayLabel
          ? t("card.bestRunOn", { day: td(weather.running.dayLabel) })
          : t("card.bestRun")}
      </CardLabel>
      <div className="metric-card-number metric-run-time">
        {weather.running.start
          ? `${formatClockTimeStr(weather.running.start, settings.timeFormat)}–${formatClockTimeStr(weather.running.end, settings.timeFormat)}`
          : t("common.unavailable")}
      </div>
      <div className="metric-card-emphasis">{td(weather.running.summary)}</div>
      <div className="metric-card-note metric-card-accent">
        {t("run.sunrise", {
          value: formatClockTimeStr(
            weather.running.sunrise ??
              (weather.running.dayLabel === "Tomorrow"
                ? t("common.unavailable")
                : weather.astronomy.sunrise),
            settings.timeFormat,
          ),
        })}
      </div>
    </Card>
  )
}

function RainfallTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td, n, nu } = useTranslation()
  const [settings] = useSettings()
  const rainToday = convertRain(weather.rainfall.today, settings.rainUnit)
  const rainMonth =
    weather.rainfall.month !== undefined
      ? convertRain(weather.rainfall.month, settings.rainUnit)
      : null
  return (
    <Card
      className="metric-primary-card rainfall-tile"
      grad="linear-gradient(140deg,#1e3a5f 0%,#0a1830 100%)"
      border="rgba(96,165,250,0.1)"
      span2={wide}
    >
      <Badge color="#60a5fa" bg="rgba(96,165,250,0.14)">
        {nu(weather.rainfall.chance, "unit.percent")}
      </Badge>
      <CardLabel>{t("card.rainfallToday")}</CardLabel>
      <div className="metric-card-number metric-rainfall">
        {n(rainToday.value)}
        <span> {td(rainToday.unit)}</span>
      </div>
      <div className="metric-card-emphasis">{td(weather.rainfall.periodLabel)}</div>
      <div className="metric-card-note">
        {t("rainfall.month", {
          value:
            rainMonth !== null
              ? `${n(rainMonth.value)} ${td(rainMonth.unit)}`
              : t("common.unavailable"),
        })}
      </div>
    </Card>
  )
}

function CommuteTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td } = useTranslation()
  return (
    <Card
      className="commute-card commute-tile"
      grad="linear-gradient(140deg,#2e1065 0%,#100522 100%)"
      border="rgba(167,139,250,0.1)"
      span2={wide !== false}
    >
      <Badge color="#f87171" bg="rgba(239,68,68,0.14)">
        {td(weather.commute.status)}
      </Badge>
      <CardLabel>
        <span data-i18n-ignore>
          {t("card.commuteStatus", { location: weather.commute.location })}
        </span>
      </CardLabel>
      <div className="commute-items">
        {weather.commute.items.map((c) => (
          <div className="commute-item" key={c.name}>
            <div className="commute-item-icon">
              <IconByName name={c.icon} />
            </div>
            <div className="commute-item-name">{td(c.name)}</div>
            <div className="commute-item-value">{td(c.value)}</div>
            <div className="commute-item-detail">{td(c.detail)}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/**
 * Field and soil, for the agriculture persona.
 *
 * `garden` has been in the payload since the backend rules engine landed but
 * had no screen to appear on. Soil state is derived from rain chance and
 * humidity (backend rules/garden.ts), not measured, so it is labelled as a
 * reading of today's conditions rather than of the ground itself.
 */
function SoilTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td, n, nu } = useTranslation()
  const [settings] = useSettings()
  const rainToday = convertRain(weather.rainfall.today, settings.rainUnit)
  return (
    <Card
      className="metric-primary-card tile-flow soil-tile"
      grad="linear-gradient(140deg,#14532d 0%,#052e16 100%)"
      border="rgba(74,222,128,0.12)"
      span2={wide}
    >
      <Badge color="#4ade80" bg="rgba(74,222,128,0.14)">
        {td(weather.garden.badge)}
      </Badge>
      <CardLabel>{t("card.soil")}</CardLabel>
      <div className="metric-card-number metric-soil">{td(weather.garden.soil)}</div>
      <div className="metric-card-emphasis">{td(weather.garden.title)}</div>
      {wide && (
        <TileStats
          items={[
            {
              key: "rain",
              label: t("soil.rainToday"),
              value: `${n(rainToday.value)} ${td(rainToday.unit)}`,
            },
            {
              key: "humidity",
              label: t("stat.humidity"),
              value: nu(weather.current.humidity, "unit.percent"),
            },
            {
              key: "wind",
              label: t("soil.spray"),
              value: nu(weather.current.windSpeed, "unit.kmh"),
            },
          ]}
        />
      )}
      <div className="tile-advice">
        <AdviceLine
          text={wide ? td(weather.garden.note) : leadAdvice(td(weather.garden.note))}
          tone={weather.garden.noteTone}
        />
      </div>
    </Card>
  )
}

/**
 * Sea and surf, for the coastal persona.
 *
 * Only the readings the backend actually derives are shown. `swimming.venue`,
 * `distance` and `depth` are a hardcoded placeholder (see backend
 * rules/swimming.ts) and are deliberately left off rather than dressed up as a
 * live swell reading; water temperature is an approximation from air
 * temperature, and says so.
 */
function SeaTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td, n, nu } = useTranslation()
  const [settings] = useSettings()
  return (
    <Card
      className="metric-primary-card sea-tile"
      grad="linear-gradient(140deg,#0c4a6e 0%,#062330 100%)"
      border="rgba(56,189,248,0.12)"
      span2={wide}
    >
      <Badge color="#38bdf8" bg="rgba(56,189,248,0.14)">
        {td(weather.swimming.badge)}
      </Badge>
      <CardLabel>{t("card.sea")}</CardLabel>
      <div className="metric-card-number metric-index">
        {n(
          convertTemperature(
            weather.swimming.waterTemperature,
            settings.temperatureUnit,
          ),
        )}
        <span className="metric-card-unit">{t("unit.degree")}</span>
      </div>
      <div className="metric-card-emphasis">{t("sea.waterApprox")}</div>
      {wide && (
        <TileStats
          items={[
            {
              key: "wind",
              label: t("glance.wind"),
              value: nu(weather.current.windSpeed, "unit.kmh"),
            },
            {
              key: "gust",
              label: t("stat.gust"),
              value: nu(weather.current.windGust, "unit.kmh"),
            },
            {
              key: "peak",
              label: t("sea.peakSun"),
              value: formatClockTimeStr(
                weather.swimming.peakTime,
                settings.timeFormat,
              ),
            },
          ]}
        />
      )}
      <div className="tile-advice">
        <AdviceLine
          text={wide ? td(weather.swimming.advice) : leadAdvice(td(weather.swimming.advice))}
          tone={weather.swimming.adviceTone}
        />
      </div>
    </Card>
  )
}

function PollenTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td } = useTranslation()
  return (
    <Card
      className="metric-primary-card tile-flow pollen-tile"
      grad="linear-gradient(140deg,#4a1d5f 0%,#1c0a26 100%)"
      border="rgba(217,140,255,0.12)"
      span2={wide}
    >
      <Badge color="#d8b4fe" bg="rgba(192,132,252,0.14)">
        {td(weather.pollen.overall).toUpperCase()}
      </Badge>
      <CardLabel>{t("card.pollen")}</CardLabel>
      <div className="pollen-bars">
        {weather.pollen.items.map((item) => (
          <div className="pollen-bar-row" key={item.type}>
            <span className="pollen-bar-type">{td(item.type)}</span>
            <span className="pollen-bar-track">
              <Bar pct={item.percent} fill={item.color} height={4} />
            </span>
            <span className="pollen-bar-level" style={{ color: item.color }}>
              {td(item.level)}
            </span>
          </div>
        ))}
      </div>
      {wide && (
        <div className="tile-advice">
          <AdviceLine
            text={td(weather.pollen.advice)}
            tone={weather.pollen.adviceTone}
          />
        </div>
      )}
      {!wide && <div className="metric-card-note">{t("pollen.seasonal")}</div>}
    </Card>
  )
}

function ComfortTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td, n } = useTranslation()
  const tone = comfortTone(weather.comfort.label, weather.comfort.icon)
  return (
    <Card
      className="metric-primary-card tile-flow comfort-tile"
      grad="linear-gradient(140deg,#1e293b 0%,#070c16 100%)"
      border="rgba(148,163,184,0.14)"
      span2={wide}
    >
      <CardLabel>{t("forecast.comfortIndex")}</CardLabel>
      <div className="comfort-tile-head">
        <div>
          <div
            className="metric-card-number metric-index"
            style={{ color: tone.color }}
          >
            {n(weather.comfort.index)}
          </div>
          <div className="metric-card-emphasis">{td(weather.comfort.label)}</div>
        </div>
        <ComfortIndicator
          label={weather.comfort.label}
          icon={weather.comfort.icon}
          size={44}
        />
      </div>
      {wide && (
        <TileStats
          items={weather.comfort.factors.map((factor) => ({
            key: factor.label,
            label: td(factor.label),
            value: td(factor.value),
          }))}
        />
      )}
    </Card>
  )
}

function SunMoonTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td } = useTranslation()
  const [settings] = useSettings()
  const clock = (value: string) => formatClockTimeStr(value, settings.timeFormat)
  return (
    <Card
      className="metric-primary-card tile-flow sunmoon-tile"
      grad="linear-gradient(140deg,#3b2f10 0%,#141007 100%)"
      border="rgba(250,204,21,0.12)"
      span2={wide}
    >
      <CardLabel>{t("forecast.sunMoon")}</CardLabel>
      <div className="sunmoon-rows">
        <div className="sunmoon-row">
          <span className="sunmoon-icon">
            <Icon name="sun" />
          </span>
          <span className="sunmoon-label">{t("forecast.sunrise")}</span>
          <span className="sunmoon-value">{clock(weather.astronomy.sunrise)}</span>
        </div>
        <div className="sunmoon-row">
          <span className="sunmoon-icon">
            <Icon name="evening" />
          </span>
          <span className="sunmoon-label">{t("forecast.sunset")}</span>
          <span className="sunmoon-value">{clock(weather.astronomy.sunset)}</span>
        </div>
        <div className="sunmoon-row">
          <span className="sunmoon-icon">
            <Icon name="spark" />
          </span>
          <span className="sunmoon-label">{t("forecast.goldenHour")}</span>
          <span className="sunmoon-value">
            {clock(weather.astronomy.goldenHour)}
          </span>
        </div>
        {wide && (
          <div className="sunmoon-row">
            <span className="sunmoon-icon">
              <Icon name="clear-night" />
            </span>
            <span className="sunmoon-label">{t("forecast.moonPhase")}</span>
            <span className="sunmoon-value">{td(weather.astronomy.moonPhase)}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

function WindTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td, n, nu } = useTranslation()
  const { current } = weather
  return (
    <Card
      className="metric-primary-card wind-tile"
      grad="linear-gradient(140deg,#134e4a 0%,#04211f 100%)"
      border="rgba(45,212,191,0.12)"
      span2={wide}
    >
      <Badge color="#2dd4bf" bg="rgba(45,212,191,0.14)">
        {td(current.windDirection)}
      </Badge>
      <CardLabel>{t("card.wind")}</CardLabel>
      <div className="metric-card-number metric-index">
        {n(current.windSpeed)}
        <span className="metric-card-unit">{t("unit.kmh")}</span>
      </div>
      <div className="metric-card-emphasis">
        {t("wind.gusting", { value: nu(current.windGust, "unit.kmh") })}
      </div>
      <div className="metric-card-note">
        {t("wind.pressure", { value: nu(current.pressure, "unit.hpa") })}
      </div>
    </Card>
  )
}

function VisibilityTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td, n } = useTranslation()
  const { current } = weather
  // The bar reads against 10 km, the point past which visibility stops being
  // the thing that decides a journey.
  const pct = Math.min(100, (current.visibility / 10) * 100)
  return (
    <Card
      className="metric-primary-card visibility-tile"
      grad="linear-gradient(140deg,#1f2937 0%,#0a0f17 100%)"
      border="rgba(148,163,184,0.14)"
      span2={wide}
    >
      <CardLabel>{t("card.visibility")}</CardLabel>
      <div className="metric-card-number metric-index">
        {n(current.visibility)}
        <span className="metric-card-unit">{t("unit.km")}</span>
      </div>
      <div className="visibility-meter">
        <Bar
          pct={pct}
          fill="linear-gradient(90deg,#f87171,#fbbf24 45%,#4ade80)"
          height={5}
        />
      </div>
      <div className="metric-card-note">{td(current.condition)}</div>
    </Card>
  )
}

function HeatTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td, n } = useTranslation()
  const [settings] = useSettings()
  const { current } = weather
  return (
    <Card
      className="metric-primary-card heat-tile"
      grad="linear-gradient(140deg,#7f1d1d 0%,#280808 100%)"
      border="rgba(248,113,113,0.12)"
      span2={wide}
    >
      <CardLabel>{t("health.heatHydration")}</CardLabel>
      <div className="metric-card-number metric-index">
        {n(convertTemperature(current.heatIndex, settings.temperatureUnit))}
        <span className="metric-card-unit">{t("unit.degree")}</span>
      </div>
      <div className="metric-card-emphasis">{t("health.heatIndex")}</div>
      <div className="tile-advice">
        <AdviceLine
          text={wide ? td(current.hydrationAdvice) : leadAdvice(td(current.hydrationAdvice))}
          tone="hydration"
        />
      </div>
    </Card>
  )
}

function EventTile({ weather, wide }: { weather: Weather; wide?: boolean }) {
  const { t, td, n } = useTranslation()
  const event = weather.event
  return (
    <Card
      className="metric-primary-card tile-flow event-tile"
      grad="linear-gradient(140deg,#4c1d95 0%,#190733 100%)"
      border="rgba(196,181,253,0.12)"
      span2={wide}
    >
      <Badge color="#c4b5fd" bg="rgba(167,139,250,0.14)">
        {t("event.startsIn", { days: event.daysAway })}
      </Badge>
      <CardLabel>{td(event.sectionLabel)}</CardLabel>
      <div className="event-tile-title">
        <span className="event-tile-icon">
          <IconByName name={event.icon} />
        </span>
        <span>
          <strong>{td(event.title)}</strong>
          <small data-i18n-ignore>{td(event.dateRange)}</small>
        </span>
      </div>
      {wide && (
        <TileStats
          items={[
            {
              key: "temp",
              label: t("event.expectedTemp"),
              value: t("event.avgTemp", { value: event.expectedTemperature }),
            },
            {
              key: "rain",
              label: t("event.precipitation"),
              value: t("event.rainChance", { chance: event.rainChance }),
            },
            {
              key: "season",
              label: t("event.expected"),
              value: td(event.expectedSeason),
            },
          ]}
        />
      )}
      <div className="tile-advice">
        <AdviceLine
          text={wide ? td(event.advice) : leadAdvice(td(event.advice))}
          tone={event.adviceTone}
        />
      </div>
    </Card>
  )
}

/** Draws one metric tile, or nothing when the payload has no data for it. */
function MetricTileView({
  id,
  wide,
  weather,
}: {
  id: MetricId
  wide?: boolean
  weather: Weather
}) {
  switch (id) {
    case "aqi":
      return <AqiTile weather={weather} wide={wide} />
    case "uv":
      return <UvTile weather={weather} wide={wide} />
    case "run":
      return <RunTile weather={weather} wide={wide} />
    case "rainfall":
      return <RainfallTile weather={weather} wide={wide} />
    case "commute":
      return weather.commute.items.length ? (
        <CommuteTile weather={weather} wide={wide} />
      ) : null
    case "soil":
      return <SoilTile weather={weather} wide={wide} />
    case "sea":
      return <SeaTile weather={weather} wide={wide} />
    case "pollen":
      return weather.pollen.items.length ? (
        <PollenTile weather={weather} wide={wide} />
      ) : null
    case "comfort":
      return <ComfortTile weather={weather} wide={wide} />
    case "sunMoon":
      return <SunMoonTile weather={weather} wide={wide} />
    case "wind":
      return <WindTile weather={weather} wide={wide} />
    case "visibility":
      return <VisibilityTile weather={weather} wide={wide} />
    case "heat":
      return <HeatTile weather={weather} wide={wide} />
    case "event":
      return <EventTile weather={weather} wide={wide} />
  }
}

export function MetricGrid({
  weather,
  metrics,
}: {
  weather: Weather
  metrics: readonly MetricTile[]
}) {
  return (
    <div
      className="metric-grid"
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
    >
      {metrics.map((tile) => (
        <MetricTileView
          key={tile.id}
          id={tile.id}
          wide={tile.wide}
          weather={weather}
        />
      ))}
    </div>
  )
}

// ── Page sections ─────────────────────────────────────────────────────────────

/** The packing list the backend already computes, for the travel preset. */
export function PackingSection({ weather }: { weather: Weather }) {
  const { t, td } = useTranslation()
  if (!weather.packing.items.length) return null
  return (
    <section className="persona-packing">
      <div className="audience-focus-heading">{t("alerts.packing")}</div>
      <div className="persona-packing-grid">
        {weather.packing.items.map((item) => (
          <div className="persona-packing-item" key={item.item}>
            <span className="persona-packing-icon">
              <IconByName name={item.icon} />
            </span>
            <div>
              <strong>{td(item.item)}</strong>
              <small>{td(item.reason)}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Nearby places, for the travel preset. */
export function NearbySection({ weather }: { weather: Weather }) {
  const { t, td, nu } = useTranslation()
  const [settings] = useSettings()
  if (!weather.locations.length) return null
  return (
    <section className="persona-nearby">
      <div className="audience-focus-heading">{t("section.otherPlaces")}</div>
      <div className="no-scrollbar horizontal-scroll persona-nearby-rail">
        {weather.locations.map((place) => (
          <div className="persona-nearby-card" key={place.name}>
            <div className="persona-nearby-icon">
              <Icon
                name={resolveWeatherIcon(place.conditionCode, place.icon)}
                label={td(place.condition)}
              />
            </div>
            <strong data-i18n-ignore>{place.name}</strong>
            <div className="persona-nearby-temp">
              {nu(
                convertTemperature(place.temperature, settings.temperatureUnit),
                "unit.degree",
              )}
            </div>
            <small>{td(place.condition)}</small>
            <small className="persona-nearby-distance" data-i18n-ignore>
              {place.distance}
            </small>
          </div>
        ))}
      </div>
    </section>
  )
}
