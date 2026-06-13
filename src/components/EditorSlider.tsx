import type { CSSProperties } from 'react'

type EditorSliderProps = {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

export function EditorSlider({ label, value, min, max, onChange }: EditorSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <label className="editor-slider">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        style={{ '--slider-progress': `${percentage}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{value}</output>
    </label>
  )
}
