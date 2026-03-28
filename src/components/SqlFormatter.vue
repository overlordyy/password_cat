<template>
  <div class="sql-container">
    <!-- 左侧：输入区 -->
    <div class="left-panel">

      <!-- SQL 输入 -->
      <div class="input-card">
        <div class="card-header">
          <span class="card-title">📝 SQL 语句</span>
          <div class="panel-actions">
            <el-select v-model="dialect" size="small" style="width:120px">
              <el-option label="Standard SQL" value="sql" />
              <el-option label="MySQL" value="mysql" />
              <el-option label="PostgreSQL" value="postgresql" />
              <el-option label="BigQuery" value="bigquery" />
              <el-option label="SQLite" value="sqlite" />
            </el-select>
            <el-button size="small" @click="clearAll">清空</el-button>
          </div>
        </div>
        <el-input
          v-model="sqlInput"
          type="textarea"
          :rows="6"
          placeholder="粘贴 SQL 语句，支持 ?, $1, :name, #{name} 等占位符..."
          class="mono-input"
          resize="none"
          @input="detectPlaceholders"
        />
        <div class="card-footer">
          <span class="hint-text">
            检测到占位符：
            <el-tag v-for="ph in placeholderSummary" :key="ph" size="small" style="margin-right:4px">{{ ph }}</el-tag>
            <span v-if="placeholderSummary.length === 0" style="color:var(--text-muted)">无</span>
          </span>
          <span class="char-count">{{ sqlInput.length }} 字符</span>
        </div>
      </div>

      <!-- 参数输入 -->
      <div class="input-card">
        <div class="card-header">
          <span class="card-title">🔢 参数值</span>
          <div class="panel-actions">
            <el-tooltip content="? 和 $1/$2 按顺序每行一个值；:name 和 #{name} 用 name=value 格式" placement="top">
              <el-button size="small" text>
                <el-icon><QuestionFilled /></el-icon>
                格式说明
              </el-button>
            </el-tooltip>
            <el-button size="small" @click="paramsInput = ''">清空</el-button>
          </div>
        </div>

        <!-- 动态参数输入区 -->
        <div v-if="paramMode === 'positional'" class="params-list">
          <div
            v-for="(_param, idx) in positionalParams"
            :key="idx"
            class="param-row"
          >
            <span class="param-label">
              {{ getPlaceholderLabel(idx) }}
            </span>
            <el-input
              v-model="positionalParams[idx]"
              :placeholder="`第 ${idx + 1} 个参数值`"
              size="small"
              class="param-input"
              clearable
              @input="autoFormat"
            />
          </div>
          <div v-if="positionalParams.length === 0" class="no-params">
            SQL 中未检测到 ? 或 $1 类型的占位符
          </div>
        </div>

        <div v-else class="params-list">
          <div
            v-for="name in namedParamKeys"
            :key="name"
            class="param-row"
          >
            <span class="param-label named">{{ getNamedLabel(name) }}</span>
            <el-input
              v-model="namedParams[name]"
              :placeholder="`${name} 的值`"
              size="small"
              class="param-input"
              clearable
              @input="autoFormat"
            />
          </div>
          <div v-if="namedParamKeys.length === 0" class="no-params">
            SQL 中未检测到 :name 或 #{name} 类型的占位符
          </div>
        </div>

        <!-- 也支持直接粘贴文本格式 -->
        <el-collapse v-model="showRawInput" style="margin-top:8px">
          <el-collapse-item title="或者直接粘贴参数文本" name="raw">
            <el-input
              v-model="paramsInput"
              type="textarea"
              :rows="3"
              :placeholder="paramMode === 'positional'
                ? '每行一个值，按占位符顺序：\nvalue1\nvalue2\nvalue3'
                : '每行 key=value 格式：\nuserId=123\nstatus=active'"
              class="mono-input"
              resize="none"
              @input="parseRawParams"
            />
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 操作按钮 -->
      <div class="action-card">
        <el-button type="primary" size="large" @click="format" :disabled="!sqlInput.trim()">
          <template #icon><MagicStick /></template>
          格式化 SQL
        </el-button>
        <div class="format-options">
          <el-checkbox v-model="replaceParams" size="small">替换占位符</el-checkbox>
          <el-checkbox v-model="uppercase" size="small" @change="format">关键字大写</el-checkbox>
          <el-select v-model="indentStyle" size="small" style="width:100px" @change="format">
            <el-option label="2 空格" value="2" />
            <el-option label="4 空格" value="4" />
            <el-option label="Tab" value="tab" />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 右侧：结果 -->
    <div class="right-panel">
      <div class="result-card">
        <div class="card-header">
          <span class="card-title">✅ 格式化结果</span>
          <div class="panel-actions">
            <el-button size="small" @click="copyResult" :disabled="!result">
              <template #icon><DocumentCopy /></template>
              复制
            </el-button>
            <el-button size="small" @click="downloadResult" :disabled="!result">
              <template #icon><Download /></template>
              下载
            </el-button>
          </div>
        </div>

        <div class="result-area" ref="resultAreaRef">
          <pre v-if="result" class="result-pre" v-html="highlightedResult"></pre>
          <div v-else-if="errorMsg" class="error-box">
            <el-icon><CircleClose /></el-icon>
            {{ errorMsg }}
          </div>
          <div v-else class="result-placeholder">
            格式化结果将显示在这里
          </div>
        </div>

        <!-- 统计信息 -->
        <div v-if="result" class="result-footer">
          <span class="stat-item">{{ lineCount }} 行</span>
          <span class="stat-item">{{ result.length }} 字符</span>
          <span v-if="replacedCount > 0" class="stat-item replaced">
            已替换 {{ replacedCount }} 个占位符
          </span>
          <span v-if="unreplacedCount > 0" class="stat-item warn">
            {{ unreplacedCount }} 个未填写
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { format as sqlFormat } from 'sql-formatter'
import { ElMessage } from 'element-plus'
import { MagicStick, DocumentCopy, Download, QuestionFilled, CircleClose } from '@element-plus/icons-vue'

