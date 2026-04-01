<template>
  <div class="regex-tool">
    <div class="tool-header">
      <span class="tool-title">正则表达式解析</span>
    </div>

    <div class="regex-body">
      <!-- 左侧：输入区 -->
      <div class="input-panel">
        <!-- 正则输入 -->
        <div class="field-label">正则表达式</div>
        <div class="regex-input-row">
          <span class="delimiter">/</span>
          <el-input
            v-model="regexInput"
            placeholder="输入正则表达式..."
            class="regex-main-input"
            @input="onInput"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
          <span class="delimiter">/</span>
          <el-input
            v-model="flagsInput"
            placeholder="flags"
            class="regex-flags-input"
            @input="onInput"
            autocomplete="off"
            maxlength="8"
            spellcheck="false"
          />
        </div>

        <!-- 常用 flags -->
        <div class="flags-row">
          <span class="field-label" style="margin-bottom:0">常用标志：</span>
          <el-checkbox v-model="flagG" label="g" size="small" @change="syncFlags">全局</el-checkbox>
          <el-checkbox v-model="flagI" label="i" size="small" @change="syncFlags">忽略大小写</el-checkbox>
          <el-checkbox v-model="flagM" label="m" size="small" @change="syncFlags">多行</el-checkbox>
          <el-checkbox v-model="flagS" label="s" size="small" @change="syncFlags">dotAll</el-checkbox>
        </div>

        <!-- 错误提示 -->
        <div v-if="regexError" class="regex-error">
          <el-alert :title="regexError" type="error" show-icon :closable="false" size="small" />
        </div>

        <!-- 测试文本 -->
        <div class="field-label" style="margin-top:12px">测试文本</div>
        <el-input
          v-model="testInput"
          type="textarea"
          :rows="6"
          placeholder="输入测试文本，实时高亮匹配结果..."
          class="test-textarea"
          @input="onInput"
        />

        <!-- 匹配统计 -->
        <div v-if="regexInput && !regexError" class="match-stats">
          <el-tag size="small" :type="matchCount > 0 ? 'success' : 'info'">
            {{ matchCount > 0 ? `${matchCount} 个匹配` : '无匹配' }}
          </el-tag>
          <el-tag v-for="g in groupCount" :key="g" size="small" type="warning">
            第{{ g }}组
          </el-tag>
        </div>

        <!-- 高亮预览 -->
        <div v-if="testInput && regexInput && !regexError" class="match-preview">
          <div class="field-label">匹配高亮</div>
          <div class="highlight-box" v-html="highlightedText"></div>
        </div>

        <!-- 匹配列表 -->
        <div v-if="matches.length > 0" class="match-list">
          <div class="field-label">匹配结果（{{ matches.length }} 条）</div>
          <div v-for="(m, i) in matches" :key="i" class="match-item">
            <div class="match-header">
              <span class="match-index">#{{ i + 1 }}</span>
              <span class="match-value mono">{{ m.value }}</span>
              <span class="match-pos">位置 {{ m.index }}–{{ m.index + m.value.length }}</span>
            </div>
            <div v-if="m.groups.length > 0" class="match-groups">
              <span v-for="(g, gi) in m.groups" :key="gi" class="match-group">
                <span class="group-idx">组{{ gi + 1 }}</span>
                <span class="mono">{{ g ?? '(未捕获)' }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：解析描述 -->
      <div class="desc-panel">
        <div class="field-label">结构解析</div>

        <div v-if="!regexInput" class="empty-desc">
          <div class="empty-icon">🔍</div>
          <p>输入正则表达式，即可看到详细结构解析</p>
        </div>

        <div v-else-if="regexError" class="empty-desc">
          <div class="empty-icon">❌</div>
          <p>正则表达式有误，请检查语法</p>
        </div>

        <div v-else class="desc-list">
          <!-- 总览 -->
          <div class="desc-overview">
            <div class="overview-text">
              <span class="regex-display">/{{ regexInput }}/{{ flagsInput }}</span>
            </div>
            <div class="overview-desc">{{ overallDesc }}</div>
          </div>

          <!-- Flags 说明 -->
          <div v-if="flagDescs.length" class="desc-section">
            <div class="section-title">标志位</div>
            <div v-for="f in flagDescs" :key="f.flag" class="desc-item flag-item">
              <span class="token-badge flag-badge">{{ f.flag }}</span>
              <span class="desc-text">{{ f.desc }}</span>
            </div>
          </div>

          <!-- Token 逐个解析 -->
          <div class="desc-section">
            <div class="section-title">结构详解</div>
            <div
              v-for="(token, i) in parsedTokens"
              :key="i"
              class="desc-item"
              :class="token.type"
            >
              <span class="token-badge" :style="{ background: tokenColor(token.type) }">
                {{ token.raw }}
              </span>
              <div class="token-info">
                <div class="token-name">{{ token.name }}</div>
                <div class="token-desc">{{ token.desc }}</div>
              </div>
            </div>
          </div>

          <!-- 命名捕获组 -->
          <div v-if="namedGroups.length" class="desc-section">
            <div class="section-title">命名捕获组</div>
            <div v-for="g in namedGroups" :key="g" class="desc-item">
              <span class="token-badge" style="background:#667eea">(?&lt;{{ g }}&gt;...)</span>
              <span class="desc-text">捕获组，命名为 <code>{{ g }}</code></span>
            </div>
          </div>

          <!-- 常见用途猜测 -->
          <div v-if="guessedUse" class="desc-section">
            <div class="section-title">可能的用途</div>
            <div class="use-tag">{{ guessedUse }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// ---- 状态 ----
const regexInput = ref('')
const flagsInput = ref('')
const testInput = ref('')
const regexError = ref('')

const flagG = ref(false)
const flagI = ref(false)
const flagM = ref(false)
const flagS = ref(false)

function syncFlags() {
  let f = ''
  if (flagG.value) f += 'g'
  if (flagI.value) f += 'i'
  if (flagM.value) f += 'm'
  if (flagS.value) f += 's'
  flagsInput.value = f
  onInput()
}

// 反向同步 flagsInput → checkboxes
watch(flagsInput, (v) => {
  flagG.value = v.includes('g')
  flagI.value = v.includes('i')
  flagM.value = v.includes('m')
  flagS.value = v.includes('s')
})

function onInput() {
  regexError.value = ''
  if (!regexInput.value) return
  try {
    new RegExp(regexInput.value, flagsInput.value)
  } catch (e: any) {
    regexError.value = e.message
  }
}

// ---- 匹配 ----
interface MatchResult {
  value: string
  index: number
  groups: (string | undefined)[]
}

const matches = computed<MatchResult[]>(() => {
  if (!regexInput.value || regexError.value || !testInput.value) return []
  try {
    const flags = flagsInput.value.includes('g') ? flagsInput.value : flagsInput.value + 'g'
    const re = new RegExp(regexInput.value, flags)
    const results: MatchResult[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(testInput.value)) !== null) {
      results.push({
        value: m[0],
        index: m.index,
        groups: m.slice(1),
      })
      if (!flagsInput.value.includes('g')) break
      if (m[0].length === 0) re.lastIndex++ // 防死循环
    }
    return results
  } catch {
    return []
  }
})

const matchCount = computed(() => matches.value.length)

const groupCount = computed(() => {
  if (!regexInput.value) return []
  let count = 0
  try { count = new RegExp(regexInput.value + '|').exec('')!.length - 1 } catch {}
  return count > 0 ? Array.from({ length: count }, (_, i) => i + 1) : []
})

// ---- 高亮 ----
const highlightedText = computed(() => {
  if (!testInput.value || !regexInput.value || regexError.value) {
    return escHtml(testInput.value)
  }
  try {
    const flags = flagsInput.value.includes('g') ? flagsInput.value : flagsInput.value + 'g'
    const re = new RegExp(regexInput.value, flags)
    const colors = ['#ffe066', '#a8edea', '#fed6e3', '#d4fc79', '#c2e9fb']
    let colorIdx = 0
    return testInput.value.replace(re, (match) => {
      const color = colors[colorIdx % colors.length]
      colorIdx++
      return `<mark style="background:${color};border-radius:2px;padding:0 1px">${escHtml(match)}</mark>`
    })
  } catch {
    return escHtml(testInput.value)
  }
})

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ---- Flags 说明 ----
const FLAG_DESCS: Record<string, string> = {
  g: '全局匹配（global）：找出所有匹配，而非找到第一个后停止',
  i: '忽略大小写（ignoreCase）：匹配时不区分字母大小写',
  m: '多行模式（multiline）：^ 和 $ 匹配每行的开头和结尾',
  s: 'dotAll 模式：. 可以匹配换行符 \\n，默认 . 不匹配换行',
  u: 'Unicode 模式：正确处理 Unicode 字符（如 emoji、中文）',
  y: '粘连模式（sticky）：从 lastIndex 位置开始匹配，不向后搜索',
  d: '生成匹配索引（indices）：每个捕获组附带起止位置信息',
}

const flagDescs = computed(() => {
  return flagsInput.value.split('').filter(f => FLAG_DESCS[f]).map(f => ({
    flag: f,
    desc: FLAG_DESCS[f],
  }))
})

// ---- Token 解析引擎 ----
interface Token {
  raw: string
  type: string
  name: string
  desc: string
}

function tokenColor(type: string): string {
  const map: Record<string, string> = {
    anchor: '#667eea',
    quantifier: '#f0b429',
    charclass: '#67c23a',
    group: '#409eff',
    lookahead: '#e6a23c',
    special: '#909399',
    literal: '#606266',
    alternation: '#c0392b',
    backreference: '#8e44ad',
    escape: '#16a085',
  }
  return map[type] || '#909399'
}

// 核心解析函数
function parseRegex(pattern: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < pattern.length) {
    const ch = pattern[i]

    // 转义序列
    if (ch === '\\' && i + 1 < pattern.length) {
      const next = pattern[i + 1]
      const raw = '\\' + next
      const t = parseEscape(next, pattern, i)
      tokens.push({ raw, ...t })
      i += 2
      // \p{...} 或 \k<name>
      if (next === 'p' || next === 'P' || next === 'k') {
        // 已在 parseEscape 处理多字符，此处跳过额外字符
        const extra = pattern.slice(i)
        if (next === 'k' && extra.startsWith('<')) {
          const end = extra.indexOf('>')
          if (end !== -1) {
            tokens[tokens.length - 1].raw += extra.slice(0, end + 1)
            i += end + 1
          }
        } else if ((next === 'p' || next === 'P') && extra.startsWith('{')) {
          const end = extra.indexOf('}')
          if (end !== -1) {
            tokens[tokens.length - 1].raw += extra.slice(0, end + 1)
            i += end + 1
          }
        }
      }
      continue
    }

    // 字符类 [...]
    if (ch === '[') {
      const end = findCharClassEnd(pattern, i)
      const raw = pattern.slice(i, end + 1)
      tokens.push({ raw, ...parseCharClass(raw) })
      i = end + 1
      continue
    }

    // 分组 (...)
    if (ch === '(') {
      const ahead = pattern.slice(i + 1)

      if (ahead.startsWith('?:')) {
        tokens.push({ raw: '(?:', type: 'group', name: '非捕获组', desc: '匹配括号内的内容，但不保存到捕获组中' })
        i += 3
      } else if (ahead.startsWith('?<') && ahead[2] !== '=' && ahead[2] !== '!') {
        const nameEnd = ahead.indexOf('>')
        const gname = nameEnd > 2 ? ahead.slice(2, nameEnd) : '?'
        tokens.push({ raw: `(?<${gname}>`, type: 'group', name: `命名捕获组 "${gname}"`, desc: `捕获匹配内容并命名为 ${gname}，可通过 \\k<${gname}> 或 match.groups.${gname} 引用` })
        i += 3 + (nameEnd > 0 ? nameEnd : 0)
      } else if (ahead.startsWith('?=')) {
        tokens.push({ raw: '(?=', type: 'lookahead', name: '正向先行断言', desc: '零宽断言：后面必须跟着括号内的内容，但不消耗字符' })
        i += 3
      } else if (ahead.startsWith('?!')) {
        tokens.push({ raw: '(?!', type: 'lookahead', name: '负向先行断言', desc: '零宽断言：后面不能跟着括号内的内容，但不消耗字符' })
        i += 3
      } else if (ahead.startsWith('?<=')) {
        tokens.push({ raw: '(?<=', type: 'lookahead', name: '正向后行断言', desc: '零宽断言：前面必须有括号内的内容，但不消耗字符' })
        i += 4
      } else if (ahead.startsWith('?<!')) {
        tokens.push({ raw: '(?<!', type: 'lookahead', name: '负向后行断言', desc: '零宽断言：前面不能有括号内的内容，但不消耗字符' })
        i += 4
      } else {
        // 普通捕获组
        const groupNum = tokens.filter(t => t.type === 'group' && t.name.startsWith('捕获组')).length + 1
        tokens.push({ raw: '(', type: 'group', name: `捕获组 #${groupNum}`, desc: '捕获括号内匹配到的内容，可通过 $1/$2 或 match[1] 引用' })
        i++
      }
      continue
    }

    // 分组结束
    if (ch === ')') {
      tokens.push({ raw: ')', type: 'group', name: '分组结束', desc: '对应前面的开括号，标记分组结束' })
      i++
      continue
    }

    // 量词
    if (ch === '*' || ch === '+' || ch === '?') {
      const lazy = pattern[i + 1] === '?'
      const raw = lazy ? ch + '?' : ch
      const lazySuffix = lazy ? '（懒惰模式，尽可能少匹配）' : '（贪婪模式，尽可能多匹配）'
      const map: Record<string, [string, string]> = {
        '*': ['零或多次 *', `匹配前一个元素 0 次或多次${lazySuffix}`],
        '+': ['一或多次 +', `匹配前一个元素 1 次或多次${lazySuffix}`],
        '?': ['零或一次 ?', `匹配前一个元素 0 次或 1 次，即可选${lazySuffix}`],
      }
      const [name, desc] = map[ch]
      tokens.push({ raw, type: 'quantifier', name, desc })
      i += lazy ? 2 : 1
      continue
    }

    // 次数量词 {n} {n,} {n,m}
    if (ch === '{') {
      const end = pattern.indexOf('}', i)
      if (end !== -1) {
        const raw = pattern.slice(i, end + 1)
        const inner = raw.slice(1, -1)
        const lazy = pattern[end + 1] === '?'
        const fullRaw = lazy ? raw + '?' : raw
        const lazySuffix = lazy ? '（懒惰）' : '（贪婪）'
        let desc = ''
        if (/^\d+$/.test(inner)) desc = `精确匹配前一个元素 ${inner} 次${lazySuffix}`
        else if (/^\d+,$/.test(inner)) desc = `匹配前一个元素至少 ${inner.replace(',', '')} 次${lazySuffix}`
        else if (/^\d+,\d+$/.test(inner)) {
          const [min, max] = inner.split(',')
          desc = `匹配前一个元素 ${min}~${max} 次${lazySuffix}`
        } else desc = `次数量词${lazySuffix}`
        tokens.push({ raw: fullRaw, type: 'quantifier', name: `次数量词 ${raw}`, desc })
        i = end + 1 + (lazy ? 1 : 0)
        continue
      }
    }

    // 锚点
    if (ch === '^') {
      const isMultiline = flagsInput.value.includes('m')
      tokens.push({ raw: '^', type: 'anchor', name: '开始锚点 ^', desc: isMultiline ? '多行模式：匹配每行的开头' : '匹配字符串的开头（不消耗字符）' })
      i++; continue
    }
    if (ch === '$') {
      const isMultiline = flagsInput.value.includes('m')
      tokens.push({ raw: '$', type: 'anchor', name: '结束锚点 $', desc: isMultiline ? '多行模式：匹配每行的结尾' : '匹配字符串的结尾（不消耗字符）' })
      i++; continue
    }

    // 通配符
    if (ch === '.') {
      const isDotAll = flagsInput.value.includes('s')
      tokens.push({ raw: '.', type: 'special', name: '通配符 .', desc: isDotAll ? 'dotAll 模式：匹配任意字符（包括换行符 \\n）' : '匹配任意单个字符（换行符 \\n 除外）' })
      i++; continue
    }

    // 交替
    if (ch === '|') {
      tokens.push({ raw: '|', type: 'alternation', name: '交替 |', desc: '逻辑"或"：匹配左侧或右侧的表达式，优先尝试左侧' })
      i++; continue
    }

    // 普通字符
    tokens.push({ raw: ch, type: 'literal', name: `字面量 "${ch}"`, desc: `匹配字符 "${ch}" 本身` })
    i++
  }

  return tokens
}

