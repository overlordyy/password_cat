<template>
  <div class="main-container">
    <!-- 顶部栏：只保留 Logo 和右侧操作 -->
    <div class="navbar">
      <div class="navbar-left">
        <img src="/logo.png" class="navbar-logo" alt="PasswordCat" />
        <h1 class="navbar-title">PasswordCat</h1>
      </div>
      <div class="navbar-right">
        <el-button type="info" size="small" @click="themeStore.toggleTheme">
          <template #icon>
            <Sunny v-if="themeStore.theme === 'dark'" />
            <Moon v-else />
          </template>
          {{ themeStore.theme === 'light' ? '暗色' : '亮色' }}
        </el-button>
        <el-button type="danger" size="small" @click="handleLogout">
          <template #icon><SwitchButton /></template>
          退出登录
        </el-button>
      </div>
    </div>

    <!-- 主体：左侧导航 + 右侧内容 -->
    <div class="body-wrapper">

      <!-- 左侧导航栏 -->
      <div class="nav-sidebar">
        <div class="nav-group-title">管理</div>
        <div
          class="nav-item"
          :class="{ active: activeTab === 'passwords' }"
          @click="activeTab = 'passwords'"
        >
          <img src="@/assets/icons/password.svg" class="nav-pixel-icon" />
          <span class="nav-label">密码</span>
        </div>
        <div
          class="nav-item"
          :class="{ active: activeTab === 'servers' }"
          @click="activeTab = 'servers'"
        >
          <img src="@/assets/icons/server.svg" class="nav-pixel-icon" />
          <span class="nav-label">服务器</span>
        </div>

        <div class="nav-divider"></div>
        <div class="nav-group-title">工具</div>

        <div
          class="nav-item"
          :class="{ active: activeTab === 'diff' }"
          @click="activeTab = 'diff'"
        >
          <img src="@/assets/icons/diff.svg" class="nav-pixel-icon" />
          <span class="nav-label">文本对比</span>
        </div>
        <div
          class="nav-item"
          :class="{ active: activeTab === 'json' }"
          @click="activeTab = 'json'"
        >
          <img src="@/assets/icons/json.svg" class="nav-pixel-icon" />
          <span class="nav-label">JSON格式化</span>
        </div>
        <div
          class="nav-item"
          :class="{ active: activeTab === 'sql' }"
          @click="activeTab = 'sql'"
        >
          <img src="@/assets/icons/sql.svg" class="nav-pixel-icon" />
          <span class="nav-label">SQL格式化</span>
        </div>
        <div
          class="nav-item"
          :class="{ active: activeTab === 'base64' }"
          @click="activeTab = 'base64'"
        >
          <img src="@/assets/icons/base64.svg" class="nav-pixel-icon" />
          <span class="nav-label">Base64</span>
        </div>
        <div
          class="nav-item"
          :class="{ active: activeTab === 'timestamp' }"
          @click="activeTab = 'timestamp'"
        >
          <img src="@/assets/icons/timestamp.svg" class="nav-pixel-icon" />
          <span class="nav-label">时间戳</span>
        </div>
        <div
          class="nav-item"
          :class="{ active: activeTab === 'hash' }"
          @click="activeTab = 'hash'"
        >
          <img src="@/assets/icons/hash.svg" class="nav-pixel-icon" />
          <span class="nav-label">哈希计算</span>
        </div>
        <div
          class="nav-item"
          :class="{ active: activeTab === 'cert' }"
          @click="activeTab = 'cert'"
        >
          <img src="@/assets/icons/cert.svg" class="nav-pixel-icon" />
          <span class="nav-label">证书解码</span>
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="main-content">

        <!-- 工具类：全宽 -->
        <div v-if="activeTab === 'diff'" class="tool-view"><TextDiff /></div>
        <div v-else-if="activeTab === 'json'" class="tool-view"><JsonFormatter /></div>
        <div v-else-if="activeTab === 'sql'" class="tool-view"><SqlFormatter /></div>
        <div v-else-if="activeTab === 'base64'" class="tool-view"><Base64Tool /></div>
        <div v-else-if="activeTab === 'timestamp'" class="tool-view"><TimestampTool /></div>
        <div v-else-if="activeTab === 'hash'" class="tool-view"><HashTool /></div>
        <div v-else-if="activeTab === 'cert'" class="tool-view"><CertDecoder /></div>

        <!-- 密码 / 服务器：左 sidebar + 右列表 -->
        <template v-else>
          <div class="sidebar">
        <!-- 密码标签页 -->
        <template v-if="activeTab === 'passwords'">
          <el-button type="primary" size="large" class="add-button" @click="showAddDialog = true">
            <template #icon><Plus /></template>
            添加密码
          </el-button>
          
          <el-input
            v-model="searchQuery"
            placeholder="搜索密码..."
            clearable
            size="large"
            class="search-input"
            prefix-icon="Search"
          />

          <!-- 密码分组筛选 -->
          <div class="group-filter">
            <el-select v-model="selectedGroup" placeholder="全部分组" clearable size="large">
              <el-option label="全部分组" value="" />
              <el-option
                v-for="group in allPasswordGroups"
                :key="group"
                :label="group"
                :value="group"
              />
            </el-select>
          </div>

          <div class="stats">
            <div class="stat-item">
              <div class="stat-number">{{ entries.length }}</div>
              <div class="stat-label">密码总数</div>
            </div>
          </div>

          <!-- 密码分组管理 -->
          <div class="group-management">
            <div class="group-header">
              <span class="group-title">🔑 密码分组</span>
              <el-button type="text" size="small" @click="showPasswordGroupDialog = true">
                <Plus />
              </el-button>
            </div>
            <div class="group-list">
              <div
                v-for="group in allPasswordGroups"
                :key="group"
                class="group-item"
              >
                <span>{{ group }}</span>
                <el-button type="text" size="small" @click="handleDeletePasswordGroup(group)">
                  <Delete />
                </el-button>
              </div>
            </div>
          </div>
        </template>

        <!-- 服务器标签页 -->
        <template v-else>
          <el-button type="primary" size="large" class="add-button" @click="showServerDialog = true">
            <template #icon><Plus /></template>
            添加服务器
          </el-button>
          
          <el-input
            v-model="serverSearchQuery"
            placeholder="搜索服务器..."
            clearable
            size="large"
            class="search-input"
            prefix-icon="Search"
          />

          <!-- 服务器分组筛选 -->
          <div class="group-filter">
            <el-select v-model="selectedServerGroup" placeholder="全部分组" clearable size="large">
              <el-option label="全部分组" value="" />
              <el-option
                v-for="group in allServerGroups"
                :key="group"
                :label="group"
                :value="group"
              />
            </el-select>
          </div>

          <div class="stats">
            <div class="stat-item">
              <div class="stat-number">{{ servers.length }}</div>
              <div class="stat-label">服务器总数</div>
            </div>
          </div>

          <!-- 服务器分组管理 -->
          <div class="group-management">
            <div class="group-header">
              <span class="group-title">🖥️ 服务器分组</span>
              <el-button type="text" size="small" @click="showServerGroupDialog = true">
                <Plus />
              </el-button>
            </div>
            <div class="group-list">
              <div
                v-for="group in allServerGroups"
                :key="group"
                class="group-item"
              >
                <span>{{ group }}</span>
                <el-button type="text" size="small" @click="handleDeleteServerGroup(group)">
                  <Delete />
                </el-button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 右侧列表 -->
      <div class="content-list">
        <!-- 密码列表 -->
        <template v-if="activeTab === 'passwords'">
          <div v-if="filteredEntries.length === 0" class="empty-state">
            <div class="empty-icon">📭</div>
            <p>暂无密码记录</p>
          </div>

          <div v-for="entry in filteredEntries" :key="entry.id" class="password-card">
            <div class="card-header">
              <div class="card-title">
                <span class="platform-icon">{{ getPlatformIcon(entry.title) }}</span>
                <span class="platform-name">{{ entry.title }}</span>
                <el-tag v-if="entry.group" size="small" type="info">{{ entry.group }}</el-tag>
              </div>
              <el-dropdown @command="handleCommand($event, entry)">
                <el-button type="text" size="small">
                  <template #icon><MoreFilled /></template>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <div class="card-content">
              <div class="info-row">
                <div class="info-label">账户</div>
                <div class="info-value">
                  <span class="account-text">{{ entry.username }}</span>
                  <el-button type="text" size="small" @click="copyToClipboard(entry.username, '账户')" class="copy-btn">
                    <template #icon><DocumentCopy /></template>
                  </el-button>
                </div>
              </div>

              <div class="info-row">
                <div class="info-label">密码</div>
                <div class="info-value">
                  <span class="password-text" :class="{ revealed: revealedIds.has(entry.id) }">
                    {{ revealedIds.has(entry.id) ? entry.password : '••••••••' }}
                  </span>
                  <el-button type="text" size="small" @click="toggleReveal(entry.id)" class="reveal-btn">
                    <template #icon><View v-if="!revealedIds.has(entry.id)" /><Hide v-else /></template>
                  </el-button>
                  <el-button type="text" size="small" @click="copyToClipboard(entry.password, '密码')" class="copy-btn">
                    <template #icon><DocumentCopy /></template>
                  </el-button>
                </div>
              </div>

              <div v-if="entry.notes" class="info-row">
                <div class="info-label">备注</div>
                <div class="info-value notes-value">{{ entry.notes }}</div>
              </div>

              <div v-if="entry.url" class="info-row">
                <div class="info-label">URL</div>
                <div class="info-value">
                  <a :href="entry.url" target="_blank" class="url-link">{{ entry.url }}</a>
                  <el-button type="text" size="small" @click="copyToClipboard(entry.url!, 'URL')" class="copy-btn">
                    <template #icon><DocumentCopy /></template>
                  </el-button>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <span class="create-time">{{ formatDate(entry.createdAt) }}</span>
            </div>
          </div>
        </template>

        <!-- 服务器列表 -->
        <template v-else>
          <div v-if="filteredServers.length === 0" class="empty-state">
            <div class="empty-icon">🖥️</div>
            <p>暂无服务器记录</p>
          </div>

          <div v-for="server in filteredServers" :key="server.id" class="server-card">
            <div class="card-header">
              <div class="card-title">
                <span class="server-icon">🖥️</span>
                <span class="server-name">{{ server.name }}</span>
                <el-tag v-if="server.group" size="small" type="info">{{ server.group }}</el-tag>
              </div>
              <el-dropdown @command="handleServerCommand($event, server)">
                <el-button type="text" size="small">
                  <template #icon><MoreFilled /></template>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <div class="card-content">
              <div class="info-row">
                <div class="info-label">IP</div>
                <div class="info-value">
                  <span class="server-ip">{{ server.ip }}</span>
                  <el-button type="text" size="small" @click="copyToClipboard(server.ip, 'IP')" class="copy-btn">
                    <template #icon><DocumentCopy /></template>
                  </el-button>
                </div>
              </div>

              <div v-if="server.domain" class="info-row">
                <div class="info-label">域名</div>
                <div class="info-value">
                  <span class="server-domain">{{ server.domain }}</span>
                  <el-button type="text" size="small" @click="copyToClipboard(server.domain!, '域名')" class="copy-btn">
                    <template #icon><DocumentCopy /></template>
                  </el-button>
                </div>
              </div>

              <div class="info-row">
                <div class="info-label">账户</div>
                <div class="info-value">
                  <span class="server-username">{{ server.username }}</span>
                  <el-button type="text" size="small" @click="copyToClipboard(server.username, '账户')" class="copy-btn">
                    <template #icon><DocumentCopy /></template>
                  </el-button>
                </div>
              </div>

              <div class="info-row">
                <div class="info-label">密码</div>
                <div class="info-value">
                  <span class="password-text" :class="{ revealed: revealedServerIds.has(server.id) }">
                    {{ revealedServerIds.has(server.id) ? server.password : '••••••••' }}
                  </span>
                  <el-button type="text" size="small" @click="toggleServerReveal(server.id)" class="reveal-btn">
                    <template #icon><View v-if="!revealedServerIds.has(server.id)" /><Hide v-else /></template>
                  </el-button>
                  <el-button type="text" size="small" @click="copyToClipboard(server.password, '密码')" class="copy-btn">
                    <template #icon><DocumentCopy /></template>
                  </el-button>
                </div>
              </div>

              <div v-if="server.notes" class="info-row">
                <div class="info-label">备注</div>
                <div class="info-value notes-value">{{ server.notes }}</div>
              </div>
            </div>

            <!-- 一键复制按钮 -->
            <div class="card-actions">
              <el-button type="primary" size="small" @click="copyAllServerInfo(server)">
                <template #icon><CopyDocument /></template>
                一键复制全部信息
              </el-button>
            </div>

            <div class="card-footer">
              <span class="create-time">{{ formatDate(server.createdAt) }}</span>
            </div>
          </div>
        </template>
      </div>
      <!-- /content-list -->
      </template>
      <!-- /template v-else (passwords/servers) -->
    </div>
    <!-- /main-content -->
  </div>
  <!-- /body-wrapper -->

    <!-- 添加/编辑密码对话框 -->
    <el-dialog v-model="showAddDialog" :title="editingEntry ? '编辑密码' : '添加密码'" width="500px" @close="resetForm">
      <el-form :model="newEntry" :rules="formRules" ref="formRef" label-width="80px">
        <el-form-item label="平台" prop="title">
          <el-input v-model="newEntry.title" placeholder="如: GitHub, Gmail" autocapitalize="off" autocorrect="off" />
        </el-form-item>
        <el-form-item label="账户" prop="username">
          <el-input v-model="newEntry.username" placeholder="邮箱或用户名" autocapitalize="off" autocorrect="off" autocomplete="off" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="newEntry.password" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="URL">
          <el-input v-model="newEntry.url" placeholder="https://example.com" autocapitalize="off" autocorrect="off" autocomplete="off" />
        </el-form-item>
        <el-form-item label="分组">
          <el-select v-model="newEntry.group" placeholder="选择分组" clearable>
            <el-option
              v-for="group in allPasswordGroups"
              :key="group"
              :label="group"
              :value="group"
            />
            <el-option label="+ 新建分组" value="__new_group__" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="newEntry.group === '__new_group__'" label="新分组">
          <el-input v-model="newPasswordGroupName" placeholder="输入分组名称" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="newEntry.notes" type="textarea" rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddEntry">确定</el-button>
      </template>
    </el-dialog>

    <!-- 添加/编辑服务器对话框 -->
    <el-dialog v-model="showServerDialog" :title="editingServer ? '编辑服务器' : '添加服务器'" width="500px" @close="resetServerForm">
      <el-form :model="newServer" :rules="serverFormRules" ref="serverFormRef" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="newServer.name" placeholder="如: 生产环境Web服务器" autocapitalize="off" autocorrect="off" />
        </el-form-item>
        <el-form-item label="IP地址" prop="ip">
          <el-input v-model="newServer.ip" placeholder="如: 192.168.1.100" autocapitalize="off" autocorrect="off" autocomplete="off" />
        </el-form-item>
        <el-form-item label="域名">
          <el-input v-model="newServer.domain" placeholder="如: example.com" autocapitalize="off" autocorrect="off" autocomplete="off" />
        </el-form-item>
        <el-form-item label="账户" prop="username">
          <el-input v-model="newServer.username" placeholder="用户名" autocapitalize="off" autocorrect="off" autocomplete="off" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="newServer.password" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="分组">
          <el-select v-model="newServer.group" placeholder="选择分组" clearable>
            <el-option
              v-for="group in allServerGroups"
              :key="group"
              :label="group"
              :value="group"
            />
            <el-option label="+ 新建分组" value="__new_group__" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="newServer.group === '__new_group__'" label="新分组">
          <el-input v-model="newServerGroupName" placeholder="输入分组名称" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="newServer.notes" type="textarea" rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showServerDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddServer">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新建密码分组对话框 -->
    <el-dialog v-model="showPasswordGroupDialog" title="新建密码分组" width="400px">
      <el-form @submit.prevent="handleAddPasswordGroup">
        <el-form-item label="分组名称">
          <el-input v-model="newPasswordGroupName" placeholder="输入分组名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPasswordGroupDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddPasswordGroup">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新建服务器分组对话框 -->
    <el-dialog v-model="showServerGroupDialog" title="新建服务器分组" width="400px">
      <el-form @submit.prevent="handleAddServerGroup">
        <el-form-item label="分组名称">
          <el-input v-model="newServerGroupName" placeholder="输入分组名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showServerGroupDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddServerGroup">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVaultStore, type PasswordEntry, type ServerEntry } from '@/stores/vault'
