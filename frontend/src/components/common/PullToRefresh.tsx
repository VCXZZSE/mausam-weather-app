import React, { useState, useRef, useEffect, useCallback } from "react"
import "./PullToRefresh.css"
import { useTranslation } from "@/i18n"

export interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  scrollRef: React.RefObject<HTMLDivElement | null>
  disabled?: boolean
  theme?: "light" | "dark"
}

type PullState = "idle" | "pulling" | "ready" | "refreshing" | "success"

const PULL_THRESHOLD = 60
const MAX_PULL = 88

export function PullToRefresh({
  onRefresh,
  children,
  scrollRef,
  disabled = false,
  theme,
}: PullToRefreshProps) {
  const { t } = useTranslation()
  const [pullDistance, setPullDistance] = useState(0)
  const [pullState, setPullState] = useState<PullState>("idle")

  const startYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const pullDistanceRef = useRef(0)
  const pullStateRef = useRef<PullState>("idle")

  pullDistanceRef.current = pullDistance
  pullStateRef.current = pullState

  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(14)
      } catch {
        /* ignore */
      }
    }
  }, [])

  const handleStart = (clientY: number) => {
    if (disabled || pullStateRef.current === "refreshing") return
    const scrollEl = scrollRef.current
    if (scrollEl && scrollEl.scrollTop > 2) return

    startYRef.current = clientY
    isDraggingRef.current = true
  }

  const handleMove = (clientY: number) => {
    if (!isDraggingRef.current || disabled || pullStateRef.current === "refreshing") return
    const scrollEl = scrollRef.current
    if (scrollEl && scrollEl.scrollTop > 2) {
      isDraggingRef.current = false
      setPullDistance(0)
      setPullState("idle")
      return
    }

    const deltaY = clientY - startYRef.current
    if (deltaY <= 0) {
      if (pullDistanceRef.current > 0) {
        setPullDistance(0)
        setPullState("idle")
      }
      return
    }

    // Resistance formula
    const distance = Math.min(MAX_PULL, Math.pow(deltaY, 0.82))
    setPullDistance(distance)

    if (distance >= PULL_THRESHOLD) {
      if (pullStateRef.current !== "ready") {
        triggerHaptic()
        setPullState("ready")
      }
    } else {
      if (pullStateRef.current !== "pulling") {
        setPullState("pulling")
      }
    }
  }

  const handleEnd = async () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false

    if (pullDistanceRef.current >= PULL_THRESHOLD && pullStateRef.current === "ready") {
      setPullState("refreshing")
      setPullDistance(52)
      triggerHaptic()

      try {
        await onRefresh()
        setPullState("success")
        triggerHaptic()
        setTimeout(() => {
          setPullDistance(0)
          setTimeout(() => setPullState("idle"), 300)
        }, 600)
      } catch {
        setPullDistance(0)
        setTimeout(() => setPullState("idle"), 300)
      }
    } else {
      setPullDistance(0)
      setPullState("idle")
    }
  }

  // Touch event handlers
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleStart(e.touches[0].clientY)
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      handleMove(e.touches[0].clientY)
    }
  }

  const onTouchEnd = () => {
    handleEnd()
  }

  // Mouse event handlers for desktop testing
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      handleStart(e.clientY)
    }
  }

  useEffect(() => {
    const onWindowMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        handleMove(e.clientY)
      }
    }

    const onWindowMouseUp = () => {
      if (isDraggingRef.current) {
        handleEnd()
      }
    }

    window.addEventListener("mousemove", onWindowMouseMove)
    window.addEventListener("mouseup", onWindowMouseUp)
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove)
      window.removeEventListener("mouseup", onWindowMouseUp)
    }
  }, [disabled, onRefresh])

  const showIndicator = pullDistance > 8 || pullState === "refreshing" || pullState === "success"
  const rotation = Math.min(180, (pullDistance / PULL_THRESHOLD) * 180)

  let statusText = t("ptr.pull") || "Pull down to refresh all"
  if (pullState === "ready") {
    statusText = t("ptr.release") || "Release to refresh"
  } else if (pullState === "refreshing") {
    statusText = t("ptr.refreshing") || "Refreshing weather, alerts & GPS…"
  } else if (pullState === "success") {
    statusText = t("ptr.success") || "All feeds updated"
  }

  return (
    <div
      className="pull-to-refresh-container"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onMouseDown={onMouseDown}
    >
      {showIndicator && (
        <div
          className="pull-to-refresh-indicator"
          style={{
            transform: `translateY(${Math.max(0, pullDistance - 44)}px)`,
            opacity: Math.min(1, pullDistance / 28),
          }}
          aria-live="polite"
        >
          <div className={`pull-to-refresh-pill is-${pullState}${theme ? ` theme-${theme}` : ""}`}>
            <div
              className="pull-to-refresh-icon-box"
              style={{ background: "transparent", border: "none", boxShadow: "none", outline: "none" }}
            >
              {pullState === "refreshing" ? (
                <div className="pull-to-refresh-spinner" />
              ) : pullState === "success" ? (
                <svg
                  className="pull-to-refresh-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ background: "transparent", border: "none", boxShadow: "none" }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  className="pull-to-refresh-arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    background: "transparent",
                    border: "none",
                    boxShadow: "none",
                    outline: "none",
                    transform: `rotate(${rotation}deg)`,
                  }}
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
              )}
            </div>
            <span className="pull-to-refresh-text" data-i18n-ignore>
              {statusText}
            </span>
          </div>
        </div>
      )}

      <div
        className="pull-to-refresh-content"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : "none",
          transition: isDraggingRef.current ? "none" : "transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {children}
      </div>
    </div>
  )
}
