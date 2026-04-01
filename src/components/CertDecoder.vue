<template>
  <div class="cert-tool">
    <!-- 顶部操作栏 -->
    <div class="tool-header">
      <div class="header-left">
        <span class="tool-title">证书解码</span>
        <el-tag size="small" type="info">离线解析 · 数据不离本机</el-tag>
      </div>
      <div class="header-right">
        <el-button size="small" @click="clearAll">清空</el-button>
      </div>
    </div>

    <!-- 主体：左输入 右结果 -->
    <div class="cert-body">
      <!-- 左侧：输入区 -->
      <div class="input-panel">
        <div class="panel-header">
          <span>输入证书</span>
          <div class="input-actions">
            <el-button size="small" @click="triggerFileInput">📂 上传文件</el-button>
            <input ref="fileInputRef" type="file" accept=".cer,.crt,.pem,.pfx,.p12,.p7b,.der" style="display:none" @change="onFileChange" />
          </div>
        </div>

        <!-- 格式选择 -->
        <div class="format-row">
          <el-radio-group v-model="inputFormat" size="small">
            <el-radio-button value="auto">自动检测</el-radio-button>
            <el-radio-button value="pem">PEM</el-radio-button>
            <el-radio-button value="der">DER/CER</el-radio-button>
            <el-radio-button value="pfx">PFX/P12</el-radio-button>
          </el-radio-group>
        </div>

        <!-- PEM / 文本输入 -->
        <el-input
          v-if="inputFormat !== 'pfx'"
          v-model="pemInput"
          type="textarea"
          :rows="16"
          placeholder="粘贴 PEM 格式证书（-----BEGIN CERTIFICATE-----）或 Base64 DER 内容..."
          class="cert-textarea"
          @input="onInputChange"
        />

        <!-- PFX 密码 -->
        <div v-if="inputFormat === 'pfx' || (fileBytes && isPfxFile)" class="pfx-pwd-row">
          <el-input
            v-model="pfxPassword"
            type="password"
            show-password
            placeholder="PFX/P12 密码（无密码留空）"
            size="small"
          />
        </div>

        <!-- 文件已选提示 -->
        <div v-if="fileName" class="file-hint">
          <el-tag size="small" type="success">{{ fileName }}</el-tag>
          <el-button type="text" size="small" @click="clearFile">×</el-button>
        </div>

        <el-button type="primary" class="parse-btn" @click="parseCert" :loading="parsing">
          解析证书
        </el-button>

        <div v-if="parseError" class="parse-error">
          <el-alert :title="parseError" type="error" show-icon :closable="false" />
        </div>
      </div>

      <!-- 右侧：解析结果 -->
      <div class="result-panel">
        <div class="panel-header">
          <span>解析结果</span>
          <div v-if="certInfo" class="result-actions">
            <el-button size="small" @click="copyResult">复制全部</el-button>
          </div>
        </div>

        <div v-if="!certInfo" class="empty-result">
          <div class="empty-icon">🔏</div>
          <p>支持格式：PEM · DER · CER · CRT · PFX/P12 · 国密 SM2</p>
        </div>

        <div v-else class="cert-result">
          <!-- 证书类型标签 -->
          <div class="cert-type-row">
            <el-tag :type="certInfo.isGM ? 'warning' : 'primary'" size="default">
              {{ certInfo.isGM ? '🇨🇳 国密证书 (SM2)' : '🌐 国际标准证书' }}
            </el-tag>
            <el-tag type="info" size="default">{{ certInfo.certType }}</el-tag>
            <el-tag :type="certInfo.isExpired ? 'danger' : 'success'" size="default">
              {{ certInfo.isExpired ? '已过期' : '有效' }}
            </el-tag>
          </div>

          <!-- 信息分组 -->
          <div class="info-group" v-for="group in certInfo.groups" :key="group.title">
            <div class="group-title">{{ group.title }}</div>
            <div class="info-table">
              <div v-for="item in group.items" :key="item.label" class="info-row">
                <div class="info-label">{{ item.label }}</div>
                <div class="info-value">
                  <span :class="{ 'mono': item.mono, 'expired-text': item.expired }">{{ item.value }}</span>
                  <el-button v-if="item.copyable" type="text" size="small" class="copy-btn" @click="copyText(item.value)">
                    复制
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 扩展字段 -->
          <div v-if="certInfo.extensions.length" class="info-group">
            <div class="group-title">扩展字段</div>
            <div class="info-table">
              <div v-for="ext in certInfo.extensions" :key="ext.oid" class="info-row ext-row">
                <div class="info-label">{{ ext.name || ext.oid }}</div>
                <div class="info-value ext-value">
                  <span class="mono ext-text">{{ ext.value }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- SAN -->
          <div v-if="certInfo.sans.length" class="info-group">
            <div class="group-title">主体备用名称 (SAN)</div>
            <div class="san-list">
              <el-tag v-for="san in certInfo.sans" :key="san" size="small" type="info" class="san-tag">
                {{ san }}
              </el-tag>
            </div>
          </div>

          <!-- 指纹 -->
          <div v-if="certInfo.fingerprints.length" class="info-group">
            <div class="group-title">指纹</div>
            <div class="info-table">
              <div v-for="fp in certInfo.fingerprints" :key="fp.algo" class="info-row">
                <div class="info-label">{{ fp.algo }}</div>
                <div class="info-value">
                  <span class="mono fp-text">{{ fp.value }}</span>
                  <el-button type="text" size="small" class="copy-btn" @click="copyText(fp.value)">复制</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as asn1js from 'asn1js'
import { Certificate } from 'pkijs'

// ---- 状态 ----
const pemInput = ref('')
const inputFormat = ref<'auto' | 'pem' | 'der' | 'pfx'>('auto')
const pfxPassword = ref('')
const fileName = ref('')
const fileBytes = ref<ArrayBuffer | null>(null)
const isPfxFile = ref(false)
const parsing = ref(false)
const parseError = ref('')
const fileInputRef = ref<HTMLInputElement>()

interface CertInfoItem {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
  expired?: boolean
}

interface CertInfoGroup {
  title: string
  items: CertInfoItem[]
}

interface Extension {
  oid: string
  name: string
  value: string
  critical?: boolean
}

interface Fingerprint {
  algo: string
  value: string
}

interface CertInfo {
  isGM: boolean
  isExpired: boolean
  certType: string
  groups: CertInfoGroup[]
  extensions: Extension[]
  sans: string[]
  fingerprints: Fingerprint[]
  rawText: string
}

const certInfo = ref<CertInfo | null>(null)

// ---- OID 映射表 ----
const OID_MAP: Record<string, string> = {
  '2.5.4.3': 'CN (通用名)',
  '2.5.4.6': 'C (国家)',
  '2.5.4.7': 'L (城市)',
  '2.5.4.8': 'ST (省份)',
  '2.5.4.10': 'O (组织)',
  '2.5.4.11': 'OU (部门)',
  '2.5.4.5': 'serialNumber',
  '1.2.840.113549.1.9.1': 'emailAddress',
  // 签名算法
  '1.2.840.113549.1.1.5': 'SHA1withRSA',
  '1.2.840.113549.1.1.11': 'SHA256withRSA',
  '1.2.840.113549.1.1.12': 'SHA384withRSA',
  '1.2.840.113549.1.1.13': 'SHA512withRSA',
  '1.2.840.10045.4.3.2': 'SHA256withECDSA',
  '1.2.840.10045.4.3.3': 'SHA384withECDSA',
  '1.2.840.10045.4.3.4': 'SHA512withECDSA',
  // 国密
  '1.2.156.10197.1.501': 'SM2withSM3 (国密)',
  '1.2.156.10197.1.401': 'SM3',
  '1.2.156.10197.1.301': 'SM2 (椭圆曲线)',
  '1.2.156.10197.1.301.1': 'SM2-1',
  '1.2.156.10197.1.301.2': 'SM2-2',
  '1.2.156.10197.1.301.3': 'SM2-3',
  // 扩展
  '2.5.29.17': 'Subject Alternative Name',
  '2.5.29.15': 'Key Usage',
  '2.5.29.37': 'Extended Key Usage',
  '2.5.29.19': 'Basic Constraints',
  '2.5.29.14': 'Subject Key Identifier',
  '2.5.29.35': 'Authority Key Identifier',
  '2.5.29.31': 'CRL Distribution Points',
  '1.3.6.1.5.5.7.1.1': 'Authority Info Access',
  '2.5.29.32': 'Certificate Policies',
  // 公钥类型
  '1.2.840.113549.1.1.1': 'RSA',
  '1.2.840.10045.2.1': 'EC (椭圆曲线)',
  // EC 曲线
  '1.2.840.10045.3.1.7': 'P-256 (secp256r1)',
  '1.3.132.0.34': 'P-384 (secp384r1)',
  '1.3.132.0.35': 'P-521 (secp521r1)',
}

const GM_SIGN_OIDS = new Set([
  '1.2.156.10197.1.501',
  '1.2.156.10197.1.301',
  '1.2.156.10197.1.301.1',
  '1.2.156.10197.1.301.2',
  '1.2.156.10197.1.301.3',
])

// ---- 工具函数 ----
function oidName(oid: string): string {
  return OID_MAP[oid] || oid
}

function bufToHex(buf: ArrayBuffer, sep = ':'): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(sep)
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return bufToHex(hash)
}