function parseEscape(next: string, _pattern: string, _pos: number): Omit<Token, 'raw'> {
  const map: Record<string, [string, string, string]> = {
    d: ['escape', '\\d 数字', '匹配任意数字字符，等价于 [0-9]'],
    D: ['escape', '\\D 非数字', '匹配任意非数字字符，等价于 [^0-9]'],
    w: ['escape', '\\w 单词字符', '匹配字母、数字或下划线，等价于 [A-Za-z0-9_]'],
    W: ['escape', '\\W 非单词字符', '匹配非单词字符，等价于 [^A-Za-z0-9_]'],
    s: ['escape', '\\s 空白字符', '匹配空格、制表符、换行符等空白字符'],
    S: ['escape', '\\S 非空白字符', '匹配任意非空白字符'],
    b: ['anchor', '\\b 单词边界', '零宽断言：匹配单词与非单词字符的边界（如 cat 中 c 前面和 t 后面）'],
    B: ['anchor', '\\B 非单词边界', '零宽断言：匹配两个单词字符之间或两个非单词字符之间的位置'],
    n: ['escape', '\\n 换行符', '匹配换行符（LF，ASCII 10）'],
    r: ['escape', '\\r 回车符', '匹配回车符（CR，ASCII 13）'],
    t: ['escape', '\\t 制表符', '匹配水平制表符（Tab，ASCII 9）'],
    f: ['escape', '\\f 换页符', '匹配换页符（FF，ASCII 12）'],
    v: ['escape', '\\v 垂直制表符', '匹配垂直制表符（ASCII 11）'],
    '0': ['escape', '\\0 空字符', '匹配空字符（NUL，ASCII 0）'],
    A: ['anchor', '\\A 字符串开头', '匹配字符串的绝对开头（部分引擎支持，JS不支持）'],
    Z: ['anchor', '\\Z 字符串结尾', '匹配字符串的绝对结尾（部分引擎支持，JS不支持）'],
    p: ['escape', '\\p{...} Unicode 属性', '匹配具有指定 Unicode 属性的字符（需要 u 标志）'],
    P: ['escape', '\\P{...} 非 Unicode 属性', '匹配不具有指定 Unicode 属性的字符（需要 u 标志）'],
    k: ['backreference', '\\k<name> 命名反向引用', '引用之前命名捕获组匹配到的内容'],
  }

  if (map[next]) {
    const [type, name, desc] = map[next]
    return { type, name, desc }
  }

  // 数字反向引用
  if (/[1-9]/.test(next)) {
    return { type: 'backreference', name: `\\${next} 反向引用`, desc: `引用第 ${next} 个捕获组之前匹配的内容，要求再次匹配相同内容` }
  }

  // 十六进制
  if (next === 'x') {
    return { type: 'escape', name: '\\xHH 十六进制字符', desc: '匹配十六进制码点对应的字符，如 \\x41 = A' }
  }
  if (next === 'u') {
    return { type: 'escape', name: '\\uHHHH Unicode字符', desc: '匹配指定 Unicode 码点的字符，如 \\u0041 = A' }
  }
  if (next === 'c') {
    return { type: 'escape', name: '\\cX 控制字符', desc: '匹配控制字符，如 \\cA = Ctrl+A（ASCII 1）' }
  }

  // 普通转义
  return { type: 'escape', name: `\\${next} 转义字符`, desc: `转义后匹配字面量字符 "${next}"（避免被解释为特殊含义）` }
}

