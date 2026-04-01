<template>
  <div class="jwt-tool">
    <!-- 顶部操作栏 -->
    <div class="tool-header">
      <div class="header-left">
        <span class="tool-title">JWT 工具</span>
      </div>
      <div class="header-right">
        <el-radio-group v-model="mode" size="small">
          <el-radio-button value="decode">解码</el-radio-button>
          <el-radio-button value="encode">编码</el-radio-button>
          <el-radio-button value="verify">验证</el-radio-button>
        </el-radio-group>
        <el-button size="small" @click="clearAll">清空</el-button>
      </div>
    </div>

    <!-- ====== 解码模式 ====== -->
    <div v-if="mode === 'decode'" class="decode-body">
      <!-- 左：输入 -->
      <div class="input-panel">
        <div class="panel-label">JWT Token</div>
        <el-input
          v-model="jwtInput"
          type="textarea"
          :rows="14"
          placeholder="粘贴 JWT Token..."
          class="jwt-textarea"
          @input="onJwtInput"
        />
        <div v-if="decodeError" class="error-tip">{{ decodeError }}</div>
      </div>

      <!-- 右：解码结果 -->
      <div class="result-panel" v-if="decoded">
        <!-- Header -->
        <div class="jwt-section header-section">
          <div class="section-label">
            <span class="dot dot-red"></span> Header
          </div>
          <div class="section-content">
            <pre class="code-block">{{ prettyJson(decoded.header) }}</pre>
          </div>
          <div class="section-meta">
            <span>算法：<strong>{{ decoded.header.alg || '未知' }}</strong></span>
            <span>类型：<strong>{{ decoded.header.typ || 'JWT' }}</strong></span>
          </div>
        </div>

        <!-- Payload -->
        <div class="jwt-section payload-section">
          <div class="section-label">
            <span class="dot dot-purple"></span> Payload
          </div>
          <div class="section-content">
            <pre class="code-block">{{ prettyJson(decoded.payload) }}</pre>
          </div>
          <div class="section-meta payload-meta">
            <div v-if="decoded.payload.iss" class="meta-item">
              <span class="meta-key">iss</span>
              <span>{{ decoded.payload.iss }}</span>
            </div>
            <div v-if="decoded.payload.sub" class="meta-item">
              <span class="meta-key">sub</span>
              <span>{{ decoded.payload.sub }}</span>
            </div>
            <div v-if="decoded.payload.aud" class="meta-item">
              <span class="meta-key">aud</span>
              <span>{{ Array.isArray(decoded.payload.aud) ? decoded.payload.aud.join(', ') : decoded.payload.aud }}</span>
            </div>
            <div v-if="decoded.payload.iat" class="meta-item">
              <span class="meta-key">iat</span>
              <span>{{ formatTs(decoded.payload.iat) }}</span>
            </div>
            <div v-if="decoded.payload.exp" class="meta-item">
              <span class="meta-key">exp</span>
              <span :class="{ 'expired': isExpired(decoded.payload.exp) }">
                {{ formatTs(decoded.payload.exp) }}
                <el-tag v-if="isExpired(decoded.payload.exp)" type="danger" size="small">已过期</el-tag>
                <el-tag v-else type="success" size="small">有效</el-tag>
              </span>
            </div>
            <div v-if="decoded.payload.nbf" class="meta-item">
              <span class="meta-key">nbf</span>
              <span>{{ formatTs(decoded.payload.nbf) }}</span>
            </div>
          </div>
        </div>

        <!-- Signature -->
        <div class="jwt-section sig-section">
          <div class="section-label">
            <span class="dot dot-blue"></span> Signature
          </div>
          <div class="section-content">
            <div class="sig-text">{{ decoded.signature }}</div>
          </div>
        </div>

        <!-- 复制 -->
        <el-button size="small" @click="copyText(prettyJson(decoded.payload))" class="copy-btn-bottom">
          复制 Payload JSON
        </el-button>
      </div>
      <div v-else class="empty-hint">
        <div class="empty-icon">🔐</div>
        <p>粘贴 JWT Token 即可自动解码</p>
        <p class="hint-sub">Header.Payload.Signature 三段式结构</p>
      </div>
    </div>

    <!-- ====== 编码模式 ====== -->
    <div v-if="mode === 'encode'" class="encode-body">
      <div class="encode-left">
        <!-- 算法选择 -->
        <div class="field-group">
          <div class="field-label">签名算法</div>
          <el-select v-model="encodeAlg" size="small" style="width:100%">
            <el-option-group label="HMAC（对称密钥）">
              <el-option label="HS256" value="HS256" />
              <el-option label="HS384" value="HS384" />
              <el-option label="HS512" value="HS512" />
            </el-option-group>
            <el-option-group label="无签名">
              <el-option label="none（不签名）" value="none" />
            </el-option-group>
          </el-select>
        </div>

        <!-- 密钥 -->
        <div class="field-group" v-if="encodeAlg !== 'none'">
          <div class="field-label">密钥 (Secret)</div>
          <el-input
            v-model="encodeSecret"
            type="password"
            show-password
            size="small"
            placeholder="输入 HMAC 密钥..."
            autocomplete="off"
          />
        </div>

        <!-- Header -->
        <div class="field-group">
          <div class="field-label">Header（JSON）</div>
          <el-input
            v-model="encodeHeader"
            type="textarea"
            :rows="3"
            class="code-input"
            placeholder='{"alg":"HS256","typ":"JWT"}'
          />
        </div>

        <!-- Payload -->
        <div class="field-group">
          <div class="field-label">Payload（JSON）</div>
          <el-input
            v-model="encodePayload"
            type="textarea"
            :rows="8"
            class="code-input"
            :placeholder='payloadPlaceholder'
          />
        </div>

        <!-- 快捷插入时间声明 -->
        <div class="quick-claims">
          <span class="field-label">快捷声明：</span>
          <el-button size="small" @click="insertClaim('iat')">+ iat</el-button>
          <el-button size="small" @click="insertClaim('exp1h')">+ exp(1h)</el-button>
          <el-button size="small" @click="insertClaim('exp24h')">+ exp(24h)</el-button>
          <el-button size="small" @click="insertClaim('exp7d')">+ exp(7d)</el-button>
        </div>

        <el-button type="primary" class="encode-btn" @click="encodeJwt">
          生成 JWT
        </el-button>

        <div v-if="encodeError" class="error-tip">{{ encodeError }}</div>
      </div>

      <!-- 右：生成结果 -->
      <div class="encode-right">
        <div class="panel-label">生成的 JWT Token</div>
        <div v-if="encodedToken" class="token-output">
          <div class="token-parts">
            <span class="part-red">{{ tokenParts[0] }}</span>
            <span class="dot-sep">.</span>
            <span class="part-purple">{{ tokenParts[1] }}</span>
            <span class="dot-sep">.</span>
            <span class="part-blue">{{ tokenParts[2] }}</span>
          </div>
          <el-button size="small" type="primary" @click="copyText(encodedToken)" class="copy-token-btn">
            复制 Token
          </el-button>
        </div>
        <div v-else class="empty-hint">
          <div class="empty-icon">✍️</div>
          <p>填写信息后点击「生成 JWT」</p>
        </div>
      </div>
    </div>

    <!-- ====== 验证模式 ====== -->
    <div v-if="mode === 'verify'" class="verify-body">
      <div class="verify-left">
        <div class="field-group">
          <div class="field-label">JWT Token</div>
          <el-input
            v-model="verifyToken"
            type="textarea"
            :rows="10"
            placeholder="粘贴要验证的 JWT Token..."
            class="code-input"
          />
        </div>

        <div class="field-group">
          <div class="field-label">算法</div>
          <el-select v-model="verifyAlg" size="small" style="width:100%">
            <el-option label="HS256" value="HS256" />
            <el-option label="HS384" value="HS384" />
            <el-option label="HS512" value="HS512" />
            <el-option label="none" value="none" />
          </el-select>
        </div>

        <div class="field-group" v-if="verifyAlg !== 'none'">
          <div class="field-label">密钥 (Secret)</div>
          <el-input
            v-model="verifySecret"
            type="password"
            show-password
            size="small"
            placeholder="输入验证密钥..."
            autocomplete="off"
          />
        </div>

        <el-button type="primary" class="encode-btn" @click="verifyJwt">
          验证签名
        </el-button>
      </div>

      <div class="verify-right">
        <div class="panel-label">验证结果</div>
        <div v-if="verifyResult" class="verify-result">
          <div :class="['verify-badge', verifyResult.valid ? 'badge-ok' : 'badge-fail']">
            {{ verifyResult.valid ? '✅ 签名有效' : '❌ 签名无效' }}
          </div>
          <div v-if="verifyResult.message" class="verify-msg">{{ verifyResult.message }}</div>
          <div v-if="verifyResult.payload" class="verify-payload">
            <div class="section-label" style="margin-bottom:6px">Payload</div>
            <pre class="code-block">{{ prettyJson(verifyResult.payload) }}</pre>
          </div>
          <div v-if="verifyResult.expInfo" :class="['exp-info', verifyResult.expired ? 'expired' : 'valid']">
            {{ verifyResult.expInfo }}
          </div>
        </div>
        <div v-else class="empty-hint">
          <div class="empty-icon">🔍</div>
          <p>输入 Token 和密钥后点击「验证签名」</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useHistoryStore } from '@/stores/history'