async function sha1Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-1', buf)
  return bufToHex(hash)
}

function rdnToString(rdn: any): string {
  try {
    const parts: string[] = []
    for (const typeAndValue of rdn.typesAndValues) {
      const type = typeAndValue.type
      const val = typeAndValue.value?.valueBlock?.value || typeAndValue.value?.toString() || ''
      const name = OID_MAP[type] || type
      parts.push(`${name}=${val}`)
    }
    return parts.join(', ')
  } catch {
    return rdn?.toString() || ''
  }
}

function parseDateStr(d: any): string {
  try {
    const v = d?.value || d
    if (v instanceof Date) return v.toLocaleString('zh-CN')
    if (typeof v === 'string') return new Date(v).toLocaleString('zh-CN')
    return String(v)
  } catch {
    return ''
  }
}

function isExpiredDate(d: any): boolean {
  try {
    const v = d?.value || d
    const date = v instanceof Date ? v : new Date(v)
    return date < new Date()
  } catch {
    return false
  }
}

// ---- PEM 解析 ----
function stripPem(pem: string): ArrayBuffer {
  const lines = pem.split('\n').filter(l => !l.startsWith('-----') && l.trim())
  const b64 = lines.join('')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function detectFormat(input: string, bytes: ArrayBuffer | null): 'pem' | 'der' | 'pfx' {
  if (inputFormat.value !== 'auto') return inputFormat.value as any

  if (input.trim().startsWith('-----BEGIN')) return 'pem'

  if (bytes) {
    const view = new Uint8Array(bytes)
    // PFX magic: 0x30 0x82... + later version, or check file ext
    if (isPfxFile.value) return 'pfx'
    // DER starts with 0x30 (ASN.1 SEQUENCE)
    if (view[0] === 0x30) return 'der'
  }

  // 尝试 base64 DER
  try {
    atob(input.trim())
    return 'der'
  } catch {
    return 'pem'
  }
}

// 解析 SAN 扩展
function parseSAN(ext: any): string[] {
  const result: string[] = []
  try {
    const parsed = ext.parsedValue
    if (!parsed?.altNames) return result
    for (const alt of parsed.altNames) {
      const t = alt.type
      if (t === 2) result.push(`DNS: ${alt.value}`)
      else if (t === 7) result.push(`IP: ${alt.value}`)
      else if (t === 1) result.push(`Email: ${alt.value}`)
      else if (t === 6) result.push(`URI: ${alt.value}`)
      else result.push(`[${t}]: ${alt.value}`)
    }
  } catch {}
  return result
}

// 解析 Key Usage
function parseKeyUsage(ext: any): string {
  try {
    const bits = ext.parsedValue?.valueBlock?.valueHex
    if (!bits) return ''
    const usages = ['Digital Signature', 'Non Repudiation', 'Key Encipherment',
      'Data Encipherment', 'Key Agreement', 'Key Cert Sign', 'CRL Sign',
      'Encipher Only', 'Decipher Only']
    const byte0 = new Uint8Array(bits)[1] || 0
    return usages.filter((_, i) => byte0 & (0x80 >> i)).join(', ')
  } catch { return '' }
}

// 解析 Basic Constraints
function parseBasicConstraints(ext: any): string {
  try {
    const isCA = ext.parsedValue?.cA
    const pathLen = ext.parsedValue?.pathLenConstraint
    return isCA ? `CA: true${pathLen !== undefined ? `, PathLen: ${pathLen}` : ''}` : 'CA: false'
  } catch { return '' }
}

// ---- 核心解析 ----
async function parseDerBuffer(der: ArrayBuffer): Promise<CertInfo> {
  const asn1 = asn1js.fromBER(der)
  if (asn1.offset === -1) throw new Error('ASN.1 解析失败，数据格式不正确')

  const cert = new Certificate({ schema: asn1.result })

  // 签名算法 OID
  const sigOid = cert.signatureAlgorithm?.algorithmId || ''
  const isGM = GM_SIGN_OIDS.has(sigOid)

  // 有效期
  const expired = isExpiredDate(cert.notAfter)

  // 公钥算法
  const pubKeyOid = cert.subjectPublicKeyInfo?.algorithm?.algorithmId || ''
  const pubKeyAlgo = oidName(pubKeyOid)
  let pubKeyBits = ''
  try {
    const pkParams = cert.subjectPublicKeyInfo?.algorithm?.algorithmParams
    if (pkParams) {
      const curveOid = pkParams?.valueBlock?.value?.[0]?.valueBlock?.value
      if (curveOid) pubKeyBits = oidName(curveOid)
    }
    // RSA: parse modulus size
    if (pubKeyOid === '1.2.840.113549.1.1.1') {
      const pkDer = cert.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView
      const pkAsn = asn1js.fromBER(pkDer)
      const modulus = (pkAsn.result as any)?.valueBlock?.value?.[0]
      if (modulus) {
        const len = modulus.valueBlock?.valueHexView?.length
        if (len) pubKeyBits = `${(len - 1) * 8} bit`
      }
    }
  } catch {}

  // 序列号
  const serialHex = bufToHex((cert.serialNumber.valueBlock.valueHexView as unknown as Uint8Array).buffer as ArrayBuffer, ':')

  // 版本
  const version = `v${(cert.version ?? 0) + 1}`

  // 证书类型
  let certType = '终端证书'
  let isCA = false
  let sans: string[] = []
  const extensions: Extension[] = []

  for (const ext of cert.extensions || []) {
    const oid = ext.extnID
    const name = oidName(oid)
    let value = ''

    if (oid === '2.5.29.17') {
      sans = parseSAN(ext)
      value = sans.join(' | ')
    } else if (oid === '2.5.29.15') {
      value = parseKeyUsage(ext)
    } else if (oid === '2.5.29.19') {
      value = parseBasicConstraints(ext)
      if (value.includes('CA: true')) {
        isCA = true
        certType = '中间CA证书'
      }
    } else {
      try {
        value = ext.parsedValue?.toString?.() || ''
        if (!value && ext.extnValue) {
          value = bufToHex((ext.extnValue.valueBlock.valueHexView as unknown as Uint8Array).buffer as ArrayBuffer)
        }
      } catch {
        value = '[无法解析]'
      }
    }

    if (value) {
      extensions.push({ oid, name, value, critical: ext.critical })
    }
  }

  // 自签名检测
  const subjectStr = rdnToString(cert.subject)
  const issuerStr = rdnToString(cert.issuer)
  if (subjectStr === issuerStr && isCA) certType = '根CA证书'

  // 指纹
  const fp256 = await sha256Hex(der)
  const fp1 = await sha1Hex(der)

  // 构建结果
  const groups: CertInfoGroup[] = [
    {
      title: '主体信息 (Subject)',
      items: [{ label: '主体', value: subjectStr, mono: true, copyable: true }],
    },
    {
      title: '颁发者信息 (Issuer)',
      items: [{ label: '颁发者', value: issuerStr, mono: true, copyable: true }],
    },
    {
      title: '有效期',
      items: [
        { label: '生效时间', value: parseDateStr(cert.notBefore) },
        { label: '过期时间', value: parseDateStr(cert.notAfter), expired },
      ],
    },
    {
      title: '证书信息',
      items: [
        { label: '版本', value: version },
        { label: '序列号', value: serialHex, mono: true, copyable: true },
        { label: '签名算法', value: oidName(sigOid) },
        { label: '公钥算法', value: `${pubKeyAlgo}${pubKeyBits ? ' · ' + pubKeyBits : ''}` },
      ],
    },
  ]

  const rawLines: string[] = [
    `主体: ${subjectStr}`,
    `颁发者: ${issuerStr}`,
    `生效: ${parseDateStr(cert.notBefore)}`,
    `过期: ${parseDateStr(cert.notAfter)}`,
    `版本: ${version}`,
    `序列号: ${serialHex}`,
    `签名算法: ${oidName(sigOid)}`,
    `公钥: ${pubKeyAlgo} ${pubKeyBits}`,
    `SHA-256指纹: ${fp256}`,
    `SHA-1指纹: ${fp1}`,
    ...(sans.length ? [`SAN: ${sans.join(', ')}`] : []),
  ]

  return {
    isGM,
    isExpired: expired,
    certType,
    groups,
    extensions: extensions.slice(0, 20),
    sans,
    fingerprints: [
      { algo: 'SHA-256', value: fp256 },
      { algo: 'SHA-1', value: fp1 },
    ],
    rawText: rawLines.join('\n'),
  }
}

// ---- 主解析入口 ----
async function parseCert() {
  parseError.value = ''
  certInfo.value = null
  parsing.value = true

  try {
    let derBuf: ArrayBuffer | null = null
    const fmt = detectFormat(pemInput.value, fileBytes.value)

    if (fmt === 'pfx') {
      let raw: ArrayBuffer | null = fileBytes.value
      if (!raw && pemInput.value) {
        const binary = atob(pemInput.value.trim())
        const buf = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
        raw = buf.buffer
      }
      if (!raw) throw new Error('请上传 PFX 文件')
      derBuf = await extractCertFromPfx(raw)
    } else if (fmt === 'pem') {
      const pem = pemInput.value.trim()
      if (!pem) throw new Error('请输入 PEM 证书内容')
      // 支持多证书链，取第一个
      const match = pem.match(/-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/)
      if (!match) throw new Error('未找到有效的 PEM 证书块（-----BEGIN CERTIFICATE-----）')
      derBuf = stripPem(match[0])
    } else {
      // DER：可能是文件二进制，也可能是 base64 文本
      if (fileBytes.value) {
        derBuf = fileBytes.value
      } else {
        const b64 = pemInput.value.trim().replace(/\s/g, '')
        const binary = atob(b64)
        const buf = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
        derBuf = buf.buffer
      }
    }

    if (!derBuf) throw new Error('无法获取证书数据')

    certInfo.value = await parseDerBuffer(derBuf)
  } catch (e: any) {
    parseError.value = `解析失败: ${e?.message || String(e)}`
  } finally {
    parsing.value = false
  }
}

// ---- PFX 中提取第一个 Certificate ----
async function extractCertFromPfx(pfxBuf: ArrayBuffer): Promise<ArrayBuffer> {
  const asn1 = asn1js.fromBER(pfxBuf)
  if (asn1.offset === -1) throw new Error('PFX 文件格式错误')

  // 直接搜索 DER 字节中的 Certificate 边界
  const view = new Uint8Array(pfxBuf)
  for (let i = 0; i < view.length - 4; i++) {
    if (view[i] === 0x30) {
      // 尝试从此处解析
      try {
        const slice = pfxBuf.slice(i)
        const a = asn1js.fromBER(slice)
        if (a.offset > 0) {
          const c = new Certificate({ schema: a.result })
          if (c.serialNumber && c.notBefore && c.notAfter) {
            return slice.slice(0, a.offset)
          }
        }
      } catch {}
    }
  }

  throw new Error('PFX 中未找到有效证书，或证书已加密（本工具暂不支持带密码的私钥解密）')
}

// ---- 文件处理 ----
function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  fileName.value = file.name
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  isPfxFile.value = ['pfx', 'p12'].includes(ext)

  const reader = new FileReader()
  reader.onload = (ev) => {
    fileBytes.value = ev.target?.result as ArrayBuffer
    pemInput.value = ''

    if (['pem', 'crt', 'cer', 'csr'].includes(ext)) {
      // 读文本
      const textReader = new FileReader()
      textReader.onload = (te) => {
        pemInput.value = te.target?.result as string
        fileBytes.value = null
      }
      textReader.readAsText(file)
    }
  }
  reader.readAsArrayBuffer(file)
}

