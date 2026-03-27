<template>
  <div class="hash-container">
    <!-- 输入区 -->
    <div class="input-card">
      <div class="card-header">
        <span class="card-title">📥 输入</span>
        <div class="panel-actions">
          <el-radio-group v-model="inputType" size="small" @change="compute">
            <el-radio-button value="text">文本</el-radio-button>
            <el-radio-button value="file">文件</el-radio-button>
          </el-radio-group>
          <el-button size="small" @click="triggerFileUpload" v-if="inputType === 'file'">
            <template #icon><Upload /></template>选择文件
          </el-button>
          <el-button size="small" @click="clear">清空</el-button>
        </div>
      </div>

      <el-input
        v-if="inputType === 'text'"
        v-model="inputText"
        type="textarea"
        :rows="4"
        placeholder="输入要计算哈希的文本..."
        class="mono-input"
        resize="none"
        @input="debounceCompute"
      />

      <div v-else class="file-drop-zone" @dragover.prevent @drop.prevent="handleDrop">
        <div v-if="fileName" class="file-info">
          <span class="file-icon">📄</span>
          <span class="file-name">{{ fileName }}</span>
          <span class="file-size">{{ fileSize }}</span>
        </div>
        <div v-else class="file-placeholder">
          拖拽文件到这里，或点击上方「选择文件」
        </div>
      </div>

      <div class="input-footer">
        <span class="char-count">
          <template v-if="inputType === 'text'">{{ inputText.length }} 字符</template>
          <template v-else-if="fileName">{{ fileName }}</template>
        </span>
        <el-button type="primary" size="small" @click="compute" :loading="computing">
          计算哈希
        </el-button>
      </div>
    </div>

    <!-- 结果区 -->
    <div class="results-card">
      <div class="card-header">
        <span class="card-title">🔐 哈希结果</span>
        <div class="panel-actions">
          <el-radio-group v-model="outputCase" size="small" @change="toggleCase">
            <el-radio-button value="lower">小写</el-radio-button>
            <el-radio-button value="upper">大写</el-radio-button>
          </el-radio-group>
          <el-button size="small" @click="copyAll" :disabled="!hasResults">
            <template #icon><DocumentCopy /></template>复制全部
          </el-button>
        </div>
      </div>

      <div class="hash-list">
        <div v-for="item in hashResults" :key="item.algo" class="hash-item" :class="{ computing: item.computing }">
          <div class="hash-algo">
            <span class="algo-name">{{ item.algo }}</span>
            <span class="algo-bits">{{ item.bits }}</span>
          </div>
          <div class="hash-value-row">
            <span class="hash-value" :class="{ placeholder: !item.value }">
              {{ item.value || (computing ? '计算中...' : '—') }}
            </span>
            <el-button
              v-if="item.value"
              type="text"
              size="small"
              @click="copyHash(item)"
              class="copy-btn"
            >
              <template #icon><DocumentCopy /></template>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 校验区 -->
    <div class="verify-card">
      <div class="card-header">
        <span class="card-title">✅ 哈希校验</span>
      </div>
      <div class="verify-body">
        <el-input
          v-model="verifyHash"
          placeholder="粘贴已知哈希值进行校验..."
          class="mono-input"
          clearable
        />
        <div v-if="verifyHash && hasResults" class="verify-result">
          <template v-if="verifyMatch">
            <el-tag type="success" size="large">✅ 匹配 — {{ verifyMatch }}</el-tag>
          </template>
          <template v-else>
            <el-tag type="danger" size="large">❌ 不匹配任何算法的结果</el-tag>
          </template>
        </div>
      </div>
    </div>

    <input ref="fileInputRef" type="file" style="display:none" @change="handleFileSelect" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, DocumentCopy } from '@element-plus/icons-vue'

const inputText = ref('')
const inputType = ref<'text' | 'file'>('text')
const fileName = ref('')
const fileSize = ref('')
const fileBuffer = ref<ArrayBuffer | null>(null)
const outputCase = ref<'lower' | 'upper'>('lower')
const computing = ref(false)
const verifyHash = ref('')
const fileInputRef = ref<HTMLInputElement>()

interface HashItem {
  algo: string
  bits: string
  value: string
  computing: boolean
}

