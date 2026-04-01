<template>
  <!-- 历史记录抽屉 -->
  <el-drawer
    v-model="visible"
    title=""
    direction="ltr"
    size="680px"
    :with-header="false"
    class="history-drawer"
  >
    <div class="history-panel">
      <!-- 顶部标题栏 -->
      <div class="h-header">
        <span class="h-title">📋 历史记录</span>
        <div class="h-header-right">
          <span class="h-total">共 {{ totalCount }} 条</span>
          <el-button size="small" type="danger" plain @click="confirmClearAll" v-if="totalCount > 0">
            清空全部
          </el-button>
          <el-button size="small" @click="visible = false">关闭</el-button>
        </div>
      </div>

      <!-- 全局搜索 -->
      <div class="h-search">
        <el-input
          v-model="searchQuery"
          placeholder="模糊搜索所有历史记录..."
          clearable
          prefix-icon="Search"
          size="default"
        />
      </div>

      <!-- 搜索结果模式 -->
      <div v-if="searchQuery.trim()" class="search-results">
        <div class="section-title">搜索结果（{{ searchResults.length }} 条）</div>
        <div v-if="searchResults.length === 0" class="empty-tip">未找到匹配记录</div>
        <div
          v-for="r in searchResults"
          :key="r.id"
          class="record-item"
          @click="openDetail(r)"
        >
          <div class="record-header">
            <el-tag size="small" :type="toolTagType(r.tool)">{{ TOOL_LABELS[r.tool] }}</el-tag>
            <span class="record-title">{{ r.title }}</span>
          </div>
          <div class="record-meta">
            <span class="record-time">{{ formatTime(r.createdAt) }}</span>
            <span class="record-summary">{{ r.summary }}</span>
          </div>
        </div>
      </div>

      <!-- 工具分组模式 -->
      <div v-else class="tool-groups">
        <div v-for="tool in TOOL_KEYS" :key="tool" class="tool-group">
          <div
            class="tool-group-header"
            @click="toggleGroup(tool)"
          >
            <div class="tool-group-left">
              <span class="toggle-icon">{{ expandedGroups.has(tool) ? '▾' : '▸' }}</span>
              <img :src="toolIcon(tool)" class="tool-icon-sm" />
              <span class="tool-name">{{ TOOL_LABELS[tool] }}</span>
              <el-badge :value="getRecords(tool).length" :max="50" type="info" class="tool-badge" />
            </div>
            <el-button
              v-if="getRecords(tool).length > 0"
              size="small"
              type="danger"
              text
              @click.stop="confirmClearTool(tool)"
            >清空</el-button>
          </div>

          <div v-show="expandedGroups.has(tool)" class="tool-record-list">
            <div v-if="getRecords(tool).length === 0" class="empty-tip">暂无记录</div>
            <div
              v-for="r in getRecords(tool)"
              :key="r.id"
              class="record-item"
              @click="openDetail(r)"
            >
              <div class="record-header">
                <span class="record-title">{{ r.title }}</span>
                <el-button
                  type="danger"
                  text
                  size="small"
                  class="del-btn"
                  @click.stop="historyStore.deleteRecord(tool, r.id)"
                >×</el-button>
              </div>
              <div class="record-meta">
                <span class="record-time">{{ formatTime(r.createdAt) }}</span>
                <span class="record-summary">{{ r.summary }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>

  <!-- 详情对话框 -->
  <el-dialog
    v-model="detailVisible"
    :title="detailRecord ? TOOL_LABELS[detailRecord.tool] + ' · 历史详情' : ''"
    width="600px"
    class="detail-dialog"
  >
    <div v-if="detailRecord" class="detail-body">
      <div class="detail-time">{{ formatTime(detailRecord.createdAt) }}</div>
      <div v-for="(val, key) in detailRecord.data" :key="key" class="detail-row">
        <div class="detail-label">{{ key }}</div>
        <div class="detail-value">
          <pre class="detail-pre">{{ val }}</pre>
          <el-button type="text" size="small" class="detail-copy" @click="copyText(val)">复制</el-button>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="detailVisible = false">关闭</el-button>
      <el-button type="danger" @click="deleteAndClose">删除此记录</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useHistoryStore, TOOL_LABELS, type ToolKey, type HistoryRecord } from '@/stores/history'

const visible = defineModel<boolean>({ required: true })

const historyStore = useHistoryStore()
const { getRecords } = historyStore

const totalCount = computed(() => historyStore.totalCount())

const TOOL_KEYS: ToolKey[] = ['diff', 'json', 'sql', 'base64', 'hash', 'cert', 'jwt']