import { useThemeStore } from '@/stores/theme'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, MoreFilled, DocumentCopy, View, Hide, SwitchButton, Delete, CopyDocument, Sunny, Moon } from '@element-plus/icons-vue'
import TextDiff from '@/components/TextDiff.vue'
import JsonFormatter from '@/components/JsonFormatter.vue'
import Base64Tool from '@/components/Base64Tool.vue'
import TimestampTool from '@/components/TimestampTool.vue'
import HashTool from '@/components/HashTool.vue'
import SqlFormatter from '@/components/SqlFormatter.vue'
import CertDecoder from '@/components/CertDecoder.vue'

const router = useRouter()
const vaultStore = useVaultStore()
const themeStore = useThemeStore()

// Tab state
const activeTab = ref<'passwords' | 'servers' | 'diff' | 'json' | 'base64' | 'timestamp' | 'hash' | 'sql' | 'cert'>('passwords')

// Password state
const searchQuery = ref('')
const selectedGroup = ref('')
const showAddDialog = ref(false)
const editingEntry = ref<PasswordEntry | null>(null)
const revealedIds = ref(new Set<string>())

const newEntry = ref({
  title: '',
  username: '',
  password: '',
  url: '',
  group: '',
  notes: '',
})

const newPasswordGroupName = ref('')
const newServerGroupName = ref('')
const showPasswordGroupDialog = ref(false)
const showServerGroupDialog = ref(false)

