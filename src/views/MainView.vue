<template>
  <div class="main-container">
    <!-- 顶部导航栏 -->
    <div class="navbar">
      <div class="navbar-left">
        <h1 class="navbar-title">🔐 PasswordCat</h1>
      </div>
      <div class="navbar-right">
        <el-button type="danger" size="small" @click="handleLogout">
          <template #icon><SwitchButton /></template>
          退出登录
        </el-button>
      </div>
    </div>

    <!-- 主容器 -->
    <div class="content-wrapper">
      <!-- 左侧操作栏 -->
      <div class="sidebar">
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

        <div class="stats">
          <div class="stat-item">
            <div class="stat-number">{{ entries.length }}</div>
            <div class="stat-label">密码总数</div>
          </div>
        </div>
      </div>

      <!-- 右侧密码列表 -->
      <div class="password-list">
        <div v-if="filteredEntries.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>暂无密码记录</p>
        </div>

        <div v-for="entry in filteredEntries" :key="entry.id" class="password-card">
          <div class="card-header">
            <div class="card-title">
              <span class="platform-icon">{{ getPlatformIcon(entry.title) }}</span>
              <span class="platform-name">{{ entry.title }}</span>
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
            <!-- 账户信息 -->
            <div class="info-row">
              <div class="info-label">账户</div>
              <div class="info-value">
                <span class="account-text">{{ entry.username }}</span>
                <el-button 
                  type="text" 
                  size="small" 
                  @click="copyToClipboard(entry.username, '账户')"
                  class="copy-btn"
                >
                  <template #icon><DocumentCopy /></template>
                </el-button>
              </div>
            </div>

            <!-- 密码信息 -->
            <div class="info-row">
              <div class="info-label">密码</div>
              <div class="info-value">
                <span class="password-text" :class="{ revealed: revealedIds.has(entry.id) }">
                  {{ revealedIds.has(entry.id) ? entry.password : '••••••••' }}
                </span>
                <el-button 
                  type="text" 
                  size="small" 
                  @click="toggleReveal(entry.id)"
                  class="reveal-btn"
                >
                  <template #icon>
                    <View v-if="!revealedIds.has(entry.id)" />
                    <Hide v-else />
                  </template>
                </el-button>
                <el-button 
                  type="text" 
                  size="small" 
                  @click="copyToClipboard(entry.password, '密码')"
                  class="copy-btn"
                >
                  <template #icon><DocumentCopy /></template>
                </el-button>
              </div>
            </div>

            <!-- 备注 -->
            <div v-if="entry.notes" class="info-row">
              <div class="info-label">备注</div>
              <div class="info-value">{{ entry.notes }}</div>
            </div>
          </div>

          <div class="card-footer">
            <span class="create-time">{{ formatDate(entry.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="showAddDialog" title="添加密码" width="500px" @close="resetForm">
      <el-form :model="newEntry" :rules="formRules" ref="formRef" label-width="80px">
        <el-form-item label="平台" prop="platform">
          <el-input v-model="newEntry.platform" placeholder="如: GitHub, Gmail" />
        </el-form-item>
        <el-form-item label="账户" prop="account">
          <el-input v-model="newEntry.account" placeholder="邮箱或用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="newEntry.password" type="password" show-password />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, MoreFilled, DocumentCopy, View, Hide, SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()
const vaultStore = useVaultStore()

const searchQuery = ref('')
const showAddDialog = ref(false)
const revealedIds = ref(new Set<string>())

const newEntry = ref({
  platform: '',
  account: '',
  password: '',
  notes: '',
})

const formRules = {
  platform: [{ required: true, message: '请输入平台名称', trigger: 'blur' }],
  account: [{ required: true, message: '请输入账户', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const entries = computed(() => vaultStore.entries)

const filteredEntries = computed(() => {
  if (!searchQuery.value) return entries.value
  const query = searchQuery.value.toLowerCase()
  return entries.value.filter(
    entry =>
      entry.title.toLowerCase().includes(query) ||
      entry.username.toLowerCase().includes(query)
  )
})

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

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label}已复制到剪贴板`)
  } catch {
    ElMessage.error('复制失败')
  }
}

const handleAddEntry = async () => {
  if (!newEntry.value.platform || !newEntry.value.account || !newEntry.value.password) {
    ElMessage.error('请填写必填项')
    return
  }

  try {
    await vaultStore.addEntry({
      title: newEntry.value.platform,
      username: newEntry.value.account,
      password: newEntry.value.password,
      notes: newEntry.value.notes,
    })
    ElMessage.success('密码已添加')
    showAddDialog.value = false
    resetForm()
  } catch (error) {
    ElMessage.error(`添加失败: ${error}`)
  }
}

const handleCommand = (command: string, entry: any) => {
  if (command === 'delete') {
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

const handleLogout = () => {
  vaultStore.lockVault()
  router.push('/unlock')
}

const resetForm = () => {
  newEntry.value = {
    platform: '',
    account: '',
    password: '',
    notes: '',
  }
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
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.navbar {
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.navbar-title {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0;
}

.navbar-right {
  display: flex;
  gap: 10px;
}

.content-wrapper {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.add-button {
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  font-weight: 600;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }
}

.search-input {
  :deep(.el-input__wrapper) {
    background: #f5f7fa;
    border: 2px solid #e4e7eb;

    &:hover {
      border-color: #667eea;
    }
  }
}

.stats {
  display: flex;
  gap: 10px;
}

.stat-item {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  color: white;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 5px;
}

.password-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
}

.password-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.platform-icon {
  font-size: 20px;
}

.platform-name {
  font-size: 16px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.info-label {
  min-width: 60px;
  font-size: 12px;
  color: #909399;
  font-weight: 600;
  text-transform: uppercase;
}

.info-value {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 14px;
  color: #303133;
}

.account-text,
.password-text {
  flex: 1;
  word-break: break-all;
  font-family: 'Monaco', 'Courier New', monospace;
}

.password-text.revealed {
  font-family: 'Monaco', 'Courier New', monospace;
}

.copy-btn,
.reveal-btn {
  color: #667eea;
  padding: 0 4px;

  &:hover {
    color: #764ba2;
  }
}

.card-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #909399;
}

.create-time {
  display: block;
}
</style>
