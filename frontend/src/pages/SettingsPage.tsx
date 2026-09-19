import { useTranslation } from "@/i18n"
import { Icon } from "@/components/icons/Icon"
import { BackChevron } from "@/components/common/MarkdownView"
import {
  useSettings,
  type TemperatureUnit,
  type RainUnit,
  type TimeFormat,
} from "@/services/settingsStore"
import "./SettingsPage.css"

type Props = {
  onBack: () => void
}

export function SettingsPage({ onBack }: Props) {
  const { t } = useTranslation()
  const [settings, updateSettings] = useSettings()

  return (
    <main
      className="personalized-page settings-page"
      aria-labelledby="settings-title"
    >
      <header className="personalized-topbar">
        <button
          className="personalized-back"
          type="button"
          onClick={onBack}
          aria-label="Back"
        >
          <BackChevron />
        </button>
        <div>
          <strong>{t("settings.title")}</strong>
          <span>
            <Icon name="settings" />
            {t("settings.units")}
          </span>
        </div>
      </header>

      <div className="settings-content">
        <section className="personalized-intro settings-intro">
          <span className="personalized-eyebrow">MAUSAM · PREFERENCES</span>
          <h1 id="settings-title">
            Settings &amp;
            <br />
            <span>Preferences.</span>
          </h1>
          <p className="settings-description">
            {t("settings.subtitle")}
          </p>
        </section>

        {/* Setting Groups */}
        <div className="settings-groups">
          {/* Temperature Setting */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon-wrap settings-temp-icon">
                <Icon name="temperature" />
              </div>
              <div className="settings-card-text">
                <h3>{t("settings.temperature")}</h3>
                <p>{t("settings.temperatureDesc")}</p>
              </div>
            </div>
            <div
              className="settings-segmented-control"
              role="radiogroup"
              aria-label={t("settings.temperature")}
            >
              <button
                type="button"
                role="radio"
                aria-checked={settings.temperatureUnit === "C"}
                className={`segmented-btn ${settings.temperatureUnit === "C" ? "is-active" : ""}`}
                onClick={() => updateSettings({ temperatureUnit: "C" as TemperatureUnit })}
              >
                <span className="segmented-pill-title">Celsius (°C)</span>
                <span className="segmented-pill-sub">Standard</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={settings.temperatureUnit === "F"}
                className={`segmented-btn ${settings.temperatureUnit === "F" ? "is-active" : ""}`}
                onClick={() => updateSettings({ temperatureUnit: "F" as TemperatureUnit })}
              >
                <span className="segmented-pill-title">Fahrenheit (°F)</span>
                <span className="segmented-pill-sub">Imperial</span>
              </button>
            </div>
          </div>

          {/* Rainfall Unit Setting */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon-wrap settings-rain-icon">
                <Icon name="rain" />
              </div>
              <div className="settings-card-text">
                <h3>{t("settings.rain")}</h3>
                <p>{t("settings.rainDesc")}</p>
              </div>
            </div>
            <div
              className="settings-segmented-control"
              role="radiogroup"
              aria-label={t("settings.rain")}
            >
              <button
                type="button"
                role="radio"
                aria-checked={settings.rainUnit === "mm"}
                className={`segmented-btn ${settings.rainUnit === "mm" ? "is-active" : ""}`}
                onClick={() => updateSettings({ rainUnit: "mm" as RainUnit })}
              >
                <span className="segmented-pill-title">Millimetres (mm)</span>
                <span className="segmented-pill-sub">Metric</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={settings.rainUnit === "in"}
                className={`segmented-btn ${settings.rainUnit === "in" ? "is-active" : ""}`}
                onClick={() => updateSettings({ rainUnit: "in" as RainUnit })}
              >
                <span className="segmented-pill-title">Inches (in)</span>
                <span className="segmented-pill-sub">Imperial</span>
              </button>
            </div>
          </div>

          {/* Time Format Setting */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon-wrap settings-time-icon">
                <Icon name="evening" />
              </div>
              <div className="settings-card-text">
                <h3>{t("settings.timeFormat")}</h3>
                <p>{t("settings.timeFormatDesc")}</p>
              </div>
            </div>
            <div
              className="settings-segmented-control"
              role="radiogroup"
              aria-label={t("settings.timeFormat")}
            >
              <button
                type="button"
                role="radio"
                aria-checked={settings.timeFormat === "12h"}
                className={`segmented-btn ${settings.timeFormat === "12h" ? "is-active" : ""}`}
                onClick={() => updateSettings({ timeFormat: "12h" as TimeFormat })}
              >
                <span className="segmented-pill-title">12 Hours</span>
                <span className="segmented-pill-sub">02:30 PM</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={settings.timeFormat === "24h"}
                className={`segmented-btn ${settings.timeFormat === "24h" ? "is-active" : ""}`}
                onClick={() => updateSettings({ timeFormat: "24h" as TimeFormat })}
              >
                <span className="segmented-pill-title">24 Hours</span>
                <span className="segmented-pill-sub">14:30</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