function findCharClassEnd(pattern: string, start: number): number {
  let i = start + 1
  if (pattern[i] === '^') i++
  if (pattern[i] === ']') i++ // 开头的 ] 当作普通字符
  while (i < pattern.length) {
    if (pattern[i] === '\\') { i += 2; continue }
    if (pattern[i] === ']') return i
    i++
  }
  return pattern.length - 1
}

function parseCharClass(raw: string): Omit<Token, 'raw'> {
  const negated = raw[1] === '^'
  const inner = negated ? raw.slice(2, -1) : raw.slice(1, -1)
  const parts: string[] = []

  // 解析字符类内容
  let i = 0
  while (i < inner.length) {
    if (inner[i] === '\\' && i + 1 < inner.length) {
      const esc = inner[i + 1]
      const escMap: Record<string, string> = {
        d: '0-9', D: '非数字', w: '单词字符', W: '非单词字符',
        s: '空白', S: '非空白', n: '换行', t: '制表符',
      }
      parts.push(escMap[esc] ? `\\${esc}(${escMap[esc]})` : `\\${esc}`)
      i += 2
    } else if (inner[i + 1] === '-' && i + 2 < inner.length) {
      parts.push(`${inner[i]}–${inner[i + 2]}`)
      i += 3
    } else {
      parts.push(`"${inner[i]}"`)
      i++
    }
  }

  const desc = negated
    ? `匹配不属于以下集合的任意单个字符：${parts.join('、') || '（空集）'}`
    : `匹配以下集合中的任意单个字符：${parts.join('、') || '（空集）'}`

  return {
    type: 'charclass',
    name: negated ? `否定字符类 ${raw}` : `字符类 ${raw}`,
    desc,
  }
}

