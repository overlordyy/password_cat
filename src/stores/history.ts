import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToolKey = 'diff' | 'json' | 'sql' | 'base64' | 'hash' | 'cert' | 'jwt'

export interface HistoryRecord {
  id: string
  tool: ToolKey
  title: string      // 一句话摘要，用于列表展示
  summary: string    // 稍长摘要，用于搜索
  data: Record<string, string>  // 具体数据 key-value，用于详情展示
  createdAt: number
}

export const TOOL_LABELS: Record<ToolKey, string> = {
  diff:   '文本对比',
  json:   'JSON格式化',
  sql:    'SQL格式化',
  base64: 'Base64',
  hash:   '哈希计算',
  cert:   '证书解码',
  jwt:    'JWT 工具',
}

const STORAGE_KEY = 'passwordcat_history'
const MAX_PER_TOOL = 50

function loadFromStorage(): Map<ToolKey, HistoryRecord[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    const obj = JSON.parse(raw) as Record<string, HistoryRecord[]>
    const map = new Map<ToolKey, HistoryRecord[]>()
    for (const [k, v] of Object.entries(obj)) {
      map.set(k as ToolKey, v)
    }
    return map
  } catch {
    return new Map()
  }
}

function saveToStorage(map: Map<ToolKey, HistoryRecord[]>) {
  const obj: Record<string, HistoryRecord[]> = {}
  for (const [k, v] of map.entries()) obj[k] = v
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

export const useHistoryStore = defineStore('history', () => {
  const records = ref<Map<ToolKey, HistoryRecord[]>>(loadFromStorage())

  function addRecord(tool: ToolKey, payload: Omit<HistoryRecord, 'id' | 'tool' | 'createdAt'>) {
    const list = records.value.get(tool) || []
    const newRecord: HistoryRecord = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tool,
      createdAt: Date.now(),
      ...payload,
    }
    // 最新的放最前，最多保留 MAX_PER_TOOL 条
    const updated = [newRecord, ...list].slice(0, MAX_PER_TOOL)
    records.value.set(tool, updated)
    saveToStorage(records.value)
  }

  function getRecords(tool: ToolKey): HistoryRecord[] {
    return records.value.get(tool) || []
  }

  function deleteRecord(tool: ToolKey, id: string) {
    const list = records.value.get(tool) || []
    records.value.set(tool, list.filter(r => r.id !== id))
    saveToStorage(records.value)
  }

  function clearTool(tool: ToolKey) {
    records.value.set(tool, [])
    saveToStorage(records.value)
  }

  function totalCount(): number {
    let n = 0
    for (const list of records.value.values()) n += list.length
    return n
  }

  return { records, addRecord, getRecords, deleteRecord, clearTool, totalCount }
})