const formRules = {
  title: [{ required: true, message: '请输入平台名称', trigger: 'blur' }],
  username: [{ required: true, message: '请输入账户', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

// Server state
const serverSearchQuery = ref('')
const selectedServerGroup = ref('')
const showServerDialog = ref(false)
const editingServer = ref<ServerEntry | null>(null)
const revealedServerIds = ref(new Set<string>())

const newServer = ref({
  name: '',
  ip: '',
  domain: '',
  username: '',
  password: '',
  group: '',
  notes: '',
})

const serverFormRules = {
  name: [{ required: true, message: '请输入服务器名称', trigger: 'blur' }],
  ip: [{ required: true, message: '请输入IP地址', trigger: 'blur' }],
  username: [{ required: true, message: '请输入账户', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

// Computed
const entries = computed(() => vaultStore.entries)
const servers = computed(() => vaultStore.servers)
const allPasswordGroups = computed(() => vaultStore.allPasswordGroups)
const allServerGroups = computed(() => vaultStore.allServerGroups)

const filteredEntries = computed(() => {
  let result = entries.value
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      entry =>
        entry.title.toLowerCase().includes(query) ||
        entry.username.toLowerCase().includes(query)
    )
  }
  if (selectedGroup.value) {
    result = result.filter(entry => entry.group === selectedGroup.value)
  }
  return result
})

const filteredServers = computed(() => {
  let result = servers.value
  if (serverSearchQuery.value) {
    const query = serverSearchQuery.value.toLowerCase()
    result = result.filter(
      server =>
        server.name.toLowerCase().includes(query) ||
        server.ip.includes(query) ||
        server.domain?.toLowerCase().includes(query) ||
        server.username.toLowerCase().includes(query)
    )
  }
  if (selectedServerGroup.value) {
    result = result.filter(server => server.group === selectedServerGroup.value)
  }
  return result
})

// Methods
const getPlatformIcon = (platform: string) => {
  const icons: Record<string, string> = {
    github: '🐙',
    gmail: '📧',
    twitter: '𝕏',
    facebook: '👍',
    instagram: '📷',
    linkedin: '💼',
    default: '🔑',
  }
  return icons[platform.toLowerCase()] || icons.default
}

const toggleReveal = (id: string) => {
  if (revealedIds.value.has(id)) {
    revealedIds.value.delete(id)
  } else {
    revealedIds.value.add(id)
  }
}

const toggleServerReveal = (id: string) => {
  if (revealedServerIds.value.has(id)) {
    revealedServerIds.value.delete(id)
  } else {
    revealedServerIds.value.add(id)
  }
}

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label}已复制到剪贴板`)
  } catch {
    ElMessage.error('复制失败')
  }
}

const copyAllServerInfo = async (server: ServerEntry) => {
  const info = `【${server.name}】
IP: ${server.ip}
${server.domain ? `域名: ${server.domain}\n` : ''}账户: ${server.username}
密码: ${server.password}
${server.notes ? `\n备注: ${server.notes}` : ''}`

  try {
    await navigator.clipboard.writeText(info)
    ElMessage.success('服务器信息已全部复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const handleAddEntry = async () => {
  if (!newEntry.value.title || !newEntry.value.username || !newEntry.value.password) {
    ElMessage.error('请填写必填项')
    return
  }

  // 处理新建分组
  let group = newEntry.value.group
  if (group === '__new_group__') {
    if (!newPasswordGroupName.value.trim()) {
      ElMessage.error('请输入分组名称')
      return
    }
    group = newPasswordGroupName.value.trim()
    vaultStore.addPasswordGroup(group)
  }

  try {
    if (editingEntry.value) {
      await vaultStore.updateEntry(editingEntry.value.id, {
        ...newEntry.value,
        group: group || undefined,
      })
      ElMessage.success('密码已更新')
    } else {
      await vaultStore.addEntry({
        ...newEntry.value,
        group: group || undefined,
      })
      ElMessage.success('密码已添加')
    }
    showAddDialog.value = false
    resetForm()
  } catch (error) {
    ElMessage.error(`操作失败: ${error}`)
  }
}

const handleAddServer = async () => {
  if (!newServer.value.name || !newServer.value.ip || !newServer.value.username || !newServer.value.password) {
    ElMessage.error('请填写必填项')
    return
  }

  // 处理新建分组
  let group = newServer.value.group
  if (group === '__new_group__') {
    if (!newServerGroupName.value.trim()) {
      ElMessage.error('请输入分组名称')
      return
    }
    group = newServerGroupName.value.trim()
    vaultStore.addServerGroup(group)
  }

  try {
    if (editingServer.value) {
      await vaultStore.updateServer(editingServer.value.id, {
        ...newServer.value,
        group: group || undefined,
      })
      ElMessage.success('服务器已更新')
    } else {
      await vaultStore.addServer({
        ...newServer.value,
        group: group || undefined,
      })
      ElMessage.success('服务器已添加')
    }
    showServerDialog.value = false
    resetServerForm()
  } catch (error) {
    ElMessage.error(`操作失败: ${error}`)
  }
}

const handleCommand = (command: string, entry: PasswordEntry) => {
  if (command === 'edit') {
    editingEntry.value = entry
    newEntry.value = {
      title: entry.title,
      username: entry.username,
      password: entry.password,
      url: entry.url || '',
      group: entry.group || '',
      notes: entry.notes || '',
    }
    showAddDialog.value = true
  } else if (command === 'delete') {
    ElMessageBox.confirm('确定删除此密码吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(async () => {
        await vaultStore.deleteEntry(entry.id)
        ElMessage.success('已删除')
      })
      .catch(() => {})
  }
}

const handleServerCommand = (command: string, server: ServerEntry) => {
  if (command === 'edit') {
    editingServer.value = server
    newServer.value = {
      name: server.name,
      ip: server.ip,
      domain: server.domain || '',
      username: server.username,
      password: server.password,
      group: server.group || '',
      notes: server.notes || '',
    }
    showServerDialog.value = true
  } else if (command === 'delete') {
    ElMessageBox.confirm('确定删除此服务器吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(async () => {
        await vaultStore.deleteServer(server.id)
        ElMessage.success('已删除')
      })
      .catch(() => {})
  }
}

const handleAddPasswordGroup = () => {
  if (!newPasswordGroupName.value.trim()) {
    ElMessage.error('请输入分组名称')
    return
  }
  vaultStore.addPasswordGroup(newPasswordGroupName.value.trim())
  ElMessage.success('密码分组已创建')
  showPasswordGroupDialog.value = false
  newPasswordGroupName.value = ''
}

const handleAddServerGroup = () => {
  if (!newServerGroupName.value.trim()) {
    ElMessage.error('请输入分组名称')
    return
  }
  vaultStore.addServerGroup(newServerGroupName.value.trim())
  ElMessage.success('服务器分组已创建')
  showServerGroupDialog.value = false
  newServerGroupName.value = ''
}

const handleDeletePasswordGroup = (group: string) => {
  ElMessageBox.confirm(`确定删除密码分组"${group}"吗？该分组下的所有密码也会被删除。`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      await vaultStore.deletePasswordGroup(group)
      ElMessage.success('分组已删除')
      if (selectedGroup.value === group) selectedGroup.value = ''
    })
    .catch(() => {})
}

const handleDeleteServerGroup = (group: string) => {
  ElMessageBox.confirm(`确定删除服务器分组"${group}"吗？该分组下的所有服务器也会被删除。`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      await vaultStore.deleteServerGroup(group)
      ElMessage.success('分组已删除')
      if (selectedServerGroup.value === group) selectedServerGroup.value = ''
    })
    .catch(() => {})
}

const handleLogout = () => {
  vaultStore.lockVault()
  router.push('/unlock')
}

const resetForm = () => {
  newEntry.value = {
    title: '',
    username: '',
    password: '',
    url: '',
    group: '',
    notes: '',
  }
  newPasswordGroupName.value = ''
  editingEntry.value = null
}

const resetServerForm = () => {
  newServer.value = {
    name: '',
    ip: '',
    domain: '',
    username: '',
    password: '',
    group: '',
    notes: '',
  }
  newServerGroupName.value = ''
  editingServer.value = null
}

const formatDate = (date: string | number) => {
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>

<style scoped lang="scss">
.main-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  transition: background 0.3s;
}

/* ── 顶部栏 ── */
.navbar {
  height: 50px;
  background: var(--bg-navbar);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
  z-index: 10;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.navbar-logo {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  image-rendering: pixelated;
  object-fit: cover;
}

.navbar-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-white);
  margin: 0;
}

.navbar-right { display: flex; gap: 10px; }

/* ── 主体布局 ── */
.body-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ── 左侧导航 ── */
.nav-sidebar {
  width: 150px;
  flex-shrink: 0;
  background: var(--bg-navbar);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 8px;
  overflow-y: auto;
  border-right: 1px solid rgba(255,255,255,0.08);

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
}

.nav-group-title {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 6px 8px 4px;
}

.nav-divider {
  height: 1px;
  background: rgba(255,255,255,0.1);
  margin: 6px 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.18s;
  color: rgba(255,255,255,0.65);

  &:hover {
    background: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.9);
  }

  &.active {
    background: rgba(255,255,255,0.2);
    color: #ffffff;
    font-weight: 600;
  }
}

.nav-pixel-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  image-rendering: pixelated;
}
.nav-label { font-size: 12px; white-space: nowrap; }

/* ── 右侧内容区 ── */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 16px;
  gap: 16px;
  min-width: 0;
}

/* 工具类全屏视图 */
.tool-view {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ── 密码/服务器布局：sidebar + 列表 ── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--bg-sidebar);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow-sidebar);
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.content-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
    &:hover { background: rgba(0, 0, 0, 0.3); }
  }
}

.add-button {
  width: 100%;
  height: 38px;
  background: var(--bg-button-primary);
  border: none;
  font-weight: 600;
  font-size: 14px;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
}

.search-input {
  :deep(.el-input__wrapper) {
    background: var(--bg-input);
    border: 2px solid var(--border-color);
    &:hover { border-color: var(--border-hover); }
  }
}

.group-filter {
  :deep(.el-select) { width: 100%; }
}

.stats { display: flex; gap: 8px; }

.stat-item {
  flex: 1;
  background: var(--bg-button-primary);
  border-radius: 6px;
  padding: 10px;
  text-align: center;
  color: var(--text-white);
}

.stat-number { font-size: 18px; font-weight: 700; }
.stat-label { font-size: 11px; opacity: 0.8; margin-top: 2px; }

.group-management {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.group-title { font-weight: 600; color: var(--text-secondary); font-size: 13px; }

.group-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 120px;
  overflow-y: auto;
}

.group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--bg-input);
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-primary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  .empty-icon { font-size: 48px; margin-bottom: 16px; }
}

.password-card,
.server-card {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 12px;
  box-shadow: var(--shadow-card);
  transition: all 0.3s;
  &:hover { box-shadow: var(--shadow-card-hover); }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--text-primary);
}

.platform-icon, .server-icon { font-size: 16px; }
.platform-name, .server-name { font-size: 14px; }

.card-content { display: flex; flex-direction: column; gap: 8px; }

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.info-label {
  min-width: 48px;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
}

.info-value {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-input);
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-primary);
}

.notes-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-text,
.password-text,
.server-ip,
.server-domain,
.server-username {
  flex: 1;
  word-break: break-all;
  font-family: 'Monaco', 'Courier New', monospace;
}

.copy-btn,
.reveal-btn {
  color: #667eea;
  padding: 0 4px;
  &:hover { color: #764ba2; }
}

.url-link {
  flex: 1;
  color: #667eea;
  font-size: 12px;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &:hover { text-decoration: underline; }
}

.card-actions {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: center;
}

.card-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
  font-size: 11px;
  color: var(--text-muted);
}

.create-time { display: block; }
</style>
