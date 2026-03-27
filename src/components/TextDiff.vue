<template>
  <div class="text-diff-container">
    <!-- 输入区域 -->
    <div class="input-section">
      <div class="input-panel">
        <div class="panel-header">
          <span class="panel-title">📄 原始文本</span>
          <div class="panel-actions">
            <el-button size="small" @click="triggerFileUpload('left')">
              <template #icon><Upload /></template>
              上传文件
            </el-button>
            <el-button size="small" @click="clearLeft" :disabled="!leftText">清空</el-button>
          </div>
        </div>
        <el-input
          v-model="leftText"
          type="textarea"
          :rows="5"
          placeholder="粘贴原始文本，或点击上传文件..."
          class="text-input"
          resize="none"
        />
        <div class="char-count">{{ leftText.length }} 字符 / {{ leftLineCount }} 行</div>
      </div>

      <div class="input-panel">
        <div class="panel-header">
          <span class="panel-title">📝 对比文本</span>
          <div class="panel-actions">
            <el-button size="small" @click="triggerFileUpload('right')">
              <template #icon><Upload /></template>
              上传文件
            </el-button>
            <el-button size="small" @click="clearRight" :disabled="!rightText">清空</el-button>
          </div>
        </div>
        <el-input
          v-model="rightText"
          type="textarea"
          :rows="5"
          placeholder="粘贴对比文本，或点击上传文件..."
          class="text-input"
          resize="none"
        />
        <div class="char-count">{{ rightText.length }} 字符 / {{ rightLineCount }} 行</div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" @click="runDiff" :disabled="!leftText && !rightText">
        <template #icon><Search /></template>
        开始对比
      </el-button>

      <template v-if="hasCompared">
        <el-divider direction="vertical" />
        <el-switch v-model="onlyShowDiff" active-text="仅差异行" inactive-text="全文" size="small" />
        <el-radio-group v-model="diffMode" size="small" @change="runDiff">
          <el-radio-button value="word">字符级</el-radio-button>
          <el-radio-button value="line">行级</el-radio-button>
        </el-radio-group>
        <div class="diff-stats">
          <el-tag type="danger" size="small">- 删除 {{ removedCount }}</el-tag>
          <el-tag type="success" size="small">+ 新增 {{ addedCount }}</el-tag>
          <el-tag type="info" size="small">= 相同 {{ unchangedCount }}</el-tag>
        </div>
        <el-button size="small" @click="copyDiffText" style="margin-left:auto">
          <template #icon><DocumentCopy /></template>
          复制结果
        </el-button>
      </template>
    </div>

    <!-- 对比结果：左右分栏 -->
    <div v-if="hasCompared" class="diff-result">
      <div v-if="sidePairs.length === 0" class="no-diff">
        <span class="no-diff-icon">✅</span>
        <span>两段文本完全相同，没有差异！</span>
      </div>

      <template v-else>
        <!-- 表头 -->
        <div class="diff-table-header">
          <div class="side-header left-header">
            <span class="ln-col"></span>
            <span class="content-col">原始文本</span>
          </div>
          <div class="side-divider"></div>
          <div class="side-header right-header">
            <span class="ln-col"></span>
            <span class="content-col">对比文本</span>
          </div>
        </div>

        <!-- 行内容 -->
        <div class="diff-table-body">
          <div
            v-for="(pair, idx) in visiblePairs"
            :key="idx"
            class="diff-row"
          >
            <!-- 左侧 -->
            <div
              class="diff-cell"
              :class="{
                'cell-removed': pair.left.type === 'removed',
                'cell-unchanged': pair.left.type === 'unchanged',
                'cell-empty': pair.left.type === 'empty',
              }"
            >
              <span class="line-num">{{ pair.left.lineNum }}</span>
              <span class="cell-content" v-html="pair.left.html"></span>
            </div>

            <div class="row-divider"></div>

            <!-- 右侧 -->
            <div
              class="diff-cell"
              :class="{
                'cell-added': pair.right.type === 'added',
                'cell-unchanged': pair.right.type === 'unchanged',
                'cell-empty': pair.right.type === 'empty',
              }"
            >
              <span class="line-num">{{ pair.right.lineNum }}</span>
              <span class="cell-content" v-html="pair.right.html"></span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 隐藏文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".txt,.md,.log,.csv,.json,.xml,.html,.css,.js,.ts,.py,.java,.go,.rs,.cpp,.c,.h,.yaml,.yml,.toml,.ini,.cfg,.conf,.sh,.bat"
      style="display:none"
      @change="handleFileUpload"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import * as Diff from 'diff'
import { ElMessage } from 'element-plus'
import { Upload, Search, DocumentCopy } from '@element-plus/icons-vue'

const leftText = ref('')
const rightText = ref('')
const diffMode = ref<'line' | 'word'>('word')
const onlyShowDiff = ref(false)
const hasCompared = ref(false)
const fileInputRef = ref<HTMLInputElement>()
const currentUploadTarget = ref<'left' | 'right'>('left')

