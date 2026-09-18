import React, { useState, useRef, useCallback } from "react"
import "./SlideToDiveIn.css"
import { useTranslation } from "@/i18n"

export interface SlideToDiveInProps {
  onComplete: () => void
  disabled?: boolean
}

type SlideState = "idle" | "dragging" | "ready" | "unlocked"

export function SlideToDiveIn({
  onComplete,
  disabled = false,
}: SlideToDiveInProps) {
  const { t } = useTranslation()
  const [progress, setProgress] = useState(0)
  const [slideState, setSlideState] = useState<SlideState>("idle")

  const trackRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startProgressRef = useRef(0)
  const progressRef = useRef(0)
  const completedRef = useRef(false)

  progressRef.current = progress

  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern)
      } catch {
        /* ignore */
      }
    }
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || completedRef.current) return
    isDraggingRef.current = true
    startXRef.current = e.clientX
    startProgressRef.current = progressRef.current
    setSlideState("dragging")
    triggerHaptic(10)

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || disabled || completedRef.current) return

    const track = trackRef.current
    if (!track) return

    const trackRect = track.getBoundingClientRect()
    const handleSize = 52
    const padding = 6
    const maxTravel = trackRect.width - handleSize - padding * 2

    if (maxTravel <= 0) return

    const deltaX = e.clientX - startXRef.current
    const deltaProgress = (deltaX / maxTravel) * 100
    const newProgress = Math.max(
      0,
      Math.min(100, startProgressRef.current + deltaProgress),
    )

    setProgress(newProgress)

    if (newProgress >= 95) {
      if (slideState !== "ready") {
        setSlideState("ready")
        triggerHaptic(14)
      }
    } else {
      if (slideState !== "dragging") {
        setSlideState("dragging")
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      /* ignore */
    }

    if (progressRef.current >= 95 && !completedRef.current) {
      // Must be pulled fully across to unlock
      completedRef.current = true
      setProgress(100)
      setSlideState("unlocked")
      triggerHaptic([18, 32, 48])

      setTimeout(() => {
        onComplete()
      }, 260)
    } else {
      // Elastic spring reset when released before pulling fully
      setSlideState("idle")
      setProgress(0)
    }
  }

  // Keyboard accessibility & automated testing compatibility
  const handleRangeEvent = (
    e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>,
  ) => {
    const val = Number((e.target as HTMLInputElement).value)
    setProgress(val)
    if (val >= 95 && !completedRef.current) {
      completedRef.current = true
      setProgress(100)
      setSlideState("unlocked")
      triggerHaptic([18, 32, 48])
      onComplete()
    }
  }

  const isCompleted = slideState === "unlocked"
  const isReady = slideState === "ready" || isCompleted

  return (
    <div
      ref={trackRef}
      className={`horizon-slide-track ${slideState} ${
        isCompleted ? "is-unlocked" : ""
      }`}
      style={
        {
          "--slide-progress": `${progress}%`,
          "--slide-progress-ratio": progress / 100,
        } as React.CSSProperties
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Native Range Input for full A11y and headless test runners */}
      <input
        type="range"
        className="horizon-slide-native-input"
        aria-label={t("ready.sliderAria")}
        min="0"
        max="100"
        value={Math.round(progress)}
        onChange={handleRangeEvent}
        onInput={handleRangeEvent}
        disabled={disabled || isCompleted}
      />

      {/* Luminous Aurora Wake / Trail */}
      <div className="horizon-slide-wake" aria-hidden="true" />

      {/* Destination Portal Target Gate */}
      <div
        className={`horizon-slide-gate ${isReady ? "is-active" : ""}`}
        aria-hidden="true"
      >
        <div className="gate-beacon-ring" />
        <div className="gate-beacon-core" />
      </div>

      {/* Shimmering Ambient Guide Label */}
      <div
        className="horizon-slide-label"
        style={{
          opacity: Math.max(0, 1 - progress / 60),
          transform: `translateX(${progress * 0.12}px)`,
        }}
        aria-hidden="true"
      >
        <span className="horizon-shimmer-text">{t("ready.slide")}</span>
        <svg
          className="horizon-guide-arrow"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </div>

      {/* Unlocked Radiant Message */}
      <div className="horizon-slide-unlocked-flare" aria-hidden="true">
        <span className="unlocked-text">{t("gate.loadingTitle")}</span>
      </div>

      {/* Celestial Floating Orb (Handle) */}
      <div className={`horizon-slide-orb ${slideState}`} aria-hidden="true">
        <div className="orb-halo" />
        <div className="orb-disc">
          {isCompleted ? (
            <svg
              className="orb-icon-check"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              className="orb-icon-arrow"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}