const hashResults = ref<HashItem[]>([
  { algo: 'MD5',    bits: '128 bit', value: '', computing: false },
  { algo: 'SHA-1',  bits: '160 bit', value: '', computing: false },
  { algo: 'SHA-256',bits: '256 bit', value: '', computing: false },
  { algo: 'SHA-384',bits: '384 bit', value: '', computing: false },
  { algo: 'SHA-512',bits: '512 bit', value: '', computing: false },
])

const hasResults = computed(() => hashResults.value.some(h => h.value))

const verifyMatch = computed(() => {
  if (!verifyHash.value || !hasResults.value) return null
  const v = verifyHash.value.trim().toLowerCase()
  const found = hashResults.value.find(h => h.value.toLowerCase() === v)
  return found ? found.algo : null
})

const bufToHex = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// MD5 实现（纯 JS，不依赖 SubtleCrypto）
const md5 = (str: string): string => {
  const rotateLeft = (lValue: number, iShiftBits: number) =>
    (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits))
  const addUnsigned = (lX: number, lY: number) => {
    const lX8 = lX & 0x80000000, lY8 = lY & 0x80000000
    const lX4 = lX & 0x40000000, lY4 = lY & 0x40000000
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff)
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8
      return lResult ^ 0x40000000 ^ lX8 ^ lY8
    }
    return lResult ^ lX8 ^ lY8
  }
  const F = (x: number, y: number, z: number) => (x & y) | (~x & z)
  const G = (x: number, y: number, z: number) => (x & z) | (y & ~z)
  const H = (x: number, y: number, z: number) => x ^ y ^ z
  const I = (x: number, y: number, z: number) => y ^ (x | ~z)
  const FF = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
    addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, F(b, c, d)), addUnsigned(x, ac)), s), b)
  const GG = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
    addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, G(b, c, d)), addUnsigned(x, ac)), s), b)
  const HH = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
    addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, H(b, c, d)), addUnsigned(x, ac)), s), b)
  const II = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
    addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, I(b, c, d)), addUnsigned(x, ac)), s), b)
  const convertToWordArray = (s: string) => {
    const lMessageLength = s.length
    const lNumberOfWords_temp1 = lMessageLength + 8
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16
    const lWordArray = Array(lNumberOfWords - 1).fill(0)
    let lBytePosition = 0, lByteCount = 0
    while (lByteCount < lMessageLength) {
      const lWordNumber = (lByteCount - (lByteCount % 4)) / 4
      lBytePosition = (lByteCount % 4) * 8
      lWordArray[lWordNumber] = lWordArray[lWordNumber] | (s.charCodeAt(lByteCount) << lBytePosition)
      lByteCount++
    }
    const lWordNumber = (lByteCount - (lByteCount % 4)) / 4
    lWordArray[lWordNumber] = lWordArray[lWordNumber] | (0x80 << ((lByteCount % 4) * 8))
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29
    return lWordArray
  }
  const wordToHex = (lValue: number) => {
    let wordToHexValue = '', wordToHexValue_temp = '', lByte, lCount
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255
      wordToHexValue_temp = '0' + lByte.toString(16)
      wordToHexValue += wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2)
    }
    return wordToHexValue
  }
  const x = convertToWordArray(unescape(encodeURIComponent(str)))
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476
  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d
    a = FF(a,b,c,d,x[k],7,0xd76aa478); d = FF(d,a,b,c,x[k+1],12,0xe8c7b756); c = FF(c,d,a,b,x[k+2],17,0x242070db); b = FF(b,c,d,a,x[k+3],22,0xc1bdceee)
    a = FF(a,b,c,d,x[k+4],7,0xf57c0faf); d = FF(d,a,b,c,x[k+5],12,0x4787c62a); c = FF(c,d,a,b,x[k+6],17,0xa8304613); b = FF(b,c,d,a,x[k+7],22,0xfd469501)
    a = FF(a,b,c,d,x[k+8],7,0x698098d8); d = FF(d,a,b,c,x[k+9],12,0x8b44f7af); c = FF(c,d,a,b,x[k+10],17,0xffff5bb1); b = FF(b,c,d,a,x[k+11],22,0x895cd7be)
    a = FF(a,b,c,d,x[k+12],7,0x6b901122); d = FF(d,a,b,c,x[k+13],12,0xfd987193); c = FF(c,d,a,b,x[k+14],17,0xa679438e); b = FF(b,c,d,a,x[k+15],22,0x49b40821)
    a = GG(a,b,c,d,x[k+1],5,0xf61e2562); d = GG(d,a,b,c,x[k+6],9,0xc040b340); c = GG(c,d,a,b,x[k+11],14,0x265e5a51); b = GG(b,c,d,a,x[k],20,0xe9b6c7aa)
    a = GG(a,b,c,d,x[k+5],5,0xd62f105d); d = GG(d,a,b,c,x[k+10],9,0x2441453); c = GG(c,d,a,b,x[k+15],14,0xd8a1e681); b = GG(b,c,d,a,x[k+4],20,0xe7d3fbc8)
    a = GG(a,b,c,d,x[k+9],5,0x21e1cde6); d = GG(d,a,b,c,x[k+14],9,0xc33707d6); c = GG(c,d,a,b,x[k+3],14,0xf4d50d87); b = GG(b,c,d,a,x[k+8],20,0x455a14ed)
    a = GG(a,b,c,d,x[k+13],5,0xa9e3e905); d = GG(d,a,b,c,x[k+2],9,0xfcefa3f8); c = GG(c,d,a,b,x[k+7],14,0x676f02d9); b = GG(b,c,d,a,x[k+12],20,0x8d2a4c8a)
    a = HH(a,b,c,d,x[k+5],4,0xfffa3942); d = HH(d,a,b,c,x[k+8],11,0x8771f681); c = HH(c,d,a,b,x[k+11],16,0x6d9d6122); b = HH(b,c,d,a,x[k+14],23,0xfde5380c)
    a = HH(a,b,c,d,x[k+1],4,0xa4beea44); d = HH(d,a,b,c,x[k+4],11,0x4bdecfa9); c = HH(c,d,a,b,x[k+7],16,0xf6bb4b60); b = HH(b,c,d,a,x[k+10],23,0xbebfbc70)
    a = HH(a,b,c,d,x[k+13],4,0x289b7ec6); d = HH(d,a,b,c,x[k],11,0xeaa127fa); c = HH(c,d,a,b,x[k+3],16,0xd4ef3085); b = HH(b,c,d,a,x[k+6],23,0x4881d05)
    a = HH(a,b,c,d,x[k+9],4,0xd9d4d039); d = HH(d,a,b,c,x[k+12],11,0xe6db99e5); c = HH(c,d,a,b,x[k+15],16,0x1fa27cf8); b = HH(b,c,d,a,x[k+2],23,0xc4ac5665)
    a = II(a,b,c,d,x[k],6,0xf4292244); d = II(d,a,b,c,x[k+7],10,0x432aff97); c = II(c,d,a,b,x[k+14],15,0xab9423a7); b = II(b,c,d,a,x[k+5],21,0xfc93a039)
    a = II(a,b,c,d,x[k+12],6,0x655b59c3); d = II(d,a,b,c,x[k+3],10,0x8f0ccc92); c = II(c,d,a,b,x[k+10],15,0xffeff47d); b = II(b,c,d,a,x[k+1],21,0x85845dd1)
    a = II(a,b,c,d,x[k+8],6,0x6fa87e4f); d = II(d,a,b,c,x[k+15],10,0xfe2ce6e0); c = II(c,d,a,b,x[k+6],15,0xa3014314); b = II(b,c,d,a,x[k+13],21,0x4e0811a1)
    a = II(a,b,c,d,x[k+4],6,0xf7537e82); d = II(d,a,b,c,x[k+11],10,0xbd3af235); c = II(c,d,a,b,x[k+2],15,0x2ad7d2bb); b = II(b,c,d,a,x[k+9],21,0xeb86d391)
    a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD)
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase()
}