// ---- 命名捕获组提取 ----
const namedGroups = computed(() => {
  const matches = [...regexInput.value.matchAll(/\(\?<([^>=!][^>]*)>/g)]
  return matches.map(m => m[1])
})

// ---- 综合描述 ----
const overallDesc = computed(() => {
  if (!regexInput.value) return ''
  const parts: string[] = []
  if (regexInput.value.startsWith('^')) parts.push('从字符串开头匹配')
  if (regexInput.value.endsWith('$')) parts.push('直到字符串结尾')
  const hasGroups = /\((?!\?)/.test(regexInput.value)
  if (hasGroups) parts.push('包含捕获组')
  const hasLookahead = /\(\?[=!<]/.test(regexInput.value)
  if (hasLookahead) parts.push('包含断言')
  const hasQuantifier = /[*+?]|\{\d/.test(regexInput.value)
  if (hasQuantifier) parts.push('包含量词')
  return parts.length ? parts.join('，') : '匹配模式'
})

// ---- 用途猜测 ----
const PATTERN_USES: Array<{ pattern: RegExp; use: string }> = [
  { pattern: /^\^?\\d\+\$?$|^\^?\[0-9\]\+\$?$/, use: '验证纯数字字符串' },
  { pattern: /email|@.*\./i, use: '验证邮箱地址格式' },
  { pattern: /url|http|https/i, use: '匹配或验证 URL 链接' },
  { pattern: /ip|\d\{1,3\}.*\.\d\{1,3\}/i, use: '匹配 IP 地址' },
  { pattern: /phone|手机|\d\{11\}|\d\{3\}.*\d\{4\}/i, use: '匹配手机号码' },
  { pattern: /date|\d\{4\}.*\d\{2\}.*\d\{2\}/i, use: '匹配日期格式' },
  { pattern: /[A-Za-z0-9].*\{6,\}|password/i, use: '验证密码格式（包含字母/数字，有长度限制）' },
  { pattern: /[\u4e00-\u9fa5]|\[\\u4e00/, use: '匹配中文字符' },
  { pattern: /^\^.*\$$/, use: '全字符串匹配（^ 开头 $ 结尾）' },
  { pattern: /\?=|\?!|\?<=|\?<!/, use: '使用断言进行上下文判断' },
]

const guessedUse = computed(() => {
  for (const { pattern, use } of PATTERN_USES) {
    if (pattern.test(regexInput.value)) return use
  }
  return ''
})

// ---- 解析结果 ----
const parsedTokens = computed<Token[]>(() => {
  if (!regexInput.value || regexError.value) return []
  return parseRegex(regexInput.value)
})
</script>

<style scoped lang="scss">
.regex-tool {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 0;
}

.tool-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.tool-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

/* ── 主体 ── */
.regex-body {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
  min-height: 0;
}

.input-panel {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-right: 4px;
  min-height: 0;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.2); border-radius: 2px; }
}

.desc-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  min-height: 0;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.2); border-radius: 3px; }
}

