<template>
  <div class="json-formatter-container">
    <!-- 左侧输入 -->
    <div class="left-panel">
      <div class="panel-header">
        <span class="panel-title">📥 输入</span>
        <div class="panel-actions">
          <el-button size="small" @click="triggerFileUpload">
            <template #icon><Upload /></template>
            上传文件
          </el-button>
          <el-button size="small" @click="handlePaste">
            <template #icon><DocumentCopy /></template>
            粘贴
          </el-button>
          <el-button size="small" @click="clearInput" :disabled="!inputText">清空</el-button>
        </div>
      </div>

      <el-input
        v-model="inputText"
        type="textarea"
        placeholder="粘贴 JSON 文本..."
        class="json-input"
        resize="none"
        @input="autoFormat"
      />

      <div class="input-footer">
        <span class="char-count">{{ inputText.length }} 字符</span>
        <div class="action-btns">
          <el-button type="primary" size="small" @click="format">
            <template #icon><MagicStick /></template>
            格式化
          </el-button>
          <el-button type="warning" size="small" @click="compress" :disabled="!inputText">
            压缩
          </el-button>
          <el-button size="small" @click="repair" :disabled="!inputText">
            修复
          </el-button>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="error-box">
        <el-icon><CircleClose /></el-icon>
        <span>{{ errorMsg }}</span>
      </div>
    </div>

    <!-- 右侧输出 -->
    <div class="right-panel">
      <div class="panel-header">
        <span class="panel-title">📤 结果</span>
        <div class="panel-actions">
          <el-select v-model="indentSize" size="small" style="width:90px" @change="format">
            <el-option label="2 空格" :value="2" />
            <el-option label="4 空格" :value="4" />
            <el-option label="Tab" :value="'tab'" />
          </el-select>
          <el-button size="small" @click="copyOutput" :disabled="!outputText">
            <template #icon><DocumentCopy /></template>
            复制
          </el-button>
          <el-button size="small" @click="downloadOutput" :disabled="!outputText">
            <template #icon><Download /></template>
            下载
          </el-button>
        </div>
      </div>

      <div class="output-area" ref="outputRef">
        <!-- 有错误时显示原始文本 -->
        <pre v-if="errorMsg" class="output-pre output-error">{{ inputText }}</pre>
        <!-- 树形视图 -->
        <div v-else-if="outputMode === 'tree' && parsedData !== null" class="tree-view">
          <JsonNode :data="parsedData" :depth="0" />
        </div>
        <!-- 文本视图 -->
        <pre v-else-if="outputText" class="output-pre" v-html="highlightedOutput"></pre>
        <div v-else class="output-placeholder">格式化结果将显示在这里</div>
      </div>

      <div class="output-footer">
        <el-radio-group v-model="outputMode" size="small">
          <el-radio-button value="text">文本</el-radio-button>
          <el-radio-button value="tree">树形</el-radio-button>
        </el-radio-group>
        <span v-if="outputText" class="output-stats">
          {{ outputStats.keys }} 个键 / {{ outputStats.lines }} 行
        </span>
      </div>
    </div>

    <input ref="fileInputRef" type="file" accept=".json,.txt" style="display:none" @change="handleFileUpload" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h, type VNode } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, DocumentCopy, Download, MagicStick, CircleClose } from '@element-plus/icons-vue'
import { useHistoryStore } from '@/stores/history'

const historyStore = useHistoryStore()

// ── 状态 ──
const inputText = ref('')
const outputText = ref('')
const parsedData = ref<unknown>(null)
const errorMsg = ref('')
const indentSize = ref<number | 'tab'>(2)
const outputMode = ref<'text' | 'tree'>('text')
const fileInputRef = ref<HTMLInputElement>()

// ── 格式化 ──
const format = () => {
  if (!inputText.value.trim()) {
    errorMsg.value = ''
    outputText.value = ''
    parsedData.value = null
    return
  }
  try {
    const parsed = JSON.parse(inputText.value)
    parsedData.value = parsed
    const indent = indentSize.value === 'tab' ? '\t' : indentSize.value
    outputText.value = JSON.stringify(parsed, null, indent)
    errorMsg.value = ''
    // 记录历史
    historyStore.addRecord('json', {
      title: `格式化：${inputText.value.slice(0, 40).replace(/\s+/g, ' ')}`,
      summary: outputText.value.slice(0, 80).replace(/\s+/g, ' '),
      data: { '输入': inputText.value, '格式化结果': outputText.value },
    })
  } catch (e: unknown) {
    errorMsg.value = (e as Error).message
    parsedData.value = null
    outputText.value = ''
  }
}

