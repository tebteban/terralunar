import type { CSSProperties } from 'react'

// Deterministic decorative sky; positions and sizes are artistic, not ephemerides.
const stars = Array.from({ length: 180 }, (_, i) => ({
  x: ((i * 73.137 + 19) % 100), y: ((i * 37.719 + 7) % 100),
  size: i % 9 === 0 ? 2 : 1, delay: -(i % 17),
}))

export default function SpaceBackdrop() {
  return <div className="space-backdrop" aria-hidden="true">
    <div className="milky-way" />
    <div className="space-stars">{stars.map((star, i) => <i key={i} style={{
      left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size,
      animationDelay: `${star.delay}s`, opacity: .25 + (i % 6) / 10,
    } as CSSProperties} />)}</div>
    <div className="space-body space-moon" />
    <div className="space-body space-mars" />
    <div className="space-body space-jupiter" />
    <div className="space-saturn"><div className="saturn-ring" /><div className="saturn-sphere" /></div>
  </div>
}
