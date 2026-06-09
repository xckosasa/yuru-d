export function formatWeight(v) {
  return v == null ? '—' : Number(v).toFixed(1)
}

export function computeBMI(weight, heightCm) {
  if (!weight || !heightCm) return null
  const h = heightCm / 100
  const b = weight / (h * h)
  return Number(b.toFixed(1))
}

export function prevDiff(latestWeight, prevWeight) {
  if (prevWeight == null || latestWeight == null) return null
  const diff = (latestWeight - prevWeight)
  return Number(diff.toFixed(1))
}

export function goalDiff(latestWeight, goalWeight) {
  if (goalWeight == null || latestWeight == null) return null
  const d = Number((goalWeight - latestWeight).toFixed(1))
  return d
}
