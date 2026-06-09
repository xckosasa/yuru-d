
<template>
  <div class="weight-chart">
    <svg viewBox="0 0 600 340" preserveAspectRatio="xMidYMid meet" class="chart-svg" role="img" aria-label="体重推移グラフ">
      <!-- horizontal grid (coarse) -->
      <g class="grid" stroke="var(--chart-grid, #b0b0b0)" stroke-width="1" stroke-opacity="0.7">
        <line v-for="(y, i) in gridYs" :key="'g'+i" :x1="scale.P" :x2="scale.W - scale.P" :y1="y" :y2="y" />
      </g>

      <!-- vertical grid -->
      <g class="v-grid" stroke="var(--chart-grid, #b0b0b0)" stroke-width="1" stroke-dasharray="3 3" stroke-opacity="0.7">
        <line v-for="(p, i) in points" :key="'v'+i" :x1="p.x" :x2="p.x" :y1="scale.P" :y2="scale.H - scale.P" />
      </g>

      <!-- axis lines -->
      <line :x1="scale.P" :x2="scale.P" :y1="scale.P" :y2="scale.H - scale.P" stroke="var(--chart-axis, rgba(0,0,0,0.2))" stroke-width="1.5" />
      <line :x1="scale.P" :x2="scale.W - scale.P" :y1="scale.H - scale.P" :y2="scale.H - scale.P" stroke="var(--chart-axis, rgba(0,0,0,0.2))" stroke-width="1.5" />

      <!-- goal line -->
      <line v-if="hasGoal" :x1="scale.P" :x2="scale.W - scale.P" :y1="goalY" :y2="goalY" stroke="var(--chart-goal, #ff6b6b)" stroke-width="1.6" stroke-dasharray="6 4" />
      <text v-if="hasGoal" :x="scale.W - scale.P - 8" :y="goalY - 10" font-size="18" text-anchor="end" fill="var(--chart-goal, #ff6b6b)">目標 {{ goal }}kg</text>

      <!-- half-kg dotted grid -->
      <g class="half-grid" stroke="var(--chart-grid-half, #d0d0d0)" stroke-width="1" stroke-dasharray="2 4" stroke-opacity="0.8">
        <line v-for="(ln, i) in halfKgLines" :key="'h'+i" :x1="scale.P" :x2="scale.W - scale.P" :y1="ln.y" :y2="ln.y" />
      </g>

      <!-- point labels -->
      <g class="point-labels" fill="var(--chart-point-label, #333)" font-size="18">
        <text v-for="(p, i) in points" :key="'pl'+i" :x="p.x" :y="p.y - 12" text-anchor="middle">{{ p.weight.toFixed(1) }}kg</text>
      </g>

      <!-- polyline -->
      <polyline :points="polylinePoints" fill="none" stroke="var(--primary, #70EBB8)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />

      <!-- points -->
      <g v-for="(p, i) in points" :key="i">
        <circle :cx="p.x" :cy="p.y" r="5" :fill="(i === points.length - 1) ? 'var(--accent, #2b9)':'#fff'" stroke="var(--primary, #70EBB8)" stroke-width="2.5" />
      </g>

      <!-- x labels -->
      <g class="xlabels" fill="var(--chart-x-label, #666)" font-size="20">
        <text v-for="(p, i) in labelPoints" :key="'l'+i" :x="p.x" :y="xLabelY" text-anchor="middle">{{ p.label }}</text>
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
  const H = 340
  const P = 40
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
    const mmdd = r.date.slice(5).replace('-', '/')
    return { x, y, label: mmdd, weight: r.weight }
  })
})

const polylinePoints = computed(() => points.value.map(p => `${p.x},${p.y}`).join(' '))

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

const halfKgLines = computed(() => {
  const s = scale.value
  if (!s) return []
  const step = 0.5
  const start = Math.floor(s.min / step) * step
  const end = Math.ceil(s.max / step) * step
  const lines = []
  for (let v = start; v <= end + 1e-9; v = Math.round((v + step) * 100) / 100) {
    const y = s.P + ((s.max - v) / s.range) * s.innerH
    lines.push({ v: Math.round(v * 10) / 10, y })
  }
  return lines
})

const xLabelY = computed(() => {
  const s = scale.value
  if (!s) return 300
  return s.H - 20
})
</script>

<style scoped>
.weight-chart { width: 100%; height: 320px; }
.chart-svg { width: 100%; height: 100%; display: block; }
.grid line { stroke: rgba(0,0,0,0.06); }
.ylabels { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
</style>
