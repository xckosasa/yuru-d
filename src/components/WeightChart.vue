
<template>
  <div class="weight-chart">
    <svg viewBox="0 0 600 260" preserveAspectRatio="xMidYMid meet" class="chart-svg" role="img" aria-label="体重推移グラフ">
      <!-- horizontal grid (coarse) -->
      <g class="grid" stroke="rgba(0,0,0,0.14)" stroke-width="1">
        <line v-for="(y, i) in gridYs" :key="'g'+i" :x1="P" :x2="W-P" :y1="y" :y2="y" />
      </g>

      <!-- vertical grid -->
      <g class="v-grid" stroke="rgba(0,0,0,0.14)" stroke-width="1" stroke-dasharray="2 4">
        <line v-for="(p, i) in points" :key="'v'+i" :x1="p.x" :x2="p.x" :y1="P" :y2="H-P" />
      </g>

      <!-- axis lines -->
      <line :x1="P" :x2="P" :y1="P" :y2="H-P" stroke="rgba(0,0,0,0.2)" stroke-width="1.5" />
      <line :x1="P" :x2="W-P" :y1="H-P" :y2="H-P" stroke="rgba(0,0,0,0.2)" stroke-width="1.5" />

      <!-- goal line -->
      <line v-if="hasGoal" :x1="P" :x2="W-P" :y1="goalY" :y2="goalY" stroke="var(--goal, #ff6b6b)" stroke-width="1.6" stroke-dasharray="6 4" />
      <text v-if="hasGoal" :x="W-P-8" :y="goalY - 10" font-size="12" text-anchor="end" fill="var(--goal, #ff6b6b)">目標 {{ goal }}kg</text>

      <!-- half-kg dotted grid -->
      <g class="half-grid" stroke="rgba(0,0,0,0.14)" stroke-width="1" stroke-dasharray="2 4">
        <line v-for="(ln, i) in halfKgLines" :key="'h'+i" :x1="P" :x2="W-P" :y1="ln.y" :y2="ln.y" />
      </g>

      <!-- point labels -->
      <g class="point-labels" fill="#333" font-size="14">
        <text v-for="(p, i) in points" :key="'pl'+i" :x="p.x" :y="p.y - 12" text-anchor="middle">{{ p.weight.toFixed(1) }}kg</text>
      </g>

      <!-- polyline -->
      <polyline :points="polylinePoints" fill="none" stroke="var(--primary, #70EBB8)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />

      <!-- points -->
      <g v-for="(p, i) in points" :key="i">
        <circle :cx="p.x" :cy="p.y" r="5" :fill="(i === points.length - 1) ? 'var(--accent, #2b9)':'#fff'" stroke="var(--primary, #70EBB8)" stroke-width="2.5" />
      </g>

      <!-- y labels -->
      <g class="ylabels" fill="#222" font-size="20" text-anchor="end">
        <text v-for="(t, i) in ticks" :key="'y'+i" :x="P - 18" :y="t.y+7">{{ t.v }}kg</text>
      </g>

      <!-- x labels -->
      <g class="xlabels" fill="#666" font-size="20">
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
  const H = 260
  const P = 96
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
  if (!s) return 245
  return s.H - Math.floor(s.P / 2) + 20
})
</script>

<style scoped>
.weight-chart { width: 100%; height: 220px; }
.chart-svg { width: 100%; height: 100%; display: block; }
.grid line { stroke: rgba(0,0,0,0.06); }
.ylabels { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
</style>