// ── 状态 ──
const sqlInput = ref('')
const paramsInput = ref('')
const result = ref('')
const errorMsg = ref('')
const dialect = ref('sql')
const uppercase = ref(true)
const replaceParams = ref(true)
const indentStyle = ref('2')
const showRawInput = ref<string[]>([])

// 参数模式：positional（? / $1）或 named（:name / #{name}）
const paramMode = ref<'positional' | 'named'>('positional')
const positionalParams = ref<string[]>([])
const namedParams = reactive<Record<string, string>>({})
const namedParamKeys = ref<string[]>([])

const replacedCount = ref(0)
const unreplacedCount = ref(0)

// ── 解析占位符 ──
const placeholderSummary = ref<string[]>([])

const detectPlaceholders = () => {
  const sql = sqlInput.value
  if (!sql) {
    placeholderSummary.value = []
    paramMode.value = 'positional'
    positionalParams.value = []
    return
  }

  // 检测命名参数 :name 和 #{name}
  const namedMatches = [...sql.matchAll(/#\{(\w+)\}|:(\w+)/g)]
  const positionalMatches = [...sql.matchAll(/\?|\$\d+/g)]

  if (namedMatches.length > 0) {
    paramMode.value = 'named'
    // 去重并保留顺序
    const keys = [...new Set(namedMatches.map(m => m[1] || m[2]))]
    namedParamKeys.value = keys
    keys.forEach(k => { if (!(k in namedParams)) namedParams[k] = '' })
    // 清理已不存在的 key
    Object.keys(namedParams).forEach(k => { if (!keys.includes(k)) delete namedParams[k] })
    placeholderSummary.value = keys.map(k =>
      sql.includes(`#{${k}}`) ? `#{${k}}` : `:${k}`
    )
  } else if (positionalMatches.length > 0) {
    paramMode.value = 'positional'
    const count = positionalMatches.length
    // 保留已有的值，补全长度
    while (positionalParams.value.length < count) positionalParams.value.push('')
    positionalParams.value.length = count
    placeholderSummary.value = [...new Set(positionalMatches.map(m => m[0]))]
  } else {
    paramMode.value = 'positional'
    positionalParams.value = []
    placeholderSummary.value = []
  }
}

const getPlaceholderLabel = (idx: number) => {
  const sql = sqlInput.value
  const positionalMatches = [...sql.matchAll(/\?|\$(\d+)/g)]
  const match = positionalMatches[idx]
  if (!match) return `?${idx + 1}`
  return match[0]
}

const getNamedLabel = (name: string) => {
  const sql = sqlInput.value
  return sql.includes(`#{${name}}`) ? `#{${name}}` : `:${name}`
}

// 解析原始文本输入的参数
const parseRawParams = () => {
  const lines = paramsInput.value.split('\n').map(l => l.trim()).filter(Boolean)
  if (paramMode.value === 'positional') {
    positionalParams.value = lines.slice(0, positionalParams.value.length)
    while (positionalParams.value.length < (sqlInput.value.match(/\?|\$\d+/g) || []).length) {
      positionalParams.value.push('')
    }
  } else {
    lines.forEach(line => {
      const eqIdx = line.indexOf('=')
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim()
        const val = line.slice(eqIdx + 1).trim()
        if (namedParamKeys.value.includes(key)) namedParams[key] = val
      }
    })
  }
  autoFormat()
}

// ── 格式化 ──
let autoTimer: ReturnType<typeof setTimeout>
const autoFormat = () => {
  clearTimeout(autoTimer)
  autoTimer = setTimeout(() => { if (result.value) format() }, 300)
}

const format = () => {
  const sql = sqlInput.value.trim()
  if (!sql) { result.value = ''; errorMsg.value = ''; return }

  try {
    // 1. 先替换占位符
    let processedSql = sql
    replacedCount.value = 0
    unreplacedCount.value = 0

    if (replaceParams.value) {
      if (paramMode.value === 'positional') {
        let idx = 0
        processedSql = sql.replace(/\$\d+|\?/g, (match) => {
          const val = positionalParams.value[idx] ?? ''
          idx++
          if (val !== '') {
            replacedCount.value++
            return formatParamValue(val)
          } else {
            unreplacedCount.value++
            return match
          }
        })
      } else {
        processedSql = sql.replace(/#\{(\w+)\}|:(\w+)/g, (match, n1, n2) => {
          const name = n1 || n2
          const val = namedParams[name] ?? ''
          if (val !== '') {
            replacedCount.value++
            return formatParamValue(val)
          } else {
            unreplacedCount.value++
            return match
          }
        })
      }
    }

    // 2. 格式化 SQL

    result.value = sqlFormat(processedSql, {
      language: dialect.value as 'sql' | 'mysql' | 'postgresql' | 'bigquery' | 'sqlite',
      tabWidth: indentStyle.value === 'tab' ? 1 : Number(indentStyle.value),
      useTabs: indentStyle.value === 'tab',
      keywordCase: uppercase.value ? 'upper' : 'lower',
      indentStyle: 'standard',
    })

    errorMsg.value = ''
  } catch (e) {
    errorMsg.value = `格式化失败：${(e as Error).message}`
    result.value = ''
  }
}

