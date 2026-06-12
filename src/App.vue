<template>
  <div class="app-shell">
    <main class="app">
      <header class="header-card">
        <div>
          <h1 class="title" data-text="LOGS"><img :src="logo" alt=""></h1>
          <p class="subtitle">体重だけは記録しよう。</p>
        </div>
      </header>

      <Transition name="view-rise" mode="out-in">
        <div :key="activeView" class="view-panel">
      <section v-if="activeView === 'home'" class="card summary-card">
        <div v-if="latest" class="summary-grid">
          <div class="big-number">
            <div class="chara">
              <img :src="charaIcon" alt="" aria-hidden="true">
            </div>
            <div class="label">{{ settings.privateMode ? '初日から' : 'NOW!!' }}</div>
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

      <section v-if="activeView === 'home'" :class="['card','form-card', { flash: saved }]">
        <h2 class="card-title">TODAY</h2>
        <form @submit.prevent="saveRecord">
          <div class="date-summary">
            <div>
              <div class="label">記録日</div>
              <div class="date-current">{{ selectedDateLabel }}</div>
            </div>
            <button class="btn-text compact" type="button" @click="showDateInput = !showDateInput">
              {{ showDateInput ? '閉じる' : '日付を変更' }}
            </button>
          </div>

          <label v-if="showDateInput">
            日付
            <input type="date" v-model="form.date" />
          </label>

          <label>
            体重 (kg)
            <input type="number" step="0.1" v-model.number="form.weight" :placeholder="weightPlaceholder" />
          </label>

          <button class="optional-toggle" type="button" @click="showOptionalFields = !showOptionalFields">
            <span class="optional-icon" :style="{ '--icon': `url(${iconEdit})` }" aria-hidden="true"></span>
            <span>{{ showOptionalFields ? '体脂肪・メモを閉じる' : '体脂肪・メモを追加' }}</span>
          </button>

          <div v-if="showOptionalFields" class="optional-fields">
            <label>
              体脂肪率 (%) <span class="hint">任意</span>
              <input type="number" step="0.1" v-model.number="form.fat" placeholder="例: 18.5" />
            </label>

            <label>
              メモ
              <input type="text" v-model="form.note" placeholder="今日は調子が良い" />
            </label>
          </div>

          <div class="error" v-if="error">{{ error }}</div>

          <button class="btn-primary lg" type="submit">{{ saveButtonText }}</button>
        </form>
      </section>

      <section v-if="activeView === 'home' && showInstallPrompt" class="card install-card">
        <div>
          <h2 class="card-title">ADD TO HOME</h2>
          <p>すぐ記録できるように、アプリとして追加できます。</p>
        </div>
        <button class="btn-icon lg" type="button" @click="installPWA"><img src="/icons/icon-192.png" alt="追加"></button>
      </section>

      <section v-if="activeView === 'trend'" class="card graph-card">
        <h2 class="card-title">TREND</h2>
        <div v-if="records.length >= 2">
          <div class="range-tabs" aria-label="グラフ表示期間">
            <button
              v-for="range in trendRanges"
              :key="range.key"
              :class="{ active: activeTrendRangeKey === range.key }"
              type="button"
              :disabled="activeTrendRangeKey === range.key || !isTrendRangeAvailable(range)"
              @click="selectTrendRange(range)"
            >
              {{ range.label }}
            </button>
          </div>

          <div class="trend-summary">
            <div>
              <span>CHANGE</span>
              <strong>{{ trendSummary.change }}</strong>
            </div>
            <div>
              <span>COUNT</span>
              <strong>{{ trendSummary.count }}</strong>
            </div>
            <div v-if="!settings.privateMode">
              <span>AVG</span>
              <strong>{{ trendSummary.average }}</strong>
            </div>
            <div v-if="!settings.privateMode">
              <span>LOW</span>
              <strong>{{ trendSummary.low }}</strong>
            </div>
          </div>

          <WeightChart
            v-if="filteredTrendRecords.length >= 2"
            :records="filteredTrendRecords"
            :goal="settings.goal"
            :private-mode="settings.privateMode"
            :range-key="activeTrendRangeKey"
          />
          <div v-else class="placeholder">
            <p>この期間の記録が2件以上でグラフを表示します。</p>
          </div>
        </div>
        <div v-else class="placeholder">
          <p>記録が2件以上でグラフを表示します。</p>
        </div>
      </section>

      <section v-if="activeView === 'history'" class="card list-card">
        <h2 class="card-title">HISTORY</h2>
        <div v-if="records.length > 0" class="history-month-nav">
          <button class="btn-text compact" type="button" :disabled="!canGoOlderHistoryMonth" @click="goOlderHistoryMonth">BACK</button>
          <div class="history-month-label">{{ selectedHistoryMonthLabel }}</div>
          <button class="btn-text compact" type="button" :disabled="!canGoNewerHistoryMonth" @click="goNewerHistoryMonth">NEXT</button>
        </div>
        <div v-if="records.length === 0" class="empty-small">まだ記録がありません。</div>
        <div v-else-if="filteredHistoryRecords.length === 0" class="empty-small">この月の記録はありません。</div>
        <ul class="record-list">
          <li v-for="r in filteredHistoryRecords" :key="r.date" :class="['record-item', { 'new-record': r.date === lastSavedDate }]">
           <div class="record-info">
              <div class="row">
              <div class="date">{{ r.date }}</div>
              <div class="weight">{{ settings.privateMode ? '非公開' : formatWeight(r.weight) + ' kg' }}</div>
            </div>
            <div class="row small">
              <div class="fat">体脂肪: {{ r.fat !== null ? r.fat + '%' : '—' }}</div>
              <div class="note">{{ r.note || '—' }}</div>
            </div>
            <div class="record-diff" v-if="recordDiff(r)">前回から {{ recordDiff(r) }}</div>
           </div>
            <div class="record-actions">
              <button class="btn-text" type="button" @click="editRecord(r)">編集</button>
            </div>
          </li>
        </ul>
      </section>
      <section v-if="activeView === 'settings'" class="card settings-card">
        <h2 class="card-title">SETTINGS</h2>
        <form @submit.prevent="handleSettingsSave">
          <div class="settings-toggle-grid">
            <label class="toggle-switch compact-toggle">
              <input type="checkbox" v-model="settings.privateMode" />
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
              <span class="toggle-label">体重非公開</span>
            </label>

            <label class="toggle-switch compact-toggle">
              <input type="checkbox" v-model="settings.darkMode" />
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
              <span class="toggle-label">ダークモード</span>
            </label>
          </div>

          <div class="settings-input-grid">
            <label>
              身長 (cm)
              <select v-model.number="settings.height">
                <option :value="null">—</option>
                <option v-for="height in heightOptions" :key="height" :value="height">{{ height }}</option>
              </select>
            </label>

            <label>
              目標 (kg)
              <select v-model.number="settings.goal">
                <option :value="null">—</option>
                <option v-for="weight in goalWeightOptions" :key="weight" :value="weight">{{ weight.toFixed(1) }}</option>
              </select>
            </label>

            <label>
              通知時間
              <input type="time" v-model="settings.time" />
            </label>
          </div>
          <div class="settings-section notification-box">
            <div>
              <div class="notification-title">通知許可</div>
              <div class="notification-status">{{ notificationStatusText }}</div>
              <div class="note-text">毎日 {{ settings.time || '—' }} に記録する予定</div>
            </div>
            <button
              class="btn-text compact"
              type="button"
              :disabled="!canRequestNotificationPermission"
              @click="requestNotificationPermission"
            >
              通知を許可する
            </button>
          </div>
          <div class="note-text" v-if="notificationHelpText">{{ notificationHelpText }}</div>

          <div class="settings-section backup-box">
            <div class="settings-section-copy">
              <div class="backup-title">BACKUP</div>
              <div class="note-text">記録と設定をJSONで保存・復元できます。</div>
            </div>
            <div class="backup-actions">
              <button class="btn-text compact" type="button" @click="exportBackup">EXPORT</button>
              <button class="btn-text compact" type="button" @click="openImportFile">IMPORT</button>
            </div>
            <input
              ref="importFileInput"
              class="visually-hidden"
              type="file"
              accept="application/json,.json"
              @change="importBackup"
            />
          </div>

          <div class="settings-section privacy-box">
            <div class="settings-section-copy">
              <div class="privacy-title">PRIVACY</div>
              <div class="note-text">記録は端末内に保存され、外部サーバーへ送信されません。</div>
            </div>
            <a class="btn-text compact privacy-link" href="/privacy.html" target="_blank" rel="noopener">POLICY</a>
          </div>

          <div class="settings-section data-management">
            <button class="data-management-toggle" type="button" @click="showDataManagement = !showDataManagement">
              <span>
                <span class="data-management-title">DATA MANAGEMENT</span>
                <span class="data-management-note">リセットやログ削除など</span>
              </span>
              <span class="data-management-state">{{ showDataManagement ? 'CLOSE' : 'OPEN' }}</span>
            </button>
            <div v-if="showDataManagement" class="danger-actions">
              <button class="btn-danger" type="button" @click="resetSettings">リセット</button>
              <button class="btn-danger" type="button" @click="clearAllRecords">ログをクリア</button>
            </div>
          </div>

          <div class="error" v-if="settingsError">{{ settingsError }}</div>

          <div class="page-actions settings-save-actions">
            <button class="btn-primary lg" type="submit">設定を保存</button>
          </div>
        </form>
      </section>

      <section v-if="activeView === 'edit'" class="card edit-card">
        <div class="page-header">
          <h2 class="card-title">EDIT</h2>
          <button class="btn-text compact" type="button" @click="cancelEdit()">戻る</button>
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

          <div class="page-actions">
            <button class="btn-text" type="button" @click="deleteRecord(editingRecord)" v-if="editingRecord">削除</button>
            <button class="btn-primary" type="submit">保存</button>
          </div>
        </form>
      </section>
        </div>
      </Transition>
    </main>

    <nav class="bottom-nav" aria-label="画面切り替え">
      <button :class="{ active: activeView === 'home' }" type="button" :disabled="activeView === 'home'" @click="activeView = 'home'">
        <span class="nav-icon" :style="{ '--icon': `url(${iconHome})` }" aria-hidden="true"></span>
      </button>
      <button :class="{ active: activeView === 'trend' }" type="button" :disabled="activeView === 'trend'" @click="activeView = 'trend'">
        <span class="nav-icon" :style="{ '--icon': `url(${iconChart})` }" aria-hidden="true"></span>
      </button>
      <button :class="{ active: activeView === 'history' || activeView === 'edit' }" type="button" :disabled="activeView === 'history' || activeView === 'edit'" @click="activeView = 'history'">
        <span class="nav-icon" :style="{ '--icon': `url(${iconList})` }" aria-hidden="true"></span>
      </button>
      <button :class="{ active: activeView === 'settings' }" type="button" :disabled="activeView === 'settings'" @click="activeView = 'settings'">
        <span class="nav-icon" :style="{ '--icon': `url(${iconSetting})` }" aria-hidden="true"></span>
      </button>
    </nav>

    <Transition name="toast-fade">
      <div v-if="toastMessage" class="toast" role="status" aria-live="polite">
        {{ toastMessage }}
      </div>
    </Transition>

    <Transition name="confirm-fade">
      <div v-if="confirmDialog" class="confirm-backdrop" @click.self="resolveConfirm(false)">
        <div class="confirm-dialog" role="dialog" aria-modal="true" :aria-labelledby="confirmDialog.titleId">
          <h2 :id="confirmDialog.titleId">{{ confirmDialog.title }}</h2>
          <p>{{ confirmDialog.message }}</p>
          <div class="confirm-actions">
            <button class="btn-text compact" type="button" @click="resolveConfirm(false)">キャンセル</button>
            <button
              :class="['btn-primary', 'confirm-button', { danger: confirmDialog.danger }]"
              type="button"
              @click="resolveConfirm(true)"
            >
              {{ confirmDialog.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { formatWeight as hwFormatWeight, computeBMI } from './utils/helpers'
import { loadSettingsFromLS, saveSettingsToLS, loadRecordsFromLS, saveRecordsToLS, clearRecordsFromLS, addOrReplaceRecord } from './utils/storage'
import logo from './assets/img/logo.svg'
import iconHome from './assets/img/icon-home.svg'
import iconChart from './assets/img/icon-chart.svg'
import iconList from './assets/img/icon-list.svg'
import iconSetting from './assets/img/icon-setting.svg'
import iconEdit from './assets/img/icon-edit.svg'
import iconFat from './assets/img/icon-fat.svg'
import iconNormal from './assets/img/icon-normal.svg'
import iconSlim from './assets/img/icon-slim.svg'
import WeightChart from './components/WeightChart.vue'

const settings = ref({ height: null, goal: null, time: '', privateMode: false, darkMode: true })
const records = ref([])
const heightOptions = Array.from({ length: 101 }, (_, index) => 120 + index)
const goalWeightOptions = Array.from({ length: 241 }, (_, index) => Number((30 + index * 0.5).toFixed(1)))

const form = ref({ date: '', weight: null, fat: null, note: '' })
const editForm = ref({ date: '', weight: null, fat: null, note: '' })
const error = ref('')
const saved = ref(false)
const settingsError = ref('')
const settingsSaved = ref(false)
const toastMessage = ref('')
const confirmDialog = ref(null)
const notificationPermission = ref('unsupported')
const activeView = ref('home')
const selectedTrendRange = ref('1m')
const selectedHistoryMonth = ref('')
const showDateInput = ref(false)
const showOptionalFields = ref(false)
const showDataManagement = ref(false)
const lastSavedDate = ref(null)
const editingRecord = ref(null)
const deferredInstallPrompt = ref(null)
const appInstalled = ref(false)
const importFileInput = ref(null)

let notificationTimer = null
let toastTimer = null
let confirmResolver = null

function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateLabel(dateString) {
  if (!dateString) return '今日'
  const [year, month, day] = dateString.split('-')
  if (!year || !month || !day) return dateString
  return `${Number(month)}月${Number(day)}日`
}

function parseDateString(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatMonthLabel(monthString) {
  if (!monthString) return '—'
  const [year, month] = monthString.split('-')
  if (!year || !month) return monthString
  return `${year}.${month}`
}

function getDefaultSettings() {
  return { height: null, goal: null, time: '', privateMode: false, darkMode: true }
}

function showToast(message) {
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
    toastTimer = null
  }, 1800)
}

function requestConfirm({ title, message, confirmText = 'OK', danger = false }) {
  return new Promise(resolve => {
    confirmResolver = resolve
    confirmDialog.value = {
      title,
      message,
      confirmText,
      danger,
      titleId: `confirm-title-${Date.now()}`
    }
  })
}

function resolveConfirm(result) {
  if (confirmResolver) {
    confirmResolver(result)
    confirmResolver = null
  }
  confirmDialog.value = null
}

function clearNotificationTimer() {
  if (notificationTimer) {
    clearTimeout(notificationTimer)
    notificationTimer = null
  }
}

function getNextNotificationDelay() {
  if (!settings.value.time) return null
  const [hours, minutes] = settings.value.time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null

  const now = new Date()
  const target = new Date(now)
  target.setHours(hours, minutes, 0, 0)
  if (target <= now) {
    target.setDate(target.getDate() + 1)
  }

  return target.getTime() - now.getTime()
}

function showReminderNotification() {
  const title = 'LOGS'
  const body = settings.value.time
    ? `今日は ${settings.value.time} に記録を忘れずに！`
    : '今日の体重記録を忘れずに。'

  if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png'
      })
    })
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icons/icon-192.png' })
  }
}