.field-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

/* ── 正则输入 ── */
.regex-input-row {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  border: 2px solid #dcdfe6;
  border-radius: 6px;
  padding: 0 8px;
  transition: border-color .2s;

  &:focus-within { border-color: #667eea; }
}

.delimiter {
  font-family: 'Monaco', monospace;
  font-size: 16px;
  font-weight: 700;
  color: #667eea;
  flex-shrink: 0;
}

.regex-main-input {
  flex: 1;
  :deep(.el-input__wrapper) {
    box-shadow: none !important;
    background: transparent;
    padding: 0;
  }
  :deep(.el-input__inner) {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    color: #c0392b;
  }
}

.regex-flags-input {
  width: 64px;
  flex-shrink: 0;
  :deep(.el-input__wrapper) {
    box-shadow: none !important;
    background: transparent;
    padding: 0;
  }
  :deep(.el-input__inner) {
    font-family: 'Monaco', monospace;
    font-size: 13px;
    color: #8e44ad;
    text-align: center;
  }
}

.flags-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.regex-error { flex-shrink: 0; }

.test-textarea {
  flex-shrink: 0;
  :deep(.el-textarea__inner) {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    background: #ffffff;
    color: #1a1a1a;
    resize: none;
  }
}

/* ── 匹配 ── */
.match-stats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.match-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.highlight-box {
  background: #ffffff;
  color: #1a1a1a;
  font-family: 'Monaco', monospace;
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.7;
  max-height: 120px;
  overflow-y: auto;
}

.match-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.match-item {
  background: #ffffff;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: #1a1a1a;
}

.match-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.match-index {
  font-size: 10px;
  color: #888;
  flex-shrink: 0;
}

.match-value {
  flex: 1;
  background: #ffe066;
  padding: 1px 4px;
  border-radius: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-pos {
  font-size: 10px;
  color: #aaa;
  flex-shrink: 0;
}

.match-groups {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.match-group {
  display: flex;
  gap: 4px;
  font-size: 11px;
  background: #f0f2f8;
  border-radius: 3px;
  padding: 1px 6px;
}

.group-idx { color: #888; }
.mono { font-family: 'Monaco', monospace; }

/* ── 右侧描述 ── */
.empty-desc {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  gap: 8px;
  .empty-icon { font-size: 36px; }
  p { font-size: 13px; margin: 0; }
}

.desc-overview {
  background: #ffffff;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.regex-display {
  font-family: 'Monaco', monospace;
  font-size: 14px;
  color: #c0392b;
  word-break: break-all;
}

.overview-desc {
  font-size: 12px;
  color: #555;
}

.desc-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #667eea;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: 4px;
  border-bottom: 1px solid #e4e7ed;
}

.desc-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: #ffffff;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
}

.flag-item { align-items: center; }

.token-badge {
  font-family: 'Monaco', monospace;
  font-size: 11px;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flag-badge {
  background: #8e44ad;
  font-size: 13px;
  font-weight: 700;
}

.token-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.token-name {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a1a;
}

.token-desc {
  font-size: 11px;
  color: #666;
  line-height: 1.5;
}

.desc-text {
  font-size: 12px;
  color: #444;
  flex: 1;
}

.use-tag {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
}

.desc-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 12px;
}
</style>