// 输入时自动尝试格式化（防止频繁触发用 debounce）
let autoTimer: ReturnType<typeof setTimeout>
const autoFormat = () => {
  clearTimeout(autoTimer)
  autoTimer = setTimeout(format, 400)
}

// ── 压缩 ──
const compress = () => {
  try {
    const parsed = JSON.parse(inputText.value)
    outputText.value = JSON.stringify(parsed)
    parsedData.value = parsed
    errorMsg.value = ''
  } catch (e: unknown) {
    errorMsg.value = (e as Error).message
  }
}

// ── 修复（去掉尾部逗号、单引号换双引号等常见问题） ──
const repair = () => {
  try {
    let text = inputText.value
    // 去掉尾部多余逗号
    text = text.replace(/,\s*([\]}])/g, '$1')
    // 单引号换双引号（简单场景）
    text = text.replace(/'/g, '"')
    // 去掉注释
    text = text.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
    const parsed = JSON.parse(text)
    parsedData.value = parsed
    const indent = indentSize.value === 'tab' ? '\t' : indentSize.value
    outputText.value = JSON.stringify(parsed, null, indent)
    inputText.value = text
    errorMsg.value = ''
    ElMessage.success('修复成功')
  } catch (e: unknown) {
    errorMsg.value = `修复失败：${(e as Error).message}`
  }
}

// ── 统计 ──
const outputStats = computed(() => {
  if (!outputText.value) return { keys: 0, lines: 0 }
  const lines = outputText.value.split('\n').length
  const keys = (outputText.value.match(/"[^"]+"\s*:/g) || []).length
  return { keys, lines }
})

// ── 语法高亮（文本视图） ──
const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const highlightedOutput = computed(() => {
  if (!outputText.value) return ''
  return escHtml(outputText.value).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number'
      if (/^"/.test(match)) {
        cls = match.endsWith(':') ? 'json-key' : 'json-string'
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean'
      } else if (/null/.test(match)) {
        cls = 'json-null'
      }
      return `<span class="${cls}">${match}</span>`
    }
  )
})

// ── 操作 ──
const clearInput = () => {
  inputText.value = ''
  outputText.value = ''
  parsedData.value = null
  errorMsg.value = ''
}

const copyOutput = async () => {
  try {
    await navigator.clipboard.writeText(outputText.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const handlePaste = async () => {
  try {
    const text = await navigator.clipboard.readText()
    inputText.value = text
    format()
  } catch {
    ElMessage.error('读取剪贴板失败，请手动粘贴')
  }
}

const downloadOutput = () => {
  const blob = new Blob([outputText.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'formatted.json'
  a.click()
  URL.revokeObjectURL(url)
}

const triggerFileUpload = () => fileInputRef.value?.click()

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    inputText.value = e.target?.result as string
    format()
  }
  reader.readAsText(file, 'UTF-8')
  ;(event.target as HTMLInputElement).value = ''
}

// ── 树形视图节点组件 ──
interface JsonNodeProps {
  data: unknown
  depth: number
  nodeKey: string
}

const JsonNode: ReturnType<typeof defineComponent> = defineComponent({
  name: 'JsonNode',
  props: {
    data: { required: true },
    depth: { type: Number, default: 0 },
    nodeKey: { type: String, default: '' },
  },
  setup(props: JsonNodeProps) {
    const expanded = ref(props.depth < 2)
    const toggle = () => { expanded.value = !expanded.value }

    return (): VNode => {
      const { data, depth, nodeKey } = props
      const indent = depth * 16

      const keyEl = nodeKey !== ''
        ? h('span', { class: 'tree-key' }, `"${nodeKey}": `)
        : null

      if (data === null) {
        return h('div', { class: 'tree-row', style: { paddingLeft: `${indent}px` } }, [
          keyEl,
          h('span', { class: 'tree-null' }, 'null'),
        ])
      }

      if (typeof data === 'boolean') {
        return h('div', { class: 'tree-row', style: { paddingLeft: `${indent}px` } }, [
          keyEl,
          h('span', { class: 'tree-boolean' }, String(data)),
        ])
      }

      if (typeof data === 'number') {
        return h('div', { class: 'tree-row', style: { paddingLeft: `${indent}px` } }, [
          keyEl,
          h('span', { class: 'tree-number' }, String(data)),
        ])
      }

      if (typeof data === 'string') {
        return h('div', { class: 'tree-row', style: { paddingLeft: `${indent}px` } }, [
          keyEl,
          h('span', { class: 'tree-string' }, `"${data}"`),
        ])
      }

      if (Array.isArray(data)) {
        const count = data.length
        return h('div', { class: 'tree-node' }, [
          h('div', { class: 'tree-row tree-collapsible', style: { paddingLeft: `${indent}px` }, onClick: toggle }, [
            h('span', { class: 'tree-toggle' }, expanded.value ? '▾' : '▸'),
            keyEl,
            h('span', { class: 'tree-bracket' }, '['),
            !expanded.value ? h('span', { class: 'tree-summary' }, ` ${count} items `) : null,
            !expanded.value ? h('span', { class: 'tree-bracket' }, ']') : null,
          ]),
          expanded.value ? [
            ...data.map((item, i) =>
              h(JsonNode, { data: item, depth: depth + 1, nodeKey: String(i) })
            ),
            h('div', { class: 'tree-row', style: { paddingLeft: `${indent}px` } }, [
              h('span', { class: 'tree-bracket' }, ']'),
            ]),
          ] : null,
        ])
      }

      if (typeof data === 'object') {
        const keys = Object.keys(data as object)
        return h('div', { class: 'tree-node' }, [
          h('div', { class: 'tree-row tree-collapsible', style: { paddingLeft: `${indent}px` }, onClick: toggle }, [
            h('span', { class: 'tree-toggle' }, expanded.value ? '▾' : '▸'),
            keyEl,
            h('span', { class: 'tree-bracket' }, '{'),
            !expanded.value ? h('span', { class: 'tree-summary' }, ` ${keys.length} keys `) : null,
            !expanded.value ? h('span', { class: 'tree-bracket' }, '}') : null,
          ]),
          expanded.value ? [
            ...keys.map(k =>
              h(JsonNode, { data: (data as Record<string, unknown>)[k], depth: depth + 1, nodeKey: k })
            ),
            h('div', { class: 'tree-row', style: { paddingLeft: `${indent}px` } }, [
              h('span', { class: 'tree-bracket' }, '}'),
            ]),
          ] : null,
        ])
      }

      return h('div', String(data))
    }
  },
})
</script>

<style scoped lang="scss">
.json-formatter-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  height: 100%;
  overflow: hidden;
}

/* ── 通用面板 ── */
.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-card);
  border-radius: 8px;
  padding: 12px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  min-height: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.panel-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}