function scheduleNotification() {
  clearNotificationTimer()
  if (!('Notification' in window) || !settings.value.time || Notification.permission !== 'granted') return
  const delay = getNextNotificationDelay()
  if (delay === null) return

  notificationTimer = setTimeout(() => {
    showReminderNotification()
    scheduleNotification()
  }, delay)
}

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    notificationPermission.value = 'unsupported'
    return
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      notificationPermission.value = permission
      if (permission === 'granted') {
        scheduleNotification()
      } else {
        clearNotificationTimer()
      }
    })
  } else if (Notification.permission === 'granted') {
    notificationPermission.value = Notification.permission
    scheduleNotification()
  } else {
    notificationPermission.value = Notification.permission
    clearNotificationTimer()
  }
}

function syncNotificationPermission() {
  notificationPermission.value = 'Notification' in window ? Notification.permission : 'unsupported'
}

function applyDarkMode() {
  if (settings.value.darkMode) {
    document.documentElement.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark-mode')
  }
}

function saveSettings() {
  settingsError.value = ''
  if (!settings.value.height || settings.value.height < 1) {
    settingsError.value = '身長は1以上の数値で入力してください。'
    return
  }
  saveSettingsToLS(settings.value)
  settingsSaved.value = true
  setTimeout(() => (settingsSaved.value = false), 1500)
  showToast('保存しました')
  if (notificationPermission.value === 'granted') {
    scheduleNotification()
  }
}

