<template>
  <div class="app-shell">
    <main class="app">
      <header class="header-card">
        <div>
          <h1 class="title" data-text="LOGS"><img :src="logo" alt=""></h1>
          <p class="subtitle">体重だけは記録しよう。</p>
        </div>
        <div class="header-actions">
          <button class="btn-icon" type="button" @click="showSettingsModal = true"><img :src="gear" alt=""></button>
        </div>
      </header>

      <section class="card summary-card">
        <div v-if="latest" class="summary-grid">
          <div class="big-number">
            <div class="label">{{ settings.privateMode ? '初日から' : '最新体重' }}</div>
            <div class="value">
              {{ settings.privateMode ? firstDayDiffText : formatWeight(latest.weight) }}
              <span v-if="!settings.privateMode">kg</span>
            </div>
            <div v-if="settings.privateMode" class="hint">体重は非公開です</div>
          </div>
          <div class="small-metrics">
            <div class="metric">
              <div class="label">BMI</div>
              <div class="value">{{ bmi }}</div>
            </div>
            <div class="metric">
              <div class="label">前回比</div>
              <div class="value">{{ prevDiffText }}</div>
            </div>
            <div class="metric">
              <div class="label">目標との差</div>
              <div class="value">{{ goalDiffText }}</div>
            </div>
            <div class="metric">
              <div class="label">体脂肪</div>
              <div class="value">{{ latest.fat !== null ? latest.fat + ' %' : '—' }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty">
          <p>まだ記録がありません。今日の記録を追加してみましょう。</p>
        </div>
      </section>

      <section :class="['card','form-card', { flash: saved }]">
        <h2 class="card-title">今日の記録</h2>
        <form @submit.prevent="saveRecord">
          <label>
            日付
            <input type="date" v-model="form.date" />
          </label>

          <label>
            体重 (kg)
            <input type="number" step="0.1" v-model.number="form.weight" placeholder="例: 64.2" />
          </label>

          <label>
            体脂肪率 (%) <span class="hint">任意</span>
            <input type="number" step="0.1" v-model.number="form.fat" placeholder="例: 18.5" />
          </label>

          <label>
            メモ
            <input type="text" v-model="form.note" placeholder="今日は調子が良い" />
          </label>

          <div class="error" v-if="error">{{ error }}</div>

          <button class="btn-primary lg" type="submit">保存する</button>
          <span class="saved" v-if="saved">記録しました</span>
        </form>
      </section>

      <section class="card graph-card">
        <h2 class="card-title">体重推移</h2>
        <div class="placeholder">
          <p>記録が増えると、ここに体重の変化が表示されます。</p>
        </div>
      </section>

      <section class="card list-card">
        <h2 class="card-title">記録一覧</h2>
        <div v-if="records.length === 0" class="empty-small">まだ記録がありません。</div>
        <ul class="record-list">
          <li v-for="(r, i) in records" :key="r.date" :class="['record-item', { 'new-record': r.date === lastSavedDate }]">
           <div class="record-info">
              <div class="row">
              <div class="date">{{ r.date }}</div>
              <div class="weight">{{ settings.privateMode ? '非公開' : formatWeight(r.weight) + ' kg' }}</div>
            </div>
            <div class="row small">
              <div class="fat">体脂肪: {{ r.fat !== null ? r.fat + '%' : '—' }}</div>
              <div class="note">{{ r.note || '—' }}</div>
            </div>
            <div class="record-diff" v-if="recordDiff(i)">前回から {{ recordDiff(i) }}</div>
           </div>
            <div class="record-actions">
              <button class="btn-text" type="button" @click="editRecord(r)">編集</button>
            </div>
          </li>
        </ul>
      </section>
    </main>

    <div v-if="showSettingsModal" class="modal-backdrop" @click.self="showSettingsModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h2>設定</h2>
          <button class="close-button" @click="showSettingsModal = false">✕</button>
        </div>
        <form @submit.prevent="handleSettingsSave">
          <label class="toggle-switch">
            <input type="checkbox" v-model="settings.privateMode" />
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
            <span class="toggle-label">体重を非公開にする</span>
          </label>

          <label>
            身長 (cm)
            <input type="number" v-model.number="settings.height" min="1" />
          </label>

          <label>
            目標体重 (kg)
            <input type="number" v-model.number="settings.goal" min="1" step="0.1" />
          </label>

          <label>
            通知したい時間
            <input type="time" v-model="settings.time" />
          </label>

          <div class="note-text">毎日 {{ settings.time || '—' }} に記録する予定</div>

          <div class="error" v-if="settingsError">{{ settingsError }}</div>

          <div class="modal-actions">
            <button class="btn-text" type="button" @click="resetSettings">リセット</button>
            <button class="btn-text" type="button" @click="clearAllRecords">ログをクリア</button>
            <button class="btn-primary" type="submit">設定を保存</button>
          </div>
          <span class="saved" v-if="settingsSaved">保存しました</span>
        </form>
      </div>
    </div>

    <div v-if="showEditModal" class="modal-backdrop" @click.self="cancelEdit()">
      <div class="modal-card">
        <div class="modal-header">
          <h2>記録を編集</h2>
          <button class="close-button" @click="cancelEdit()">✕</button>
        </div>
        <form @submit.prevent="saveEditedRecord">
          <label>
            日付
            <input type="date" v-model="editForm.date" disabled />
          </label>

          <label>
            体重 (kg)
            <input type="number" step="0.1" v-model.number="editForm.weight" placeholder="例: 64.2" />
          </label>

          <label>
            体脂肪率 (%) <span class="hint">任意</span>
            <input type="number" step="0.1" v-model.number="editForm.fat" placeholder="例: 18.5" />
          </label>

          <label>
            メモ
            <input type="text" v-model="editForm.note" placeholder="今日は調子が良い" />
          </label>

          <div class="error" v-if="error">{{ error }}</div>

          <div class="modal-actions">
            <button class="btn-text" type="button" @click="deleteRecord(editingRecord)" v-if="editingRecord">削除</button>
            <button class="btn-primary" type="submit">保存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { formatWeight as hwFormatWeight, computeBMI } from './utils/helpers'
import { loadSettingsFromLS, saveSettingsToLS, loadRecordsFromLS, saveRecordsToLS, clearRecordsFromLS, addOrReplaceRecord } from './utils/storage'
import logo from './assets/img/logo.svg'
import gear from './assets/img/gear.svg'

const LS_SETTINGS = 'yurutto-settings'
const LS_RECORDS = 'yurutto-records'

const settings = ref({ height: null, goal: null, time: '', privateMode: false })
const records = ref([])

const form = ref({ date: '', weight: null, fat: null, note: '' })
const editForm = ref({ date: '', weight: null, fat: null, note: '' })
const error = ref('')
const saved = ref(false)
const settingsError = ref('')
const settingsSaved = ref(false)
const showSettingsModal = ref(false)
const showEditModal = ref(false)
const lastSavedDate = ref(null)
const editingRecord = ref(null)

function saveSettings() {
  settingsError.value = ''
  if (!settings.value.height || settings.value.height < 1) {
    settingsError.value = '身長は1以上の数値で入力してください。'
    return
  }
  saveSettingsToLS(settings.value)
  settingsSaved.value = true
  setTimeout(() => (settingsSaved.value = false), 1500)
}

function handleSettingsSave() {
  saveSettings()
  if (!settingsError.value) {
    showSettingsModal.value = false
  }
}

function resetSettings() {
  if (!confirm('設定をリセットしますか？')) return
  settings.value = { height: null, goal: null, time: '', privateMode: false }
  saveSettingsToLS(settings.value)
  settingsError.value = ''
  settingsSaved.value = true
  setTimeout(() => (settingsSaved.value = false), 1500)
}

function cancelEdit() {
  showEditModal.value = false
  editingRecord.value = null
  error.value = ''
  editForm.value = {
    date: '',
    weight: null,
    fat: null,
    note: ''
  }
}

function editRecord(record) {
  editingRecord.value = record
  showEditModal.value = true
  editForm.value = {
    date: record.date,
    weight: record.weight,
    fat: record.fat,
    note: record.note
  }
}

function deleteRecord(record) {
  if (!confirm('この記録を削除しますか？')) return
  records.value = records.value.filter(r => r.date !== record.date)
  saveRecordsToLS(records.value)
  if (editingRecord.value?.date === record.date) {
    cancelEdit()
  }
}

function clearAllRecords() {
  if (!confirm('すべての記録を削除しますか？この操作は元に戻せません。')) return
  records.value = []
  clearRecordsFromLS()
}

function loadRecords() {
  records.value = loadRecordsFromLS()
}

function saveRecord() {
  error.value = ''
  if (!form.value.date) {
    error.value = '日付は必須です。'
    return
  }
  if (!form.value.weight || form.value.weight < 1) {
    error.value = '体重は1以上の数値で入力してください。'
    return
  }
  if (form.value.fat !== null && form.value.fat !== '' && form.value.fat < 0) {
    error.value = '体脂肪率は0以上の数値で入力してください。'
    return
  }

  const entry = {
    date: form.value.date,
    weight: Number(form.value.weight),
    fat: form.value.fat === null || form.value.fat === '' ? null : Number(form.value.fat),
    note: form.value.note || ''
  }

  let targetRecords = records.value
  const updated = addOrReplaceRecord(targetRecords, entry)
  records.value = updated
  saveRecordsToLS(records.value)

  // mark last saved record for brief highlight
  lastSavedDate.value = entry.date
  setTimeout(() => (lastSavedDate.value = null), 2000)

  saved.value = true
  setTimeout(() => (saved.value = false), 1400)
}

function saveEditedRecord() {
  error.value = ''
  if (!editForm.value.date) {
    error.value = '日付は必須です。'
    return
  }
  if (!editForm.value.weight || editForm.value.weight < 1) {
    error.value = '体重は1以上の数値で入力してください。'
    return
  }
  if (editForm.value.fat !== null && editForm.value.fat !== '' && editForm.value.fat < 0) {
    error.value = '体脂肪率は0以上の数値で入力してください。'
    return
  }

  const entry = {
    date: editForm.value.date,
    weight: Number(editForm.value.weight),
    fat: editForm.value.fat === null || editForm.value.fat === '' ? null : Number(editForm.value.fat),
    note: editForm.value.note || ''
  }

  let targetRecords = records.value
  if (editingRecord.value) {
    targetRecords = records.value.filter(r => r.date !== editingRecord.value.date)
  }

  records.value = addOrReplaceRecord(targetRecords, entry)
  saveRecordsToLS(records.value)
  lastSavedDate.value = entry.date
  setTimeout(() => (lastSavedDate.value = null), 2000)
  saved.value = true
  setTimeout(() => (saved.value = false), 1400)
  cancelEdit()
}

function recordDiff(index) {
  const current = records.value[index]
  const previous = records.value[index + 1]
  if (!current || !previous) return null
  const diff = (current.weight - previous.weight).toFixed(1)
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff}kg`
}

function formatWeight(v) {
  return hwFormatWeight(v)
}

onMounted(() => {
  // load settings and records from storage utils
  Object.assign(settings.value, loadSettingsFromLS())
  loadRecords()
  // initialize form date to today
  form.value.date = new Date().toISOString().slice(0, 10)
})

const latest = computed(() => (records.value.length ? records.value[0] : null))
const firstRecord = computed(() => (records.value.length ? records.value[records.value.length - 1] : null))

const firstDayDiffText = computed(() => {
  if (!latest.value || !firstRecord.value) return '—'
  const diff = (latest.value.weight - firstRecord.value.weight).toFixed(1)
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff}kg`
})

const bmi = computed(() => {
  if (!latest.value || !settings.value.height) return '—'
  const b = computeBMI(latest.value.weight, settings.value.height)
  return b == null ? '—' : String(b.toFixed ? b.toFixed(1) : b)
})

const prevDiffText = computed(() => {
  if (records.value.length < 2) return '前回の記録がありません'
  const prev = records.value[1]
  const diff = (latest.value.weight - prev.weight).toFixed(1)
  const sign = diff > 0 ? '+' : ''
  return `前回から ${sign}${diff}kg`
})

const goalDiffText = computed(() => {
  if (!settings.value.goal || !latest.value) return '目標が設定されていません'
  const d = (settings.value.goal - latest.value.weight).toFixed(1)
  if (d > 0) return `目標まで あと ${d}kg`
  if (d < 0) return `目標を ${Math.abs(d)}kg 下回っています`
  return '目標達成です！おめでとうございます'
})

// expose to template
const recordsRef = records

// re-export for template usage
const recordsComputed = records

// helpers used in template
</script>

