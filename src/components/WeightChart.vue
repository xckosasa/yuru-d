
<template>
  <div class="weight-chart">
    <svg viewBox="0 0 600 200" preserveAspectRatio="none" class="chart-svg" role="img" aria-label="体重推移グラフ">
      <!-- horizontal grid -->
      <g class="grid" stroke="#e6e6e6" stroke-width="1">
        <line v-for="(y, i) in gridYs" :key="i" :x1="P" :x2="W-P" :y1="y" :y2="y" />
      </g>

      <!-- goal line -->
      <line v-if="hasGoal" :x1="P" :x2="W-P" :y1="goalY" :y2="goalY" stroke="var(--goal, #ff6b6b)" stroke-width="1.5" stroke-dasharray="6 4" />
      <text v-if="hasGoal" :x="W-P-6" :y="goalY - 8" font-size="11" text-anchor="end" fill="var(--goal, #ff6b6b)">目標 {{ goal }}kg</text>

      <!-- area under curve -->
      <polygon v-if="areaPoints" :points="areaPoints" fill="var(--primary, #70EBB8)" fill-opacity="0.12" />

      <!-- polyline -->
      <polyline :points="polylinePoints" fill="none" stroke="var(--primary, #70EBB8)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />

      <!-- points -->
      <g v-for="(p, i) in points" :key="i">
        <circle :cx="p.x" :cy="p.y" r="4" :fill="(i === points.length - 1) ? 'var(--accent, #2b9)':'#fff'" stroke="var(--primary, #70EBB8)" stroke-width="2" />
      </g>

      <!-- y labels -->
      <g class="ylabels" fill="#666" font-size="11">
        <text v-for="(t, i) in ticks" :key="'y'+i" :x="12" :y="t.y+4">{{ t.v }}kg</text>
      </g>

      <!-- x labels -->
      <g class="xlabels" fill="#666" font-size="10">
        <text v-for="(p, i) in labelPoints" :key="'l'+i" :x="p.x" y="195" text-anchor="middle">{{ p.label }}</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ records: { type: Array, required: true }, goal: { type: Number, default: null } })

const scale = computed(() => {
  const recs = (props.records || []).slice().reverse()
  const W = 600
  const H = 200
  const P = 36
  const innerW = W - P * 2
  const innerH = H - P * 2

  const weights = recs.map(r => r.weight)
  if (props.goal !== null && props.goal !== undefined) weights.push(props.goal)
  if (!weights.length) return null

  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max === min ? 1 : max - min

  return { recs, W, H, P, innerW, innerH, min, max, range }
})

const points = computed(() => {
  const s = scale.value
  if (!s) return []
  const { recs, P, innerW, innerH, max, range } = s
  return recs.map((r, i) => {
    const t = recs.length === 1 ? 0.5 : i / (recs.length - 1)
    const x = P + t * innerW
    const y = P + ((max - r.weight) / range) * innerH
    return { x, y, label: r.date.slice(5), weight: r.weight }
  })
})

const polylinePoints = computed(() => points.value.map(p => `${p.x},${p.y}`).join(' '))

const areaPoints = computed(() => {
  if (!points.value.length) return null
  const baseY = scale.value.P + scale.value.innerH
  const pts = points.value.map(p => `${p.x},${p.y}`).join(' ')
  return `${pts} ${scale.value.W - scale.value.P},${baseY} ${scale.value.P},${baseY}`
})

const labelPoints = computed(() => {
  if (!points.value.length) return []
  const maxLabels = 4
  const step = Math.max(1, Math.ceil(points.value.length / maxLabels))
  return points.value.filter((_, i) => i % step === 0).map(p => ({ x: p.x, label: p.label }))
})

const hasGoal = computed(() => props.goal !== null && props.goal !== undefined && scale.value !== null)

const goalY = computed(() => {
  if (!hasGoal.value) return null
  const { P, innerH, max, range } = scale.value
  return P + ((max - props.goal) / range) * innerH
})

const ticks = computed(() => {
  const s = scale.value
  if (!s) return []
  const count = 4
  const step = s.range / count
  const arr = []
  for (let i = 0; i <= count; i++) {
    const v = (s.min + step * i)
    // display from top (max) to bottom (min)
    const displayV = (s.max - step * i)
    const y = s.P + ((s.max - displayV) / s.range) * s.innerH
    arr.push({ v: Math.round(displayV * 10) / 10, y })
  }
  return arr
})

const gridYs = computed(() => {
  const s = scale.value
  if (!s) return []
  const count = 4
  const ys = []
  for (let i = 0; i <= count; i++) {
    const displayV = s.max - (s.range / count) * i
    const y = s.P + ((s.max - displayV) / s.range) * s.innerH
    ys.push(y)
  }
  return ys
})
</script>

<style scoped>
.weight-chart { width: 100%; height: 220px; }
.chart-svg { width: 100%; height: 100%; display: block; }
.grid line { stroke: rgba(0,0,0,0.06); }
.ylabels { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
</style>