function handleSettingsSave() {
  saveSettings()
  applyDarkMode()
}

async function resetSettings() {
  const ok = await requestConfirm({
    title: '設定をリセットしますか？',
    message: '身長、目標体重、通知時刻などの設定を初期状態に戻します。',
    confirmText: 'リセット',
    danger: true
  })
  if (!ok) return
  settings.value = { height: null, goal: null, time: '', privateMode: false, darkMode: true }
  saveSettingsToLS(settings.value)
  settingsError.value = ''
  settingsSaved.value = true
  applyDarkMode()
  setTimeout(() => (settingsSaved.value = false), 1500)
  showToast('設定をリセットしました')
}

function cancelEdit() {
  activeView.value = 'history'
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
  activeView.value = 'edit'
  editForm.value = {
    date: record.date,
    weight: record.weight,
    fat: record.fat,
    note: record.note
  }
}

async function deleteRecord(record) {
  const ok = await requestConfirm({
    title: 'この記録を削除しますか？',
    message: '削除した記録は元に戻せません。',
    confirmText: '削除',
    danger: true
  })
  if (!ok) return
  records.value = records.value.filter(r => r.date !== record.date)
  saveRecordsToLS(records.value)
  if (editingRecord.value?.date === record.date) {
    cancelEdit()
  }
}

