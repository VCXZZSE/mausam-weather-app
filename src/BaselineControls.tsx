import { useId, type CSSProperties } from "react"
import type { ProfileGender } from "./App"
import "./BaselineControls.css"

function BaselineIcon({ kind }: { kind: string }) {
  const paths: Record<string, string> = {
    Age: "M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 9h2m4 0h2m-8 3h2",
    Height: "M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4M4 3h2m12 0h2M4 21h2m12 0h2",
    Weight: "M7 7h10l4 13H3L7 7Zm2 0V5a3 3 0 0 1 6 0v2",
    Female: "M16 8a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM11 13v8m-4-4h8",
    Male: "M13 15a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm-1-4 8-8m-6 0h6v6",
    "Non-binary": "M16 16a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 12V2M8 4l8 4m0-4-8 4",
    "Prefer not to say": "M6 10h12v11H6V10Zm3 0V6a3 3 0 0 1 6 0v4m-3 4v3",
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>
}

export function BaselineSlider({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void
}) {
  const id = useId()
  const progress = (value - min) / (max - min) * 100
  const adjust = (delta: number) => onChange(Math.max(min, Math.min(max, value + delta)))
  return <div className={`baseline-slider baseline-${label.toLowerCase()}`}>
    <div className="baseline-slider-top">
      <label htmlFor={id} className="baseline-slider-label"><span className="baseline-control-icon"><BaselineIcon kind={label} /></span><span>{label}<small>{label === "Age" ? "A little about you" : label === "Height" ? "Your vertical story" : "Part of your baseline"}</small></span></label>
      <div className="baseline-reading"><output htmlFor={id}>{value}</output><span>{unit}</span></div>
    </div>
    <div className="baseline-slider-controls">
      <button type="button" className="baseline-nudge" aria-label={`Decrease ${label.toLowerCase()}`} disabled={value <= min} onClick={() => adjust(-1)}>−</button>
      <div className="baseline-rail" style={{ "--baseline-progress": `${progress}%` } as CSSProperties}>
        <div className="baseline-track" aria-hidden="true" />
        <input id={id} type="range" min={min} max={max} step={1} value={value} aria-label={label} aria-valuetext={`${value} ${unit}`} onChange={event => onChange(event.currentTarget.valueAsNumber)} />
      </div>
      <button type="button" className="baseline-nudge" aria-label={`Increase ${label.toLowerCase()}`} disabled={value >= max} onClick={() => adjust(1)}>+</button>
    </div>
    <div className="baseline-scale" aria-hidden="true"><span>{min} {unit}</span><span className="baseline-scale-ticks">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span><span>{max} {unit}</span></div>
  </div>
}

export function GenderSelector({ value, onChange }: { value: ProfileGender; onChange: (value: ProfileGender) => void }) {
  const name = useId()
  return <fieldset className="baseline-gender">
    <legend>Gender <span>YOUR CALL</span></legend>
    <p>A detail that makes your profile yours.</p>
    <div className="baseline-gender-grid">{(["Female", "Male", "Non-binary", "Prefer not to say"] as const).map(gender => <label className="baseline-gender-option" key={gender}>
      <input type="radio" name={name} value={gender} checked={value === gender} onChange={() => onChange(gender)} />
      <span className="baseline-gender-card"><span className="baseline-gender-icon"><BaselineIcon kind={gender} /></span><span className="baseline-gender-name">{gender}</span><span className="baseline-gender-check" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none"><path d="m3 6 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span></span>
    </label>)}</div>
  </fieldset>
}
