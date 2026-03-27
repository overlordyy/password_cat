<template>
  <div class="timestamp-container">
    <!-- 当前时间 -->
    <div class="current-time-card">
      <div class="card-header">
        <span class="card-title">🕐 当前时间</span>
        <el-button size="small" @click="copyCurrentTs">
          <template #icon><DocumentCopy /></template>复制时间戳
        </el-button>
      </div>
      <div class="current-time-grid">
        <div class="time-item">
          <div class="time-label">Unix 时间戳（秒）</div>
          <div class="time-value">{{ currentTs }}</div>
        </div>
        <div class="time-item">
          <div class="time-label">Unix 时间戳（毫秒）</div>
          <div class="time-value">{{ currentTsMs }}</div>
        </div>
        <div class="time-item">
          <div class="time-label">本地时间</div>
          <div class="time-value">{{ currentLocal }}</div>
        </div>
        <div class="time-item">
          <div class="time-label">UTC 时间</div>
          <div class="time-value">{{ currentUTC }}</div>
        </div>
        <div class="time-item">
          <div class="time-label">ISO 8601</div>
          <div class="time-value">{{ currentISO }}</div>
        </div>
        <div class="time-item">
          <div class="time-label">星期</div>
          <div class="time-value">{{ currentWeekday }}</div>
        </div>
      </div>
    </div>

    <div class="converter-row">
      <!-- 时间戳 → 日期 -->
      <div class="converter-card">
        <div class="card-header">
          <span class="card-title">🔢 时间戳 → 日期</span>
        </div>
        <div class="converter-body">
          <div class="input-group">
            <el-input
              v-model="tsInput"
              placeholder="输入时间戳（秒或毫秒）"
              class="mono-input"
              clearable
              @input="tsToDate"
            >
              <template #append>
                <el-button @click="tsInput = String(Date.now()); tsToDate()">Now</el-button>
              </template>
            </el-input>
          </div>

          <div v-if="tsResult" class="result-grid">
            <div v-for="item in tsResult" :key="item.label" class="result-item" @click="copyText(item.value)">
              <div class="result-label">{{ item.label }}</div>
              <div class="result-value">{{ item.value }}</div>
            </div>
          </div>
          <div v-else-if="tsError" class="error-text">{{ tsError }}</div>
        </div>
      </div>

      <!-- 日期 → 时间戳 -->
      <div class="converter-card">
        <div class="card-header">
          <span class="card-title">📅 日期 → 时间戳</span>
        </div>
        <div class="converter-body">
          <div class="input-group">
            <el-input
              v-model="dateInput"
              placeholder="2024-01-01 12:00:00 或 ISO 格式"
              class="mono-input"
              clearable
              @input="dateToTs"
            >
              <template #append>
                <el-button @click="dateInput = formatDateForInput(new Date()); dateToTs()">Now</el-button>
              </template>
            </el-input>
          </div>

          <div v-if="dateResult" class="result-grid">
            <div v-for="item in dateResult" :key="item.label" class="result-item" @click="copyText(item.value)">
              <div class="result-label">{{ item.label }}</div>
              <div class="result-value">{{ item.value }}</div>
            </div>
          </div>
          <div v-else-if="dateError" class="error-text">{{ dateError }}</div>
        </div>
      </div>
    </div>

    <!-- 时区对比 -->
    <div class="timezone-card">
      <div class="card-header">
        <span class="card-title">🌏 主要时区对比</span>
      </div>
      <div class="timezone-grid">
        <div v-for="tz in timezones" :key="tz.zone" class="tz-item">
          <div class="tz-label">{{ tz.name }}</div>
          <div class="tz-value">{{ formatInTz(now, tz.zone) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentCopy } from '@element-plus/icons-vue'

const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(timer))

const pad = (n: number) => String(n).padStart(2, '0')
const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const currentTs = ref(0)
const currentTsMs = ref(0)
const currentLocal = ref('')
const currentUTC = ref('')
const currentISO = ref('')
const currentWeekday = ref('')

