'use client'

interface RadarChartProps {
  jdValues: number[]
  atpValues: number[] | null
  labels: string[]
}

export default function RadarChart({ jdValues, atpValues, labels }: RadarChartProps) {
  const size = 220
  const cx = size / 2, cy = size / 2
  const r = 82
  const n = labels.length
  const levels = 4

  const angleOf = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2

  const point = (val: number, i: number) => {
    const angle = angleOf(i)
    const d = (val / 100) * r
    return { x: cx + d * Math.cos(angle), y: cy + d * Math.sin(angle) }
  }

  const labelPoint = (i: number) => {
    const angle = angleOf(i)
    const d = r + 18
    return { x: cx + d * Math.cos(angle), y: cy + d * Math.sin(angle) }
  }

  const polyPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + 'Z'

  const gridPts = (frac: number) =>
    Array.from({ length: n }, (_, i) => {
      const angle = angleOf(i)
      return { x: cx + r * frac * Math.cos(angle), y: cy + r * frac * Math.sin(angle) }
    })

  const jdPts = jdValues.map((v, i) => point(Math.min(v, 100), i))
  const atpPts = atpValues ? atpValues.map((v, i) => point(Math.min(v, 100), i)) : null

  const W = size + 60 // extra for labels

  return (
    <svg viewBox={`-30 -20 ${W} ${size + 40}`} style={{ width: '100%', maxWidth: 320 }}>
      {/* Grid rings */}
      {Array.from({ length: levels }, (_, li) => {
        const frac = (li + 1) / levels
        const gp = gridPts(frac)
        return (
          <polygon key={li} points={gp.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="#1e1e1e" strokeWidth="1" />
        )
      })}
      {/* Spokes */}
      {Array.from({ length: n }, (_, i) => {
        const angle = angleOf(i)
        return (
          <line key={i} x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)}
            stroke="#1a1a1a" strokeWidth="1" />
        )
      })}
      {/* ATP polygon */}
      {atpPts && (
        <path d={polyPath(atpPts)} fill="rgba(251,191,36,0.08)" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 3" />
      )}
      {/* JD polygon */}
      <path d={polyPath(jdPts)} fill="rgba(74,222,128,0.12)" stroke="#4ade80" strokeWidth="2" />
      {/* JD dots */}
      {jdPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#4ade80" />
      ))}
      {/* ATP dots */}
      {atpPts && atpPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fbbf24" />
      ))}
      {/* Labels */}
      {labels.map((label, i) => {
        const lp = labelPoint(i)
        const anchor = lp.x < cx - 5 ? 'end' : lp.x > cx + 5 ? 'start' : 'middle'
        return (
          <text key={i} x={lp.x} y={lp.y + 4} textAnchor={anchor}
            fontSize="9" fill="#555" fontFamily="monospace" letterSpacing="0.5">
            {label}
          </text>
        )
      })}
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="2" fill="#252525" />
    </svg>
  )
}