const historyStore = useHistoryStore()

// ---- 模式 ----
const mode = ref<'decode' | 'encode' | 'verify'>('decode')

// ---- 解码状态 ----
const jwtInput = ref('')
const decodeError = ref('')
const decoded = ref<{ header: any; payload: any; signature: string } | null>(null)

// ---- 编码状态 ----
const encodeAlg = ref('HS256')
const encodeSecret = ref('')
const encodeHeader = ref('{\n  "alg": "HS256",\n  "typ": "JWT"\n}')
const encodePayload = ref('{\n  "sub": "1234567890",\n  "name": "John Doe"\n}')
const encodedToken = ref('')
const encodeError = ref('')

const payloadPlaceholder = `{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022
}`

// ---- 验证状态 ----
const verifyToken = ref('')
const verifyAlg = ref('HS256')
const verifySecret = ref('')
const verifyResult = ref<{
  valid: boolean
  message?: string
  payload?: any
  expInfo?: string
  expired?: boolean
} | null>(null)

// ---- 工具函数 ----
function base64UrlDecode(str: string): string {
  // 补全 padding
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = str.length % 4
  if (pad === 2) str += '=='
  else if (pad === 3) str += '='
  return decodeURIComponent(
    atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  )
}

function base64UrlEncode(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  )).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64UrlEncodeBytes(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function prettyJson(obj: any): string {
  try { return JSON.stringify(obj, null, 2) } catch { return String(obj) }
}

function formatTs(ts: number): string {
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

function isExpired(exp: number): boolean {
  return Date.now() / 1000 > exp
}

// ---- 解码 ----
function onJwtInput() {
  decodeError.value = ''
  decoded.value = null
  const token = jwtInput.value.trim()
  if (!token) return

  const parts = token.split('.')
  if (parts.length !== 3) {
    decodeError.value = 'JWT 格式错误：应为 Header.Payload.Signature 三段'
    return
  }

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]))
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    decoded.value = { header, payload, signature: parts[2] }
    // 记录解码历史
    historyStore.addRecord('jwt', {
      title: `解码：${jwtInput.value.slice(0, 40)}...`,
      summary: `alg: ${header.alg || '-'}${payload.sub ? ' · sub: ' + payload.sub : ''}`,
      data: {
        '操作': 'JWT 解码',
        'Token': jwtInput.value,
        'Header': JSON.stringify(header, null, 2),
        'Payload': JSON.stringify(payload, null, 2),
      },
    })
  } catch (e: any) {
    decodeError.value = `解码失败：${e?.message || '格式错误'}`
  }
}

