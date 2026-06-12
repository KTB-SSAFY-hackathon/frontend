type EditorSliderProps = {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

export function EditorSlider({ label, value, min, max, onChange }: EditorSliderProps) {
  return (
    <label className="editor-slider">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{value}</output>
    </label>
  )
}
