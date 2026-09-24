'use client'

/** Compact form controls shared by editor property panels. */

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="panel-section-title mb-2.5">{children}</div>
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="shrink-0 text-xs text-afra-muted">{label}</span>
      {children}
    </label>
  )
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
  onCommit?: () => void
}) {
  return (
    <Row label={label}>
      <span className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={onCommit}
          onKeyUp={onCommit}
          className="w-28"
        />
        <span className="w-11 text-right text-xs tabular-nums text-afra-white/80">{format ? format(value) : Math.round(value * 100) / 100}</span>
      </span>
    </Row>
  )
}

export function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Row label={label}>
      <span className="flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase text-afra-white/60">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-6 w-9 rounded-md"
          aria-label={label}
        />
      </span>
    </Row>
  )
}

export function TextInputRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <Row label={label}>
      <input className="input !w-44 !px-2 !py-1 text-xs" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Row>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className={`flex gap-0.5 rounded-md bg-afra-bg p-0.5 ${size === 'sm' ? 'text-[11px]' : 'text-xs'}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-[5px] px-2 py-1 font-medium transition-colors duration-150 ${
            value === o.value ? 'bg-afra-orange text-black' : 'text-afra-muted hover:text-afra-white hover:bg-afra-hover'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <Row label={label}>
      <select
        className="input !w-44 cursor-pointer !px-2 !py-1 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-afra-panel">
            {o.label}
          </option>
        ))}
      </select>
    </Row>
  )
}