// ---- 搜索 ----
const searchQuery = ref('')

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  const results: HistoryRecord[] = []
  for (const tool of TOOL_KEYS) {
    for (const r of getRecords(tool)) {
      const haystack = [r.title, r.summary, ...Object.values(r.data)].join(' ').toLowerCase()
      if (haystack.includes(q)) results.push(r)
    }
  }
  return results.sort((a, b) => b.createdAt - a.createdAt)
})

// ---- 展开/折叠 ----
const expandedGroups = ref<Set<ToolKey>>(new Set())

function toggleGroup(tool: ToolKey) {
  if (expandedGroups.value.has(tool)) expandedGroups.value.delete(tool)
  else expandedGroups.value.add(tool)
}

// ---- 详情 ----
const detailVisible = ref(false)
const detailRecord = ref<HistoryRecord | null>(null)

function openDetail(r: HistoryRecord) {
  detailRecord.value = r
  detailVisible.value = true
}

function deleteAndClose() {
  if (!detailRecord.value) return
  historyStore.deleteRecord(detailRecord.value.tool, detailRecord.value.id)
  detailVisible.value = false
  ElMessage.success('已删除')
}

// ---- 清空 ----
function confirmClearTool(tool: ToolKey) {
  ElMessageBox.confirm(`确定清空「${TOOL_LABELS[tool]}」的所有历史记录？`, '警告', {
    confirmButtonText: '清空', cancelButtonText: '取消', type: 'warning',
  }).then(() => {
    historyStore.clearTool(tool)
    ElMessage.success('已清空')
  }).catch(() => {})
}

function confirmClearAll() {
  ElMessageBox.confirm('确定清空所有工具的历史记录？', '警告', {
    confirmButtonText: '全部清空', cancelButtonText: '取消', type: 'warning',
  }).then(() => {
    for (const tool of TOOL_KEYS) historyStore.clearTool(tool)
    ElMessage.success('已全部清空')
  }).catch(() => {})
}

// ---- 工具函数 ----
function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN')
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
  ElMessage.success('已复制')
}

function toolIcon(tool: ToolKey): string {
  return new URL(`../assets/icons/${tool}.svg`, import.meta.url).href
}

function toolTagType(tool: ToolKey): '' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<ToolKey, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    diff: '', json: 'success', sql: 'warning', base64: 'info',
    hash: 'danger', cert: '', jwt: 'success',
  }
  return map[tool]
}
</script>

<style lang="scss">
/* 全局：覆盖 drawer */
.history-drawer .el-drawer__body {
  padding: 0 !important;
  overflow: hidden;
}
</style>

<style scoped lang="scss">
.history-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* ── 顶部 ── */
.h-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  background: var(--bg-navbar);
}

.h-title {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.h-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.h-total {
  font-size: 12px;
  color: rgba(255,255,255,.6);
}

/* ── 搜索 ── */
.h-search {
  padding: 10px 16px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-color);
}

/* ── 内容区 ── */
.search-results,
.tool-groups {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.2); border-radius: 3px; }
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  padding: 4px 16px 6px;
}

/* ── 工具分组 ── */
.tool-group { border-bottom: 1px solid var(--border-color); }

.tool-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  transition: background .15s;

  &:hover { background: var(--bg-input); }
}

.tool-group-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-icon {
  font-size: 10px;
  color: var(--text-muted);
  width: 10px;
}

.tool-icon-sm {
  width: 14px;
  height: 14px;
  image-rendering: pixelated;
}

.tool-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.tool-badge {
  :deep(.el-badge__content) { font-size: 10px; }
}

/* ── 记录列表 ── */
.tool-record-list {
  padding: 0 8px 8px 32px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-item {
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--bg-card);
  cursor: pointer;
  transition: all .15s;

  &:hover {
    background: var(--bg-input);
    box-shadow: 0 1px 4px rgba(0,0,0,.1);
  }
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}

.record-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.del-btn {
  opacity: 0;
  transition: opacity .15s;
  .record-item:hover & { opacity: 1; }
}

.record-meta {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.record-time {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.record-summary {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Monaco', monospace;
}

.empty-tip {
  font-size: 12px;
  color: var(--text-muted);
  padding: 6px 10px;
}

/* ── 详情对话框 ── */
.detail-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-time {
  font-size: 12px;
  color: #888;
}

.detail-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.detail-label {
  min-width: 80px;
  font-size: 11px;
  font-weight: 700;
  color: #667eea;
  text-transform: uppercase;
  padding-top: 6px;
  flex-shrink: 0;
}

.detail-value {
  flex: 1;
  display: flex;
  gap: 6px;
  align-items: flex-start;
  background: #f8f9fc;
  border-radius: 6px;
  padding: 6px 8px;
}

.detail-pre {
  flex: 1;
  margin: 0;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: #1a1a1a;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow-y: auto;
}

.detail-copy {
  flex-shrink: 0;
  color: #667eea;
  font-size: 11px;
}
</style>