interface SideCell {
  type: 'removed' | 'added' | 'unchanged' | 'empty'
  lineNum: string
  html: string
  rawContent: string
}

interface SidePair {
  left: SideCell
  right: SideCell
  hasDiff: boolean
}

const sidePairs = ref<SidePair[]>([])

const leftLineCount = computed(() => leftText.value ? leftText.value.split('\n').length : 0)
const rightLineCount = computed(() => rightText.value ? rightText.value.split('\n').length : 0)

const removedCount = computed(() => sidePairs.value.filter(p => p.left.type === 'removed').length)
const addedCount = computed(() => sidePairs.value.filter(p => p.right.type === 'added').length)
const unchangedCount = computed(() => sidePairs.value.filter(p => p.left.type === 'unchanged').length)

const visiblePairs = computed(() => {
  if (!onlyShowDiff.value) return sidePairs.value
  const diffSet = new Set<number>()
  sidePairs.value.forEach((pair, i) => {
    if (pair.hasDiff) {
      for (let j = Math.max(0, i - 2); j <= Math.min(sidePairs.value.length - 1, i + 2); j++) {
        diffSet.add(j)
      }
    }
  })
  return sidePairs.value.filter((_, i) => diffSet.has(i))
})

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const emptyCell = (): SideCell => ({ type: 'empty', lineNum: '', html: '', rawContent: '' })

const charDiffHtml = (oldStr: string, newStr: string): [string, string] => {
  const parts = Diff.diffChars(oldStr, newStr)
  let oldHtml = ''
  let newHtml = ''
  parts.forEach(p => {
    const escaped = escHtml(p.value)
    if (p.removed) {
      oldHtml += `<mark class="char-removed">${escaped}</mark>`
    } else if (p.added) {
      newHtml += `<mark class="char-added">${escaped}</mark>`
    } else {
      oldHtml += escaped
      newHtml += escaped
    }
  })
  return [oldHtml, newHtml]
}

const runDiff = () => {
  const changes = Diff.diffLines(leftText.value, rightText.value, { newlineIsToken: false })

  // 先展平成 raw 行
  const rawLines: Array<{ type: 'removed' | 'added' | 'unchanged'; content: string }> = []
  changes.forEach(change => {
    const lines = change.value.split('\n')
    if (lines[lines.length - 1] === '') lines.pop()
    const type = change.added ? 'added' : change.removed ? 'removed' : 'unchanged'
    lines.forEach(l => rawLines.push({ type, content: l }))
  })

  const pairs: SidePair[] = []
  let leftNum = 1
  let rightNum = 1
  let i = 0

  while (i < rawLines.length) {
    const cur = rawLines[i]

    if (cur.type === 'unchanged') {
      pairs.push({
        left:  { type: 'unchanged', lineNum: `${leftNum++}`,  html: escHtml(cur.content), rawContent: cur.content },
        right: { type: 'unchanged', lineNum: `${rightNum++}`, html: escHtml(cur.content), rawContent: cur.content },
        hasDiff: false,
      })
      i++
      continue
    }

    if (cur.type === 'removed') {
      // 收集连续 removed
      const removedGroup: string[] = []
      while (i < rawLines.length && rawLines[i].type === 'removed') {
        removedGroup.push(rawLines[i].content)
        i++
      }
      // 收集紧随的 added
      const addedGroup: string[] = []
      while (i < rawLines.length && rawLines[i].type === 'added') {
        addedGroup.push(rawLines[i].content)
        i++
      }

      const pairCount = Math.max(removedGroup.length, addedGroup.length)
      for (let p = 0; p < pairCount; p++) {
        const oldLine = removedGroup[p] ?? null
        const newLine = addedGroup[p] ?? null

        let leftCell: SideCell
        let rightCell: SideCell

        if (oldLine !== null && newLine !== null && diffMode.value === 'word') {
          const [oldHtml, newHtml] = charDiffHtml(oldLine, newLine)
          leftCell  = { type: 'removed', lineNum: `${leftNum++}`,  html: oldHtml, rawContent: oldLine }
          rightCell = { type: 'added',   lineNum: `${rightNum++}`, html: newHtml, rawContent: newLine }
        } else if (oldLine !== null && newLine !== null) {
          leftCell  = { type: 'removed', lineNum: `${leftNum++}`,  html: escHtml(oldLine), rawContent: oldLine }
          rightCell = { type: 'added',   lineNum: `${rightNum++}`, html: escHtml(newLine), rawContent: newLine }
        } else if (oldLine !== null) {
          leftCell  = { type: 'removed', lineNum: `${leftNum++}`, html: escHtml(oldLine), rawContent: oldLine }
          rightCell = emptyCell()
        } else {
          leftCell  = emptyCell()
          rightCell = { type: 'added', lineNum: `${rightNum++}`, html: escHtml(newLine!), rawContent: newLine! }
        }

        pairs.push({ left: leftCell, right: rightCell, hasDiff: true })
      }
      continue
    }

    // 纯 added（没有前置 removed）
    pairs.push({
      left:  emptyCell(),
      right: { type: 'added', lineNum: `${rightNum++}`, html: escHtml(cur.content), rawContent: cur.content },
      hasDiff: true,
    })
    i++
  }

  sidePairs.value = pairs
  hasCompared.value = true
}