// 参数值格式化：字符串加引号，数字/null/布尔不加
const formatParamValue = (val: string): string => {
  const trimmed = val.trim()
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed
  if (/^(true|false|null)$/i.test(trimmed)) return trimmed.toLowerCase()
  // 字符串：加单引号，转义内部单引号
  return `'${trimmed.replace(/'/g, "''")}'`
}

// ── 统计 ──
const lineCount = computed(() => result.value ? result.value.split('\n').length : 0)

// ── SQL 语法高亮 ──
const keywords = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|AS|CASE|WHEN|THEN|ELSE|END|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|DROP|ALTER|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|WITH|COALESCE|COUNT|SUM|AVG|MAX|MIN|CAST|OVER|PARTITION|ROW_NUMBER|RANK|ASC|DESC)\b/gi

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const highlightedResult = computed(() => {
  if (!result.value) return ''
  return escHtml(result.value)
    // 高亮关键字
    .replace(keywords, '<span class="sql-keyword">$&</span>')
    // 高亮字符串
    .replace(/'([^']*)'/g, "<span class=\"sql-string\">'$1'</span>")
    // 高亮数字
    .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="sql-number">$1</span>')
    // 高亮注释
    .replace(/(--[^\n]*)/g, '<span class="sql-comment">$1</span>')
    // 高亮未替换的占位符
    .replace(/(\?|\$\d+|:\w+|#\{\w+\})/g, '<span class="sql-placeholder">$1</span>')
})

// ── 操作 ──
const clearAll = () => {
  sqlInput.value = ''
  paramsInput.value = ''
  result.value = ''
  errorMsg.value = ''
  positionalParams.value = []
  namedParamKeys.value.forEach(k => delete namedParams[k])
  namedParamKeys.value = []
  placeholderSummary.value = []
  replacedCount.value = 0
  unreplacedCount.value = 0
}

const copyResult = async () => {
  try { await navigator.clipboard.writeText(result.value); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}

const downloadResult = () => {
  const blob = new Blob([result.value], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'formatted.sql'
  a.click()
}
</script>

<style scoped lang="scss">
.sql-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  height: 100%;
  overflow: hidden;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 4px;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
}

.right-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.input-card, .action-card, .result-card {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 12px;
  box-shadow: var(--shadow-card);
  flex-shrink: 0;
}

.result-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.card-title { font-weight: 600; font-size: 13px; color: var(--text-primary); }
.panel-actions { display: flex; gap: 6px; align-items: center; }

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}

.hint-text { font-size: 11px; color: var(--text-muted); }
.char-count { font-size: 11px; color: var(--text-muted); }

.mono-input {
  :deep(.el-textarea__inner) {
    background: var(--bg-input);
    border: 2px solid var(--border-color);
    color: var(--text-primary);
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.6;
    resize: none;
    &:focus { border-color: #667eea; }
  }
}

/* 参数列表 */
.params-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 2px; }
}

