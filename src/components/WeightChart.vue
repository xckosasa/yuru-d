
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
      <line v-if="hasGoal && !privateMode" :x1="scale.P" :x2="scale.W - scale.P" :y1="goalY" :y2="goalY" stroke="var(--chart-goal, #ff6b6b)" stroke-width="1.6" stroke-dasharray="6 4" />
      <text v-if="hasGoal && !privateMode" :x="scale.W - scale.P - 8" :y="goalY - 10" font-size="18" text-anchor="end" fill="var(--chart-goal, #ff6b6b)">目標 {{ goal }}kg</text>

      <!-- half-kg dotted grid -->
      <g class="half-grid" stroke="var(--chart-grid-half, #d0d0d0)" stroke-width="1" stroke-dasharray="2 4" stroke-opacity="0.8">
        <line v-for="(ln, i) in halfKgLines" :key="'h'+i" :x1="scale.P" :x2="scale.W - scale.P" :y1="ln.y" :y2="ln.y" />
      </g>

      <!-- point labels -->
      <g class="point-labels" fill="var(--chart-point-label, #333)" font-size="18">
        <g v-for="(p, i) in valueLabelPoints" :key="'pl'+i">
          <rect
            :x="p.x - p.labelWidth / 2"
            :y="p.labelY - 18"
            :width="p.labelWidth"
            height="24"
            rx="8"
            class="point-label-bg"
          />
          <text :x="p.x" :y="p.labelY" text-anchor="middle">{{ p.labelText }}</text>
        </g>
      </g>

      <!-- polyline -->
      <polyline :points="polylinePoints" fill="none" stroke="var(--primary, #70EBB8)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />

      <!-- points -->
      <g v-for="(p, i) in visiblePointMarkers" :key="i">
        <circle :cx="p.x" :cy="p.y" r="5" :fill="p.isLatest ? 'var(--accent, #2b9)':'var(--chart-point-bg, #fff)'" stroke="var(--primary, #70EBB8)" stroke-width="2.5" />
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

const props = defineProps({
  records: { type: Array, required: true },
  goal: { type: Number, default: null },
  privateMode: { type: Boolean, default: false },
  rangeKey: { type: String, default: '1m' }
})

function formatSignedKg(value) {
  const rounded = Number(value.toFixed(1))
  if (rounded === 0) return '±0.0kg'
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}kg`
}

const scale = computed(() => {
  const recs = (props.records || []).slice().reverse()
  const W = 600
  const H = 340
  const P = 40
  const innerW = W - P * 2
  const innerH = H - P * 2

  const baseWeight = recs[0]?.weight ?? null
  const values = props.privateMode && baseWeight !== null
    ? recs.map(r => Number((r.weight - baseWeight).toFixed(1)))
    : recs.map(r => r.weight)
  if (!props.privateMode && props.goal !== null && props.goal !== undefined) values.push(props.goal)
  if (!values.length) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max === min ? 1 : max - min

  return { recs, W, H, P, innerW, innerH, min, max, range, baseWeight }
})

const points = computed(() => {
  const s = scale.value
  if (!s) return []
  const { recs, P, innerW, innerH, max, range } = s
  return recs.map((r, i) => {
    const t = recs.length === 1 ? 0.5 : i / (recs.length - 1)
    const x = P + t * innerW
    const value = props.privateMode && s.baseWeight !== null
      ? Number((r.weight - s.baseWeight).toFixed(1))
      : r.weight
    const y = P + ((max - value) / range) * innerH
    const mmdd = r.date.slice(5).replace('-', '/')
    const labelText = props.privateMode ? formatSignedKg(value) : `${r.weight.toFixed(1)}kg`
    return { x, y, label: mmdd, weight: r.weight, value, labelText, index: i, isLatest: i === recs.length - 1 }
  })
})

const polylinePoints = computed(() => points.value.map(p => `${p.x},${p.y}`).join(' '))

const visiblePointMarkers = computed(() => {
  const list = points.value
  if (props.rangeKey === '1w' || list.length <= 2) return list
  return list.filter((_, index) => index === 0 || index === list.length - 1)
})

const labelPoints = computed(() => {
  if (!points.value.length) return []
  const maxLabels = 4
  const step = Math.max(1, Math.ceil(points.value.length / maxLabels))
  return points.value.filter((_, i) => i % step === 0).map(p => ({ x: p.x, label: p.label }))
})

const valueLabelPoints = computed(() => {
  const list = points.value
  if (!list.length) return []
  if (list.length <= 8) {
    return list.map(withLabelLayout)
  }

  const firstIndex = 0
  const latestIndex = list.length - 1
  const minIndex = list.reduce((min, point, index) => point.value < list[min].value ? index : min, 0)
  const maxIndex = list.reduce((max, point, index) => point.value > list[max].value ? index : max, 0)
  const preferredIndexes = [latestIndex, minIndex, maxIndex, firstIndex]
  const selected = []
  const minGap = list.length >= 20 ? 96 : 72

  preferredIndexes.forEach(index => {
    const point = list[index]
    if (!point) return
    const isTooClose = selected.some(selectedPoint => Math.abs(selectedPoint.x - point.x) < minGap)
    if (!isTooClose) selected.push(point)
  })

  return selected
    .sort((a, b) => a.x - b.x)
    .map(withLabelLayout)
})

function withLabelLayout(point) {
  const labelWidth = point.labelText.length * 9 + 14
  const labelY = Math.max(26, point.y - 12)
  return { ...point, labelWidth, labelY }
}

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
.point-label-bg {
  fill: var(--card, #fff);
  stroke: var(--border, rgba(0, 0, 0, 0.12));
  stroke-width: 1;
  opacity: 0.92;
}
</style>