import { watchEffect } from 'vue'
watchEffect(() => {
  const d = now.value
  currentTs.value = Math.floor(d.getTime() / 1000)
  currentTsMs.value = d.getTime()
  currentLocal.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  currentUTC.value = `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
  currentISO.value = d.toISOString()
  currentWeekday.value = weekdays[d.getDay()]
})

const copyCurrentTs = async () => {
  await navigator.clipboard.writeText(String(currentTs.value))
  ElMessage.success('时间戳已复制')
}

// 时间戳 → 日期
const tsInput = ref('')
const tsResult = ref<{ label: string; value: string }[] | null>(null)
const tsError = ref('')

const tsToDate = () => {
  if (!tsInput.value.trim()) { tsResult.value = null; tsError.value = ''; return }
  try {
    let ts = Number(tsInput.value.trim())
    if (isNaN(ts)) throw new Error('不是有效数字')
    // 自动判断秒/毫秒
    if (ts < 1e10) ts *= 1000
    const d = new Date(ts)
    if (isNaN(d.getTime())) throw new Error('无效时间戳')
    tsResult.value = [
      { label: '本地时间', value: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` },
      { label: 'UTC 时间', value: `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC` },
      { label: 'ISO 8601', value: d.toISOString() },
      { label: '星期', value: weekdays[d.getDay()] },
      { label: '时间戳（秒）', value: String(Math.floor(ts / 1000)) },
      { label: '时间戳（毫秒）', value: String(ts) },
    ]
    tsError.value = ''
  } catch (e) {
    tsError.value = (e as Error).message
    tsResult.value = null
  }
}

// 日期 → 时间戳
const dateInput = ref('')
const dateResult = ref<{ label: string; value: string }[] | null>(null)
const dateError = ref('')

const formatDateForInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

const dateToTs = () => {
  if (!dateInput.value.trim()) { dateResult.value = null; dateError.value = ''; return }
  try {
    const input = dateInput.value.trim().replace(' ', 'T')
    const d = new Date(input)
    if (isNaN(d.getTime())) throw new Error('无法解析日期，请尝试格式：2024-01-01 12:00:00')
    dateResult.value = [
      { label: '时间戳（秒）', value: String(Math.floor(d.getTime() / 1000)) },
      { label: '时间戳（毫秒）', value: String(d.getTime()) },
      { label: 'ISO 8601', value: d.toISOString() },
      { label: '本地时间', value: formatDateForInput(d) },
    ]
    dateError.value = ''
  } catch (e) {
    dateError.value = (e as Error).message
    dateResult.value = null
  }
}

// 时区
const timezones = [
  { name: '北京 (UTC+8)', zone: 'Asia/Shanghai' },
  { name: '东京 (UTC+9)', zone: 'Asia/Tokyo' },
  { name: '伦敦 (UTC+0/+1)', zone: 'Europe/London' },
  { name: '纽约 (UTC-5/-4)', zone: 'America/New_York' },
  { name: '洛杉矶 (UTC-8/-7)', zone: 'America/Los_Angeles' },
  { name: '迪拜 (UTC+4)', zone: 'Asia/Dubai' },
  { name: '悉尼 (UTC+10/+11)', zone: 'Australia/Sydney' },
  { name: 'UTC', zone: 'UTC' },
]

const formatInTz = (d: Date, zone: string) => {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: zone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).format(d)
  } catch { return '-' }
}

const copyText = async (text: string) => {
  await navigator.clipboard.writeText(text)
  ElMessage.success('已复制')
}
</script>

<style scoped lang="scss">
.timestamp-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow-y: auto;
  padding-right: 4px;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
}

.current-time-card,
.converter-card,
.timezone-card {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 14px;
  box-shadow: var(--shadow-card);
  flex-shrink: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title { font-weight: 600; font-size: 13px; color: var(--text-primary); }

.current-time-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.time-item {
  background: var(--bg-input);
  border-radius: 6px;
  padding: 10px 12px;
}

.time-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.time-value {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.converter-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex-shrink: 0;
}

.converter-body { display: flex; flex-direction: column; gap: 10px; }

.input-group { display: flex; gap: 8px; }

.mono-input {
  :deep(.el-input__inner) {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 12px;
  }
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.result-item {
  background: var(--bg-input);
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: rgba(102, 126, 234, 0.12); }
}

.result-label { font-size: 11px; color: var(--text-muted); margin-bottom: 2px; }
.result-value {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-primary);
  word-break: break-all;
}

.error-text { font-size: 12px; color: #f56c6c; }

.timezone-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.tz-item {
  background: var(--bg-input);
  border-radius: 6px;
  padding: 8px 10px;
}

.tz-label { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.tz-value {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-primary);
}
</style>