.param-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.param-label {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 11px;
  color: #667eea;
  background: rgba(102,126,234,0.1);
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  min-width: 60px;
  text-align: center;
  white-space: nowrap;

  &.named {
    color: #e67e22;
    background: rgba(230,126,34,0.1);
  }
}

.param-input { flex: 1; }

.no-params {
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px 0;
  text-align: center;
}

/* 操作栏 */
.action-card {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.format-options {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* 结果区（强制亮色） */
.result-area {
  flex: 1;
  min-height: 0;
  background: #fafafa;
  border: 2px solid #e4e7ed;
  border-radius: 6px;
  overflow: auto;
  &::-webkit-scrollbar { width: 6px; height: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.18); border-radius: 3px; }
}

.result-pre {
  margin: 0;
  padding: 12px 16px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.8;
  white-space: pre;
  color: #303133;
  background: transparent;
}

.result-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #bbb;
  font-size: 13px;
}

.error-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: #c62828;
  font-size: 12px;
  font-family: 'Monaco', 'Courier New', monospace;
}

.result-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  flex-shrink: 0;
}

.stat-item {
  font-size: 11px;
  color: var(--text-muted);
  &.replaced { color: #27ae60; font-weight: 600; }
  &.warn { color: #e67e22; font-weight: 600; }
}

/* SQL 语法高亮 */
:deep(.sql-keyword) { color: #9b1c1c; font-weight: 700; }
:deep(.sql-string)  { color: #166534; }
:deep(.sql-number)  { color: #1e40af; }
:deep(.sql-comment) { color: #6b7280; font-style: italic; }
:deep(.sql-placeholder) {
  color: #d97706;
  background: rgba(217,119,6,0.1);
  border-radius: 2px;
  padding: 0 2px;
  font-weight: 600;
}
</style>