const computeSubtleCrypto = async (algo: string, data: ArrayBuffer): Promise<string> => {
  const hashBuffer = await crypto.subtle.digest(algo, data)
  return bufToHex(hashBuffer)
}

const strToBuffer = (str: string): ArrayBuffer => {
  return new TextEncoder().encode(str).buffer
}

let debounceTimer: ReturnType<typeof setTimeout>
const debounceCompute = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(compute, 300)
}

const compute = async () => {
  const hasInput = inputType.value === 'text' ? inputText.value : fileBuffer.value
  if (!hasInput) {
    hashResults.value.forEach(h => { h.value = '' })
    return
  }
  computing.value = true
  hashResults.value.forEach(h => { h.computing = true })

  try {
    const buf = inputType.value === 'text'
      ? strToBuffer(inputText.value)
      : fileBuffer.value!

    const [sha1, sha256, sha384, sha512] = await Promise.all([
      computeSubtleCrypto('SHA-1', buf),
      computeSubtleCrypto('SHA-256', buf),
      computeSubtleCrypto('SHA-384', buf),
      computeSubtleCrypto('SHA-512', buf),
    ])

    const md5Val = inputType.value === 'text' ? md5(inputText.value) : ''

    const vals: Record<string, string> = { 'MD5': md5Val, 'SHA-1': sha1, 'SHA-256': sha256, 'SHA-384': sha384, 'SHA-512': sha512 }
    hashResults.value.forEach(h => {
      h.value = outputCase.value === 'upper' ? (vals[h.algo] || '').toUpperCase() : (vals[h.algo] || '').toLowerCase()
      h.computing = false
    })
  } catch (e) {
    ElMessage.error('计算失败：' + (e as Error).message)
  } finally {
    computing.value = false
  }
}

