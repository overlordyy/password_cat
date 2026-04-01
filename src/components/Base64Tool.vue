<template>
  <div class="tool-container">
    <div class="tool-panel">
      <div class="panel-header">
        <span class="panel-title">🔤 输入</span>
        <div class="panel-actions">
          <el-radio-group v-model="mode" size="small">
            <el-radio-button value="encode">编码</el-radio-button>
            <el-radio-button value="decode">解码</el-radio-button>
          </el-radio-group>
          <el-button size="small" @click="triggerFileUpload">
            <template #icon><Upload /></template>
            上传文件
          </el-button>
          <el-button size="small" @click="clear" :disabled="!inputText">清空</el-button>
        </div>
      </div>

      <el-input
        v-model="inputText"
        type="textarea"
        :rows="8"
        :placeholder="mode === 'encode' ? '输入要编码的文本...' : '输入要解码的 Base64 字符串...'"
        class="mono-input"
        resize="none"
        @input="convert"
      />
      <div class="input-footer">
        <span class="char-count">{{ inputText.length }} 字符</span>
        <div class="action-btns">
          <el-button type="primary" size="small" @click="convert">
            {{ mode === 'encode' ? '编码 →' : '← 解码' }}
          </el-button>
          <el-button size="small" @click="swap" :disabled="!outputText">⇄ 交换</el-button>
        </div>
      </div>
    </div>

    <div class="tool-panel">
      <div class="panel-header">
        <span class="panel-title">📤 结果</span>
        <div class="panel-actions">
          <el-button size="small" @click="copyOutput" :disabled="!outputText">
            <template #icon><DocumentCopy /></template>复制
          </el-button>
          <el-button size="small" @click="downloadOutput" :disabled="!outputText || isImageOutput">
            <template #icon><Download /></template>下载
          </el-button>
        </div>
      </div>

      <!-- 图片预览 -->
      <div v-if="isImageOutput" class="image-preview">
        <img :src="outputText" alt="Base64 图片预览" />
      </div>

      <el-input
        v-else
        v-model="outputText"
        type="textarea"
        :rows="8"
        readonly
        class="mono-input output-input"
        resize="none"
        :placeholder="errorMsg || '结果将显示在这里'"
      />

      <div class="input-footer">
        <span v-if="errorMsg" class="error-text">{{ errorMsg }}</span>
        <span v-else-if="outputText" class="char-count">{{ outputText.length }} 字符</span>
        <div class="action-btns">
          <el-checkbox v-model="urlSafe" size="small" @change="convert">URL Safe</el-checkbox>
          <el-checkbox v-model="previewImage" size="small" v-if="mode === 'decode'">预览图片</el-checkbox>
        </div>
      </div>
    </div>

    <input ref="fileInputRef" type="file" style="display:none" @change="handleFileUpload" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, DocumentCopy, Download } from '@element-plus/icons-vue'
import { useHistoryStore } from '@/stores/history'

const historyStore = useHistoryStore()

const inputText = ref('')
const outputText = ref('')
const errorMsg = ref('')
const mode = ref<'encode' | 'decode'>('encode')
const urlSafe = ref(false)
const previewImage = ref(true)
const fileInputRef = ref<HTMLInputElement>()

const isImageOutput = computed(() =>
  mode.value === 'decode' && previewImage.value && outputText.value.startsWith('data:image')
)

const convert = () => {
  if (!inputText.value) { outputText.value = ''; errorMsg.value = ''; return }
  errorMsg.value = ''
  try {
    if (mode.value === 'encode') {
      let result = btoa(unescape(encodeURIComponent(inputText.value)))
      if (urlSafe.value) result = result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
      outputText.value = result
    } else {
      let input = inputText.value.trim()
      if (urlSafe.value) input = input.replace(/-/g, '+').replace(/_/g, '/')
      // 补全 padding
      while (input.length % 4) input += '='
      outputText.value = decodeURIComponent(escape(atob(input)))
    }
    // 记录历史
    historyStore.addRecord('base64', {
      title: `${mode.value === 'encode' ? '编码' : '解码'}：${inputText.value.slice(0, 40)}`,
      summary: outputText.value.slice(0, 60),
      data: {
        '操作': mode.value === 'encode' ? 'Base64 编码' : 'Base64 解码',
        '输入': inputText.value.slice(0, 500),
        '输出': outputText.value.slice(0, 500),
      },
    })
  } catch (e) {
    errorMsg.value = `${mode.value === 'encode' ? '编码' : '解码'}失败：${(e as Error).message}`
    outputText.value = ''
  }
}

const swap = () => {
  inputText.value = outputText.value
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
  convert()
}

const clear = () => { inputText.value = ''; outputText.value = ''; errorMsg.value = '' }

const copyOutput = async () => {
  try { await navigator.clipboard.writeText(outputText.value); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}

const downloadOutput = () => {
  const blob = new Blob([outputText.value], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = mode.value === 'encode' ? 'encoded.txt' : 'decoded.txt'
  a.click()
}

const triggerFileUpload = () => fileInputRef.value?.click()

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (mode.value === 'encode' && file.type.startsWith('image/')) {
    // 图片文件转 Base64 Data URL
    const reader = new FileReader()
    reader.onload = (e) => {
      outputText.value = e.target?.result as string
      inputText.value = `[图片文件: ${file.name}]`
      errorMsg.value = ''
    }
    reader.readAsDataURL(file)
  } else {
    const reader = new FileReader()
    reader.onload = (e) => { inputText.value = e.target?.result as string; convert() }
    reader.readAsText(file, 'UTF-8')
  }
  ;(event.target as HTMLInputElement).value = ''
}
</script>

<style scoped lang="scss">
.tool-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  height: 100%;
  overflow: hidden;
}

.tool-panel {
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

.panel-title { font-weight: 600; font-size: 13px; color: var(--text-primary); }
.panel-actions { display: flex; gap: 6px; align-items: center; }

.mono-input {
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

.output-input :deep(.el-textarea__inner) { background: #fafafa; color: #303133; }

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.action-btns { display: flex; gap: 6px; align-items: center; }
.char-count { font-size: 11px; color: var(--text-muted); }
.error-text { font-size: 11px; color: #f56c6c; }

.image-preview {
  flex: 1;
  min-height: 0;
  background: #fafafa;
  border: 2px solid #e4e7ed;
  border-radius: 6px;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; }
}
</style>