.panel-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

/* ── 输入区 ── */
.json-input {
  flex: 1;
  min-height: 0;

  :deep(.el-textarea__inner) {
    height: 100% !important;
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

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.action-btns { display: flex; gap: 6px; }

.char-count {
  font-size: 11px;
  color: var(--text-muted);
}

.error-box {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  background: #fff0f0;
  border: 1px solid #ffcdd2;
  border-radius: 6px;
  color: #c62828;
  font-size: 12px;
  font-family: 'Monaco', 'Courier New', monospace;
  flex-shrink: 0;
  word-break: break-all;
}

/* ── 输出区（强制亮色） ── */
.output-area {
  flex: 1;
  min-height: 0;
  background: #fafafa;
  border: 2px solid #e4e7ed;
  border-radius: 6px;
  overflow: auto;

  &::-webkit-scrollbar { width: 6px; height: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.18); border-radius: 3px; }
}

.output-pre {
  margin: 0;
  padding: 10px 14px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre;
  color: #303133;
  background: transparent;

  &.output-error { color: #c62828; }
}

.output-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #bbb;
  font-size: 13px;
}

.output-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.output-stats {
  font-size: 11px;
  color: var(--text-muted);
}

/* ── JSON 语法高亮 ── */
:deep(.json-key)     { color: #9b1c1c; font-weight: 600; }
:deep(.json-string)  { color: #166534; }
:deep(.json-number)  { color: #1e40af; }
:deep(.json-boolean) { color: #7c3aed; font-weight: 600; }
:deep(.json-null)    { color: #92400e; font-weight: 600; }

/* ── 树形视图 ── */
.tree-view {
  padding: 8px 0;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.8;
  color: #303133;
}

:deep(.tree-row) {
  padding: 1px 12px;
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
}

:deep(.tree-collapsible) {
  cursor: pointer;
  user-select: none;
  &:hover { background: rgba(102, 126, 234, 0.06); }
}

:deep(.tree-toggle) {
  color: #667eea;
  font-size: 10px;
  width: 12px;
  flex-shrink: 0;
}

:deep(.tree-key)     { color: #9b1c1c; font-weight: 600; }
:deep(.tree-string)  { color: #166534; }
:deep(.tree-number)  { color: #1e40af; }
:deep(.tree-boolean) { color: #7c3aed; font-weight: 600; }
:deep(.tree-null)    { color: #92400e; font-weight: 600; }
:deep(.tree-bracket) { color: #555; font-weight: 600; }
:deep(.tree-summary) { color: #888; font-style: italic; }
</style>