async function clearAllRecords() {
  const ok = await requestConfirm({
    title: 'すべてのログを削除しますか？',
    message: 'この操作は元に戻せません。必要な場合は先にバックアップをエクスポートしてください。',
    confirmText: '削除',
    danger: true
  })
  if (!ok) return
  records.value = []
  clearRecordsFromLS()
}

function exportBackup() {
  settingsError.value = ''
  const payload = {
    app: 'LOGS',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settings.value,
    records: records.value
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `logs-backup-${getTodayDateString()}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  showToast('エクスポートしました')
}

function openImportFile() {
  settingsError.value = ''
  importFileInput.value?.click()
}

function validateBackupPayload(payload) {
  const sourceRecords = Array.isArray(payload) ? payload : payload?.records
  if (!Array.isArray(sourceRecords)) {
    throw new Error('JSON内に記録データが見つかりません。')
  }

  const nextRecords = sourceRecords.map(record => {
    if (!record || typeof record !== 'object') {
      throw new Error('記録データの形式が正しくありません。')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date || '')) {
      throw new Error('記録日の形式が正しくありません。')
    }
    const weight = Number(record.weight)
    if (!Number.isFinite(weight) || weight < 1) {
      throw new Error('体重データの形式が正しくありません。')
    }
    const fat = record.fat === null || record.fat === '' || record.fat === undefined ? null : Number(record.fat)
    if (fat !== null && (!Number.isFinite(fat) || fat < 0)) {
      throw new Error('体脂肪率データの形式が正しくありません。')
    }
    return {
      date: record.date,
      weight,
      fat,
      note: typeof record.note === 'string' ? record.note : ''
    }
  }).sort((a, b) => (a.date < b.date ? 1 : -1))

  const importedSettings = Array.isArray(payload) ? {} : payload?.settings || {}
  const mergedSettings = {
    ...getDefaultSettings(),
    ...settings.value,
    ...importedSettings
  }
  const nextSettings = {
    height: mergedSettings.height === null || mergedSettings.height === '' ? null : Number(mergedSettings.height),
    goal: mergedSettings.goal === null || mergedSettings.goal === '' ? null : Number(mergedSettings.goal),
    time: typeof mergedSettings.time === 'string' ? mergedSettings.time : '',
    privateMode: Boolean(mergedSettings.privateMode),
    darkMode: Boolean(mergedSettings.darkMode)
  }
  if (nextSettings.height !== null && (!Number.isFinite(nextSettings.height) || nextSettings.height < 1)) {
    nextSettings.height = null
  }
  if (nextSettings.goal !== null && (!Number.isFinite(nextSettings.goal) || nextSettings.goal < 1)) {
    nextSettings.goal = null
  }

  return { records: nextRecords, settings: nextSettings }
}

function importBackup(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const payload = JSON.parse(String(reader.result || ''))
      const imported = validateBackupPayload(payload)
      const ok = await requestConfirm({
        title: 'バックアップを復元しますか？',
        message: '現在の記録と設定をインポート内容で置き換えます。',
        confirmText: '復元',
        danger: true
      })
      if (!ok) return
      records.value = imported.records
      settings.value = imported.settings
      saveRecordsToLS(records.value)
      saveSettingsToLS(settings.value)
      selectedHistoryMonth.value = ''
      settingsError.value = ''
      settingsSaved.value = true
      applyDarkMode()
      if (notificationPermission.value === 'granted') {
        scheduleNotification()
      }
      setTimeout(() => (settingsSaved.value = false), 1500)
      showToast('インポートしました')
    } catch (e) {
      settingsError.value = e instanceof Error ? e.message : 'JSONの読み込みに失敗しました。'
    } finally {
      event.target.value = ''
    }
  }
  reader.onerror = () => {
    settingsError.value = 'ファイルの読み込みに失敗しました。'
    event.target.value = ''
  }
  reader.readAsText(file)
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
  showToast('記録しました')
  resetFormAfterSave()
}

function resetFormAfterSave() {
  form.value = {
    date: getTodayDateString(),
    weight: null,
    fat: null,
    note: ''
  }
  showDateInput.value = false
  showOptionalFields.value = false
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
  showToast('保存しました')
  cancelEdit()
}

function recordDiff(record) {
  const index = records.value.findIndex(item => item.date === record.date)
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

function goOlderHistoryMonth() {
  const currentIndex = historyMonthIndex.value
  if (currentIndex < 0 || currentIndex >= historyMonths.value.length - 1) return
  selectedHistoryMonth.value = historyMonths.value[currentIndex + 1]
}

function goNewerHistoryMonth() {
  const currentIndex = historyMonthIndex.value
  if (currentIndex <= 0) return
  selectedHistoryMonth.value = historyMonths.value[currentIndex - 1]
}

function isTrendRangeAvailable(range) {
  if (range.key === 'all') return records.value.length > 0
  if (range.key === '1w') return records.value.length > 0
  if (!oldestRecord.value || !latest.value) return false
  return recordsSpanDays.value >= range.days
}

function selectTrendRange(range) {
  if (!isTrendRangeAvailable(range)) return
  selectedTrendRange.value = range.key
}

async function installPWA() {
  if (!deferredInstallPrompt.value) return
  deferredInstallPrompt.value.prompt()
  await deferredInstallPrompt.value.userChoice
  deferredInstallPrompt.value = null
}

onMounted(() => {
  // load settings and records from storage utils
  Object.assign(settings.value, loadSettingsFromLS())
  loadRecords()
  // initialize form date to today
  form.value.date = getTodayDateString()
  applyDarkMode()
  syncNotificationPermission()
  if (notificationPermission.value === 'granted') {
    scheduleNotification()
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    deferredInstallPrompt.value = event
  })

  window.addEventListener('appinstalled', () => {
    appInstalled.value = true
    deferredInstallPrompt.value = null
  })
})

watch(
  () => settings.value.time,
  () => {
    if (notificationPermission.value === 'granted') {
      scheduleNotification()
    } else {
      clearNotificationTimer()
    }
  }
)

watch(
  () => settings.value.darkMode,
  () => {
    applyDarkMode()
  }
)

const latest = computed(() => (records.value.length ? records.value[0] : null))
const firstRecord = computed(() => (records.value.length ? records.value[records.value.length - 1] : null))
const oldestRecord = firstRecord
const todayDate = computed(() => getTodayDateString())
const selectedDateLabel = computed(() => {
  const suffix = form.value.date === todayDate.value ? '今日' : '選択中'
  return `${formatDateLabel(form.value.date)} (${suffix})`
})
const existingFormRecord = computed(() => records.value.find(record => record.date === form.value.date))
const weightPlaceholder = computed(() => {
  if (!latest.value) return '例: 64.2'
  if (settings.value.privateMode) return '前回の記録を参考に入力'
  return `前回 ${formatWeight(latest.value.weight)}`
})
const saveButtonText = computed(() => {
  if (existingFormRecord.value && form.value.date === todayDate.value) return '今日の記録を更新'
  if (existingFormRecord.value) return 'この日の記録を更新'
  return '保存する'
})
const showInstallPrompt = computed(() => (import.meta.env.DEV || deferredInstallPrompt.value) && !appInstalled.value)
const historyMonths = computed(() => {
  const months = []
  records.value.forEach(record => {
    const month = record.date.slice(0, 7)
    if (month && !months.includes(month)) months.push(month)
  })
  return months
})
const activeHistoryMonth = computed(() => {
  if (selectedHistoryMonth.value && historyMonths.value.includes(selectedHistoryMonth.value)) {
    return selectedHistoryMonth.value
  }
  return historyMonths.value[0] || ''
})
const historyMonthIndex = computed(() => historyMonths.value.indexOf(activeHistoryMonth.value))
const canGoOlderHistoryMonth = computed(() => historyMonthIndex.value >= 0 && historyMonthIndex.value < historyMonths.value.length - 1)
const canGoNewerHistoryMonth = computed(() => historyMonthIndex.value > 0)
const selectedHistoryMonthLabel = computed(() => formatMonthLabel(activeHistoryMonth.value))
const filteredHistoryRecords = computed(() => {
  if (!activeHistoryMonth.value) return []
  return records.value.filter(record => record.date.startsWith(activeHistoryMonth.value))
})
const trendRanges = [
  { key: '1w', label: '1W', days: 7 },
  { key: '1m', label: '1M', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'ALL', days: null }
]
const recordsSpanDays = computed(() => {
  if (!latest.value || !oldestRecord.value) return 0
  const latestDate = parseDateString(latest.value.date)
  const oldestDate = parseDateString(oldestRecord.value.date)
  return Math.floor((latestDate - oldestDate) / 86400000) + 1
})
const availableTrendRanges = computed(() => trendRanges.filter(range => isTrendRangeAvailable(range)))
const fallbackTrendRange = computed(() => availableTrendRanges.value.find(range => range.key === '1w') || availableTrendRanges.value[0] || trendRanges[0])
const activeTrendRangeKey = computed(() => {
  const selected = trendRanges.find(range => range.key === selectedTrendRange.value)
  if (selected && isTrendRangeAvailable(selected)) return selected.key
  return fallbackTrendRange.value.key
})
const filteredTrendRecords = computed(() => {
  const selected = trendRanges.find(range => range.key === activeTrendRangeKey.value)
  if (!selected || selected.days === null) return records.value

  const latestRecord = latest.value
  if (!latestRecord) return []

  const latestDate = parseDateString(latestRecord.date)
  const cutoff = new Date(latestDate)
  cutoff.setDate(latestDate.getDate() - selected.days + 1)

  return records.value.filter(record => parseDateString(record.date) >= cutoff)
})
const trendSummary = computed(() => {
  const list = filteredTrendRecords.value
  if (list.length < 2) {
    return {
      change: '—',
      count: `${list.length}件`,
      average: '—',
      low: '—'
    }
  }

  const newest = list[0]
  const oldest = list[list.length - 1]
  const diff = newest.weight - oldest.weight
  const sign = diff > 0 ? '+' : ''
  const average = list.reduce((sum, record) => sum + record.weight, 0) / list.length
  const low = Math.min(...list.map(record => record.weight))

  return {
    change: `${sign}${diff.toFixed(1)}kg`,
    count: `${list.length}件`,
    average: `${formatWeight(average)}kg`,
    low: `${formatWeight(low)}kg`
  }
})
const canRequestNotificationPermission = computed(() => notificationPermission.value === 'default')
const notificationStatusText = computed(() => {
  if (notificationPermission.value === 'granted') return '許可済み'
  if (notificationPermission.value === 'denied') return '拒否されています'
  if (notificationPermission.value === 'default') return '未許可'
  return 'このブラウザでは未対応です'
})
const notificationHelpText = computed(() => {
  if (notificationPermission.value === 'denied') {
    return 'ブラウザまたは端末の設定から通知を許可してください。'
  }
  if (notificationPermission.value === 'default') {
    return settings.value.time ? '通知を使う場合は許可してください。' : ''
  }
  return ''
})
const charaIcon = computed(() => {
  if (!latest.value || !settings.value.goal) return iconNormal
  if (latest.value.weight >= settings.value.goal + 2) return iconFat
  if (latest.value.weight < settings.value.goal) return iconSlim
  return iconNormal
})

const firstDayDiffText = computed(() => {
  if (!latest.value || !firstRecord.value) return '—'
  const diff = (latest.value.weight - firstRecord.value.weight).toFixed(1)
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff}kg`
})

const bmi = computed(() => {
  if (settings.value.privateMode) return '非公開'
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
  if (d < 0) return `目標まで あと ${Math.abs(d)}kg`
  return '目標達成です！おめでとうございます'
})

// expose to template
const recordsRef = records

// re-export for template usage
const recordsComputed = records

// helpers used in template
</script>
