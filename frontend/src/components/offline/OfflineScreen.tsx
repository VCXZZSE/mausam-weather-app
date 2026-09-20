import React, { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "@/i18n"
import "./OfflineScreen.css"

export interface OfflineScreenProps {
  onRetry: () => void
  onDemoMode?: () => void
  onChangeLocation?: () => void
  theme?: "light" | "dark"
}

type MascotState = "sleeping" | "startled" | "searching"

export const OfflineScreen: React.FC<OfflineScreenProps> = ({
  onRetry,
  onDemoMode,
  onChangeLocation,
  theme = "light",
}) => {
  const { t } = useTranslation()
  const [mascotState, setMascotState] = useState<MascotState>("sleeping")
  const [wakeCount, setWakeCount] = useState(0)
  const timerRef = useRef<number | null>(null)

  const handleWakeUp = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)

    // Android/Capacitor haptic pulse if available
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([25, 40, 35])
      }
    } catch {
      /* ignore */
    }

    // 1. Jolt & startled wake up
    setMascotState("startled")
    setWakeCount((c) => c + 1)

    // 2. Transition to searching radar pulse
    const searchTimer = window.setTimeout(() => {
      setMascotState("searching")
      onRetry()
    }, 450)

    // 3. Fallback: if still offline after search, curl back to sleep
    timerRef.current = window.setTimeout(() => {
      setMascotState("sleeping")
    }, 3200)

    return () => {
      window.clearTimeout(searchTimer)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [onRetry])

  // Reactive Auto-Reconnect on network restore
  useEffect(() => {
    const handleOnline = () => {
      handleWakeUp()
    }
    window.addEventListener("online", handleOnline)
    return () => {
      window.removeEventListener("online", handleOnline)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [handleWakeUp])

  const isAsleep = mascotState === "sleeping"
  const isStartled = mascotState === "startled"
  const isSearching = mascotState === "searching"

  return (
    <main
      className={`offline-screen theme-${theme}`}
      data-theme={theme}
      data-mascot-state={mascotState}
      role="alert"
      aria-live="polite"
    >
      <div className="offline-stars-bg" aria-hidden="true" />

      {/* Top Header Bar */}
      <div className="offline-topbar">
        <div className="offline-brand-badge">
          <span>Mausam</span>
        </div>
        <div className="offline-network-pill">
          <span className="offline-status-dot" />
          <span>Offline</span>
        </div>
      </div>

      {/* Interactive Mascot Stage */}
      <div
        className="offline-mascot-stage"
        onClick={handleWakeUp}
        role="button"
        tabIndex={0}
        aria-label="Sleeping weather cloud mascot. Tap to wake up and check connection."
        style={{ background: "transparent", backgroundColor: "transparent", backgroundImage: "none", boxShadow: "none" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleWakeUp()
          }
        }}
      >
        {/* Sleeping "Z z z" Particles */}
        {isAsleep && (
          <div className="zzz-container" aria-hidden="true" style={{ background: "transparent" }}>
            <span className="zzz-char zzz-1">z</span>
            <span className="zzz-char zzz-2">Z</span>
            <span className="zzz-char zzz-3">Z</span>
          </div>
        )}

        {/* Mascot SVG Vector Illustration */}
        <div
          className={`mascot-svg-wrap mascot-${mascotState}`}
          key={wakeCount}
          style={{ background: "transparent", backgroundColor: "transparent", backgroundImage: "none" }}
        >
          {/* Concentric Radar Scan Rings (Triggered when searching) */}
          <div className="mascot-radar-pulse" aria-hidden="true">
            <div className="radar-ring radar-ring-1" />
            <div className="radar-ring radar-ring-2" />
            <div className="radar-ring radar-ring-3" />
          </div>

          <svg
            viewBox="0 0 260 210"
            width="250"
            height="210"
            xmlns="http://www.w3.org/2000/svg"
            className="mascot-svg"
            aria-hidden="true"
            style={{ background: "transparent", backgroundColor: "transparent", overflow: "visible" }}
          >
            <defs>
              {/* Cloud Shading Gradient */}
              <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="65%" stopColor={theme === "light" ? "#f8fafc" : "#e2e8f0"} />
                <stop offset="100%" stopColor={theme === "light" ? "#cbd5e1" : "#94a3b8"} />
              </linearGradient>

              {/* Cloud Under-Shadow */}
              <radialGradient
                id="cloudShadow"
                cx="50%"
                cy="50%"
                r="50%"
                fx="50%"
                fy="50%"
              >
                <stop
                  offset="0%"
                  stopColor={theme === "light" ? "rgba(15, 23, 42, 0.25)" : "rgba(0, 0, 0, 0.6)"}
                />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>

              {/* Nightcap Gradient - Bold Deep Bedtime Navy */}
              <linearGradient id="capGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={theme === "light" ? "#2563eb" : "#3b82f6"} />
                <stop offset="100%" stopColor={theme === "light" ? "#1e3a8a" : "#1e1b4b"} />
              </linearGradient>

              {/* Nightcap Stripes - Vibrant Golden Amber */}
              <linearGradient id="capGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>

              {/* Base Hill/Cushion Gradient */}
              <linearGradient
                id="cushionGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor={theme === "light" ? "rgba(148, 163, 184, 0.45)" : "rgba(51, 65, 85, 0.7)"}
                />
                <stop
                  offset="100%"
                  stopColor={theme === "light" ? "rgba(203, 213, 225, 0.15)" : "rgba(15, 23, 42, 0.15)"}
                />
              </linearGradient>
            </defs>

            {/* Resting Shadow Cushion */}
            <ellipse
              cx="132"
              cy="166"
              rx="76"
              ry="10"
              fill={theme === "light" ? "rgba(37, 99, 235, 0.15)" : "rgba(0, 0, 0, 0.45)"}
            />

            {/* Animated Cloud Group */}
            <g className="cloud-base-group">
              {/* Fluffy Chibi Cloud Body (Seamless, No internal cut lines) */}
              <g id="cloud-body" filter="drop-shadow(0 12px 24px rgba(15, 23, 42, 0.14))">
                <path
                  d="M 64 138
                     C 38 138, 28 112, 44 92
                     C 34 72, 50 48, 76 48
                     C 86 30, 116 22, 138 36
                     C 156 22, 192 28, 202 48
                     C 226 48, 242 70, 236 94
                     C 248 116, 236 138, 210 138
                     C 198 150, 78 150, 64 138 Z"
                  fill="url(#cloudGrad)"
                  stroke={theme === "light" ? "#3b82f6" : "#60a5fa"}
                  strokeWidth="3.2"
                  strokeLinejoin="round"
                />
              </g>

              {/* Striped Cozy Nightcap */}
              <g
                id="nightcap"
                style={{
                  transformOrigin: "85px 55px",
                  transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  transform: isAsleep
                    ? "rotate(0deg)"
                    : "rotate(-18deg) translateY(-10px) scale(1.08)",
                }}
              >
                {/* Cap drooping cone */}
                <path
                  d="M 72 54 C 80 32, 110 24, 116 38 C 104 56, 52 50, 36 84 C 30 96, 44 98, 48 88 C 56 68, 76 60, 94 54 Z"
                  fill="url(#capGrad1)"
                  stroke="#0f172a"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                {/* Golden Amber Stripes */}
                <path
                  d="M 78 48 C 88 38, 102 34, 110 40 C 102 48, 86 50, 78 48 Z"
                  fill="url(#capGrad2)"
                />
                <path
                  d="M 44 74 C 52 64, 66 60, 72 62 C 64 70, 48 76, 44 74 Z"
                  fill="url(#capGrad2)"
                />

                {/* Fluffy White Cap Cuff Band */}
                <rect
                  x="68"
                  y="48"
                  width="38"
                  height="11"
                  rx="5.5"
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="2"
                />

                {/* Fluffy Pom-pom Ball */}
                <circle
                  cx="32"
                  cy="92"
                  r="9.5"
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="2.2"
                />
              </g>

              {/* Rosy Sweet Blush Cheeks */}
              <ellipse
                cx="88"
                cy="114"
                rx="9.5"
                ry="5.5"
                fill="#ff4d6d"
                opacity="0.85"
              />
              <ellipse
                cx="176"
                cy="114"
                rx="9.5"
                ry="5.5"
                fill="#ff4d6d"
                opacity="0.85"
              />

              {/* ── FACIAL EXPRESSIONS ──────────────────────────────── */}
              {isAsleep ? (
                /* Blissful Happy Sleeping Face (⌒ ‿ ⌒) with cute lashes */
                <g id="face-sleeping">
                  {/* Left Eye: Happy Sleeping Curve ⌒ */}
                  <path
                    d="M 98 104 Q 108 94 118 104"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                  />
                  {/* Left cute lash flick */}
                  <path
                    d="M 98 104 L 94 100"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />

                  {/* Right Eye: Happy Sleeping Curve ⌒ */}
                  <path
                    d="M 146 104 Q 156 94 166 104"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                  />
                  {/* Right cute lash flick */}
                  <path
                    d="M 166 104 L 170 100"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />

                  {/* Sweet Little Curved Smile ‿ */}
                  <path
                    d="M 127 114 Q 132 120 137 114"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </g>
              ) : (
                /* Startled / Searching Face: Giant Wide Eyes & Darting Pupils */
                <g id="face-startled">
                  {/* Left Eyeball White */}
                  <circle
                    cx="106"
                    cy="100"
                    r="15"
                    fill="#ffffff"
                    stroke="#0f172a"
                    strokeWidth="2.8"
                  />
                  {/* Right Eyeball White */}
                  <circle
                    cx="158"
                    cy="100"
                    r="15"
                    fill="#ffffff"
                    stroke="#0f172a"
                    strokeWidth="2.8"
                  />

                  {/* Darting Pupils Group (Looks around scarily) */}
                  <g className="pupil-darting">
                    {/* Left Pupil with dual sparkle glints */}
                    <circle cx="106" cy="100" r="6.5" fill="#0f172a" />
                    <circle cx="104" cy="97" r="2.2" fill="#ffffff" />
                    <circle cx="108" cy="102" r="1.1" fill="#ffffff" />

                    {/* Right Pupil with dual sparkle glints */}
                    <circle cx="158" cy="100" r="6.5" fill="#0f172a" />
                    <circle cx="156" cy="97" r="2.2" fill="#ffffff" />
                    <circle cx="160" cy="102" r="1.1" fill="#ffffff" />
                  </g>

                  {/* Startled Mouth (Surprised small o) */}
                  {isStartled ? (
                    <ellipse
                      cx="132"
                      cy="120"
                      rx="5.5"
                      ry="7.5"
                      fill="#0f172a"
                    />
                  ) : (
                    /* Searching mouth (Determined small line) */
                    <path
                      d="M 126 120 Q 132 117 138 120"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Startled Sweat Drop flying off */}
                  <path
                    className="sweat-drop"
                    d="M 190 78 C 190 78 198 88 194 92 C 190 96 185 92 185 88 C 185 85 190 78 190 78 Z"
                    fill="#38bdf8"
                    stroke="#0284c7"
                    strokeWidth="1"
                  />
                </g>
              )}
            </g>
          </svg>
        </div>
      </div>

      {/* Copy & Status Block */}
      <div
        className="offline-copy-block"
        style={{ background: "transparent", backgroundColor: "transparent", backgroundImage: "none", boxShadow: "none" }}
      >
        <h2 className="offline-title">
          {t(
            isAsleep
              ? "offline.sleepingTitle"
              : isSearching
              ? "offline.wakingTitle"
              : "offline.sleepingTitle"
          )}
        </h2>
        <p className="offline-subtitle">
          {t("offline.sleepingCopy")}
        </p>
      </div>

      {/* Action Buttons */}
      <div
        className="offline-actions"
        style={{ background: "transparent", backgroundColor: "transparent", backgroundImage: "none", boxShadow: "none" }}
      >
        {/* Primary Action Button: Wake Up & Reconnect */}
        <button
          type="button"
          className="offline-primary-btn"
          onClick={handleWakeUp}
        >
          <span>{t("offline.wakeBtn")}</span>
          <span aria-hidden="true">⚡</span>
        </button>

        {/* Secondary: Explore Offline Demo Mode */}
        {onDemoMode && (
          <button
            type="button"
            className="offline-secondary-btn"
            onClick={onDemoMode}
          >
            {t("offline.demoBtn")}
          </button>
        )}

        {/* Tertiary: Change Location */}
        {onChangeLocation && (
          <button
            type="button"
            className="offline-change-loc-btn"
            onClick={onChangeLocation}
          >
            {t("gate.changeLocation")}
          </button>
        )}
      </div>
    </main>
  )
}