// ---- HMAC 签名（Web Crypto API，离线） ----
async function hmacSign(alg: string, secret: string, data: string): Promise<string> {
  const hashAlg = alg === 'HS256' ? 'SHA-256' : alg === 'HS384' ? 'SHA-384' : 'SHA-512'
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: hashAlg },
    false,
    ['sign', 'verify']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return base64UrlEncodeBytes(sig)
}

async function hmacVerify(alg: string, secret: string, data: string, sigB64u: string): Promise<boolean> {
  const hashAlg = alg === 'HS256' ? 'SHA-256' : alg === 'HS384' ? 'SHA-384' : 'SHA-512'
  const enc = new TextEncoder()
  // 将 base64url sig 还原为 ArrayBuffer
  const sigStr = atob(sigB64u.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    sigB64u.length + (4 - sigB64u.length % 4) % 4, '='
  ))
  const sigBuf = new Uint8Array(sigStr.length)
  for (let i = 0; i < sigStr.length; i++) sigBuf[i] = sigStr.charCodeAt(i)

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: hashAlg },
    false,
    ['verify']
  )
  return crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(data))
}

// ---- 编码 ----
// 同步更新 header 算法字段
watch(encodeAlg, (alg) => {
  try {
    const h = JSON.parse(encodeHeader.value)
    h.alg = alg
    encodeHeader.value = prettyJson(h)
  } catch {}
})