const clearLeft  = () => { leftText.value = '';  reset() }
const clearRight = () => { rightText.value = ''; reset() }
const reset = () => { sidePairs.value = []; hasCompared.value = false }

const triggerFileUpload = (target: 'left' | 'right') => {
  currentUploadTarget.value = target
  fileInputRef.value?.click()
}

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    if (currentUploadTarget.value === 'left') leftText.value = content
    else rightText.value = content
    reset()
  }
  reader.readAsText(file, 'UTF-8')
  ;(event.target as HTMLInputElement).value = ''
}

const copyDiffText = async () => {
  const lines = sidePairs.value.map(p => {
    const l = p.left.rawContent  ? `- ${p.left.rawContent}`  : ''
    const r = p.right.rawContent ? `+ ${p.right.rawContent}` : ''
    if (p.left.type === 'unchanged') return `  ${p.left.rawContent}`
    return [l, r].filter(Boolean).join('\n')
  })
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    ElMessage.success('对比结果已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped lang="scss">
.text-diff-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow: hidden;
}

/* ── 输入区 ── */
.input-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex-shrink: 0;
}

.input-panel {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 12px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}

.panel-actions { display: flex; gap: 6px; }

.text-input {
  :deep(.el-textarea__inner) {
    background: var(--bg-input);
    border: 2px solid var(--border-color);
    color: var(--text-primary);
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.5;
    resize: none;
    &:focus { border-color: #667eea; }
  }
}

.char-count {
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
}

/* ── 操作栏 ── */
.action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
  background: var(--bg-card);
  border-radius: 8px;
  padding: 10px 14px;
  box-shadow: var(--shadow-card);
}

.diff-stats { display: flex; gap: 6px; }

/* ── 结果区（强制亮色，不跟随暗色主题） ── */
.diff-result {
  flex: 1;
  min-height: 0;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: auto;
  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar { width: 6px; height: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
}

.no-diff {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px;
  color: #606266;
  font-size: 15px;
  .no-diff-icon { font-size: 32px; }
}

/* ── 左右分栏表格（全部硬编码亮色） ── */
.diff-table-header {
  display: flex;
  align-items: stretch;
  position: sticky;
  top: 0;
  z-index: 2;
  background: #667eea;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  flex-shrink: 0;
}

.side-header {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 6px 10px;
  gap: 8px;

  .ln-col {
    width: 40px;
    flex-shrink: 0;
    text-align: right;
    opacity: 0.6;
    font-size: 11px;
  }

  .content-col {
    flex: 1;
  }
}

.side-divider {
  width: 2px;
  background: rgba(255,255,255,0.3);
  flex-shrink: 0;
}

.diff-table-body {
  flex: 1;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
}

.diff-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid #e4e7ed;
  min-height: 22px;

  &:hover {
    .diff-cell { filter: brightness(0.97); }
  }
}

.row-divider {
  width: 2px;
  background: #e4e7ed;
  flex-shrink: 0;
}

.diff-cell {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 0;
  min-width: 0;

  &.cell-removed  { background: #fff5f5; }
  &.cell-added    { background: #f0fff4; }
  &.cell-unchanged { background: #ffffff; }
  &.cell-empty    { background: #f5f7fa; }
}

.line-num {
  width: 40px;
  flex-shrink: 0;
  text-align: right;
  padding: 2px 8px 2px 4px;
  color: #909399;
  font-size: 11px;
  user-select: none;
  border-right: 1px solid #e4e7ed;

  .cell-removed &  { background: #ffd7d5; color: #c0392b; }
  .cell-added &    { background: #cdffd8; color: #27ae60; }
}

.cell-content {
  flex: 1;
  padding: 2px 10px;
  white-space: pre-wrap;
  word-break: break-all;
  color: #303133;
  min-width: 0;

  .cell-removed &  { color: #7a1a1a; }
  .cell-added &    { color: #1a5c2a; }
}

/* 字符级高亮 */
:deep(.char-added) {
  background: rgba(52, 199, 89, 0.55);
  border-radius: 2px;
  padding: 0 1px;
  color: #0a3d1a;
  font-weight: 600;
}

:deep(.char-removed) {
  background: rgba(255, 59, 48, 0.45);
  border-radius: 2px;
  padding: 0 1px;
  color: #5a0a0a;
  font-weight: 600;
  text-decoration: line-through;
  text-decoration-color: #c0392b;
}
</style>