function onInputChange() {
  fileBytes.value = null
  fileName.value = ''
  isPfxFile.value = false
}

function clearFile() {
  fileName.value = ''
  fileBytes.value = null
  isPfxFile.value = false
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function clearAll() {
  pemInput.value = ''
  certInfo.value = null
  parseError.value = ''
  pfxPassword.value = ''
  clearFile()
}

async function copyResult() {
  if (!certInfo.value) return
  await navigator.clipboard.writeText(certInfo.value.rawText)
  ElMessage.success('已复制')
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
  ElMessage.success('已复制')
}
</script>

<style scoped lang="scss">
.cert-tool {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.tool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.header-left { display: flex; align-items: center; gap: 10px; }
.header-right { display: flex; gap: 8px; }

.tool-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

/* ── 主体 ── */
.cert-body {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
  min-height: 0;
}

.input-panel,
.result-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  min-height: 0;
}

.input-panel {
  width: 360px;
  flex-shrink: 0;
}

.result-panel {
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.2); border-radius: 3px; }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

/* ── 输入 ── */
.format-row {
  flex-shrink: 0;
}

.cert-textarea {
  flex: 1;
  min-height: 0;
  :deep(.el-textarea__inner) {
    height: 100%;
    min-height: 240px;
    resize: none;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    background: #ffffff;
    color: #1a1a1a;
  }
}