async function encodeJwt() {
  encodeError.value = ''
  encodedToken.value = ''

  let header: any, payload: any
  try {
    header = JSON.parse(encodeHeader.value)
  } catch { encodeError.value = 'Header JSON 格式错误'; return }
  try {
    payload = JSON.parse(encodePayload.value)
  } catch { encodeError.value = 'Payload JSON 格式错误'; return }

  if (encodeAlg.value !== 'none' && !encodeSecret.value) {
    encodeError.value = '请输入密钥'; return
  }

  header.alg = encodeAlg.value

  const h = base64UrlEncode(JSON.stringify(header))
  const p = base64UrlEncode(JSON.stringify(payload))
  const unsigned = `${h}.${p}`

  let sig = ''
  if (encodeAlg.value === 'none') {
    sig = ''
  } else {
    try {
      sig = await hmacSign(encodeAlg.value, encodeSecret.value, unsigned)
    } catch (e: any) {
      encodeError.value = `签名失败：${e?.message}`; return
    }
  }

  encodedToken.value = `${unsigned}.${sig}`
  // 记录编码历史
  historyStore.addRecord('jwt', {
    title: `编码：${encodeAlg.value} · ${encodePayload.value.slice(0, 40).replace(/\s+/g, ' ')}`,
    summary: `${encodedToken.value.slice(0, 60)}...`,
    data: {
      '操作': 'JWT 编码',
      '算法': encodeAlg.value,
      'Payload': encodePayload.value,
      '生成Token': encodedToken.value,
    },
  })
}

const tokenParts = computed(() => {
  if (!encodedToken.value) return ['', '', '']
  return encodedToken.value.split('.')
})

// ---- 快捷声明 ----
function insertClaim(type: string) {
  try {
    const obj = JSON.parse(encodePayload.value || '{}')
    const now = Math.floor(Date.now() / 1000)
    if (type === 'iat') obj.iat = now
    else if (type === 'exp1h') obj.exp = now + 3600
    else if (type === 'exp24h') obj.exp = now + 86400
    else if (type === 'exp7d') obj.exp = now + 604800
    encodePayload.value = prettyJson(obj)
  } catch {
    ElMessage.warning('Payload JSON 格式错误，无法插入')
  }
}

// ---- 验证 ----
async function verifyJwt() {
  verifyResult.value = null
  const token = verifyToken.value.trim()
  if (!token) { ElMessage.warning('请输入 JWT Token'); return }

  const parts = token.split('.')
  if (parts.length !== 3) {
    verifyResult.value = { valid: false, message: 'JWT 格式错误：应为三段式' }
    return
  }

  // 解码 payload
  let payload: any = null
  try { payload = JSON.parse(base64UrlDecode(parts[1])) } catch {}

  // 检查过期
  let expInfo = ''
  let expired = false
  if (payload?.exp) {
    expired = isExpired(payload.exp)
    expInfo = expired
      ? `Token 已于 ${formatTs(payload.exp)} 过期`
      : `Token 有效期至 ${formatTs(payload.exp)}`
  }

  if (verifyAlg.value === 'none') {
    verifyResult.value = { valid: parts[2] === '', message: parts[2] === '' ? '无签名 Token' : '签名段不为空', payload, expInfo, expired }
    return
  }

  if (!verifySecret.value) { ElMessage.warning('请输入密钥'); return }

  try {
    const valid = await hmacVerify(verifyAlg.value, verifySecret.value, `${parts[0]}.${parts[1]}`, parts[2])
    verifyResult.value = {
      valid,
      message: valid ? '签名验证通过' : '签名不匹配，密钥错误或 Token 被篡改',
      payload,
      expInfo,
      expired,
    }
  } catch (e: any) {
    verifyResult.value = { valid: false, message: `验证出错：${e?.message}` }
  }
}