const toggleCase = () => {
  hashResults.value.forEach(h => {
    if (h.value) h.value = outputCase.value === 'upper' ? h.value.toUpperCase() : h.value.toLowerCase()
  })
}

const copyHash = async (item: HashItem) => {
  await navigator.clipboard.writeText(item.value)
  ElMessage.success(`${item.algo} 已复制`)
}

const copyAll = async () => {
  const text = hashResults.value.filter(h => h.value).map(h => `${h.algo}: ${h.value}`).join('\n')
  await navigator.clipboard.writeText(text)
  ElMessage.success('全部哈希已复制')
}

const clear = () => {
  inputText.value = ''
  fileName.value = ''
  fileSize.value = ''
  fileBuffer.value = null
  hashResults.value.forEach(h => { h.value = '' })
  verifyHash.value = ''
}

const triggerFileUpload = () => fileInputRef.value?.click()

const loadFile = (file: File) => {
  fileName.value = file.name
  fileSize.value = file.size < 1024 * 1024
    ? `${(file.size / 1024).toFixed(1)} KB`
    : `${(file.size / 1024 / 1024).toFixed(2)} MB`
  const reader = new FileReader()
  reader.onload = (e) => {
    fileBuffer.value = e.target?.result as ArrayBuffer
    compute()
  }
  reader.readAsArrayBuffer(file)
}

const handleFileSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) loadFile(file)
  ;(event.target as HTMLInputElement).value = ''
}

const handleDrop = (event: DragEvent) => {
  const file = event.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}
</script>

<style scoped lang="scss">
.hash-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow-y: auto;
  padding-right: 4px;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
}

.input-card, .results-card, .verify-card {
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
.panel-actions { display: flex; gap: 6px; align-items: center; }

.mono-input {
  :deep(.el-textarea__inner), :deep(.el-input__inner) {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    background: var(--bg-input);
    border: 2px solid var(--border-color);
    color: var(--text-primary);
    &:focus { border-color: #667eea; }
  }
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.char-count { font-size: 11px; color: var(--text-muted); }

.file-drop-zone {
  border: 2px dashed var(--border-color);
  border-radius: 6px;
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  transition: border-color 0.2s;
  &:hover { border-color: #667eea; }
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-primary);
  .file-icon { font-size: 24px; }
  .file-name { font-weight: 600; font-size: 14px; }
  .file-size { color: var(--text-muted); font-size: 12px; }
}

.file-placeholder { font-size: 13px; }

.hash-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hash-item {
  background: var(--bg-input);
  border-radius: 6px;
  padding: 10px 12px;
  &.computing { opacity: 0.6; }
}

.hash-algo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.algo-name {
  font-size: 12px;
  font-weight: 700;
  color: #667eea;
}

.algo-bits {
  font-size: 10px;
  color: var(--text-muted);
  background: rgba(102,126,234,0.1);
  padding: 1px 6px;
  border-radius: 999px;
}

.hash-value-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hash-value {
  flex: 1;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-primary);
  word-break: break-all;
  &.placeholder { color: var(--text-muted); }
}

.copy-btn { padding: 0 4px; color: #667eea; flex-shrink: 0; }

.verify-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.verify-result { display: flex; align-items: center; }
</style>