.pfx-pwd-row { flex-shrink: 0; }

.file-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.parse-btn {
  width: 100%;
  flex-shrink: 0;
}

.parse-error { flex-shrink: 0; }

/* ── 结果 ── */
.empty-result {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  gap: 10px;
  .empty-icon { font-size: 40px; }
  p { font-size: 13px; }
}

.cert-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 12px;
  background: #ffffff;
  color: #1a1a1a;
  border-radius: 8px;
  padding: 12px;
}

.cert-type-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.info-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-title {
  font-size: 11px;
  font-weight: 700;
  color: #667eea;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding-bottom: 4px;
  border-bottom: 1px solid #e4e7ed;
}

.info-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 12px;
  padding: 4px 6px;
  border-radius: 4px;
  background: #f8f9fc;

  &:hover { background: #f0f2f8; }
}

.info-label {
  min-width: 90px;
  font-size: 11px;
  font-weight: 600;
  color: #888;
  flex-shrink: 0;
  padding-top: 1px;
}

.info-value {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  word-break: break-all;
  color: #1a1a1a;
}

.mono {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 11px;
}

.expired-text { color: #f56c6c; font-weight: 600; }

.copy-btn {
  color: #667eea;
  flex-shrink: 0;
  font-size: 11px;
  padding: 0 2px;
}

/* 扩展字段 */
.ext-row { align-items: flex-start; }
.ext-value { max-height: 60px; overflow-y: auto; }
.ext-text { font-size: 10px; word-break: break-all; color: #555; }

/* SAN */
.san-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.san-tag { font-family: monospace; }

/* 指纹 */
.fp-text {
  font-size: 11px;
  word-break: break-all;
  color: #444;
}
</style>