// ---- 公共 ----
async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
  ElMessage.success('已复制')
}

function clearAll() {
  jwtInput.value = ''
  decoded.value = null
  decodeError.value = ''
  encodedToken.value = ''
  encodeError.value = ''
  verifyToken.value = ''
  verifyResult.value = null
}
</script>

<style scoped lang="scss">
.jwt-tool {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 0;
}

.tool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.header-left { display: flex; align-items: center; gap: 10px; }
.header-right { display: flex; gap: 8px; align-items: center; }
.tool-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }

/* ── 共用布局 ── */
.decode-body,
.encode-body,
.verify-body {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
  min-height: 0;
}

.panel-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  flex-shrink: 0;
}

/* ── 解码 ── */
.input-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.jwt-textarea {
  flex: 1;
  :deep(.el-textarea__inner) {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    min-height: 120px;
    resize: none;
    background: #ffffff;
    color: #1a1a1a;
  }
}

.error-tip {
  font-size: 12px;
  color: #f56c6c;
  padding: 4px 6px;
  background: #fef0f0;
  border-radius: 4px;
  flex-shrink: 0;
}

.result-panel {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 12px;
  min-height: 0;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.2); border-radius: 3px; }
}

/* JWT 三色分段 */
.jwt-section {
  background: #ffffff;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #444;
  flex-shrink: 0;
}

.dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  &.dot-red { background: #fb015b; }
  &.dot-purple { background: #d63aff; }
  &.dot-blue { background: #00b9f1; }
}

.section-content { flex-shrink: 0; }

.code-block {
  margin: 0;
  padding: 8px 10px;
  background: #f8f9fc;
  border-radius: 6px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: #1a1a1a;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

.section-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #555;
  flex-shrink: 0;
}

.payload-meta {
  flex-direction: column;
  gap: 4px;
}

.meta-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
}

.meta-key {
  font-size: 11px;
  font-weight: 700;
  color: #888;
  min-width: 32px;
  font-family: monospace;
}

.expired { color: #f56c6c; font-weight: 600; }
.sig-text {
  font-family: 'Monaco', monospace;
  font-size: 11px;
  color: #00b9f1;
  word-break: break-all;
  padding: 8px 10px;
  background: #f0faff;
  border-radius: 6px;
}

.copy-btn-bottom { width: 100%; flex-shrink: 0; }

/* ── 编码 ── */
.encode-left {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 4px;
  min-height: 0;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.2); border-radius: 2px; }
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
}

.code-input {
  :deep(.el-textarea__inner) {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    background: #ffffff;
    color: #1a1a1a;
    resize: none;
  }
}

.quick-claims {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.encode-btn { width: 100%; flex-shrink: 0; }

.encode-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.token-output {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #ffffff;
  border-radius: 8px;
  padding: 12px;
  overflow: auto;
}

.token-parts {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  word-break: break-all;
  line-height: 1.7;
}

.part-red { color: #fb015b; }
.part-purple { color: #d63aff; }
.part-blue { color: #00b9f1; }
.dot-sep { color: #333; font-weight: 700; margin: 0 1px; }

.copy-token-btn { flex-shrink: 0; }

/* ── 验证 ── */
.verify-left {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  min-height: 0;
}

.verify-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  gap: 10px;
  padding-bottom: 12px;
}

.verify-result {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.verify-badge {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  flex-shrink: 0;

  &.badge-ok { background: #f0f9eb; color: #67c23a; border: 1px solid #b3e19d; }
  &.badge-fail { background: #fef0f0; color: #f56c6c; border: 1px solid #fbc4c4; }
}

.verify-msg {
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.verify-payload {
  background: #ffffff;
  border-radius: 8px;
  padding: 10px 12px;
}

.exp-info {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  flex-shrink: 0;

  &.expired { background: #fef0f0; color: #f56c6c; }
  &.valid { background: #f0f9eb; color: #67c23a; }
}

/* ── 空状态 ── */
.empty-hint {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  gap: 8px;
  .empty-icon { font-size: 36px; }
  p { font-size: 13px; margin: 0; }
  .hint-sub { font-size: 11px; opacity: 0.7; }
}
</style>
