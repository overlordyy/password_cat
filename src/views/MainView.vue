<template>
  <div class="main-container">
    <el-container>
      <!-- 侧边栏 -->
      <el-aside width="260px" class="sidebar">
        <div class="sidebar-header">
          <el-icon size="32" color="#409EFF"><Lock /></el-icon>
          <span class="app-name">PasswordCat</span>
        </div>

        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          @select="handleMenuSelect"
        >
          <el-menu-item index="passwords">
            <el-icon><Key /></el-icon>
            <span>密码库</span>
            <el-tag v-if="entryCount > 0" size="small" type="info" class="count-tag">
              {{ entryCount }}
            </el-tag>
          </el-menu-item>
          <el-menu-item index="generator">
            <el-icon><Refresh /></el-icon>
            <span>密码生成器</span>
          </el-menu-item>
          <el-menu-item index="settings">
            <el-icon><Setting /></el-icon>
            <span>设置</span>
          </el-menu-item>
        </el-menu>

        <div class="sidebar-footer">
          <el-button type="danger" plain @click="handleLock">
            <el-icon><Lock /></el-icon>
            锁定
          </el-button>
        </div>
      </el-aside>

      <!-- 主内容区 -->
      <el-main class="main-content">
        <!-- 密码列表 -->
        <div v-if="activeMenu === 'passwords'" class="passwords-view">
          <div class="toolbar">
            <el-input
              v-model="searchQuery"
              placeholder="搜索密码..."
              clearable
              style="width: 300px"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="showAddDialog = true">
              <el-icon><Plus /></el-icon>
              添加密码
            </el-button>
          </div>

          <el-empty v-if="filteredEntries.length === 0" description="暂无密码" />
          
          <div v-else class="password-list">
            <el-card
              v-for="entry in filteredEntries"
              :key="entry.id"
              class="password-card"
              shadow="hover"
            >
              <div class="password-card-header">
                <div class="password-title">
                  <el-icon><Document /></el-icon>
                  <span>{{ entry.title }}</span>
                </div>
                <div class="password-actions">
                  <el-button link @click="copyPassword(entry.password)">
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>
                  <el-button link @click="editEntry(entry)">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button link type="danger" @click="confirmDelete(entry)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
              <div class="password-info">
                <p><strong>用户名:</strong> {{ entry.username }}</p>
                <p v-if="entry.url"><strong>网址:</strong> {{ entry.url }}</p>
                <p v-if="entry.notes" class="notes">{{ entry.notes }}</p>
              </div>
            </el-card>
          </div>
        </div>

        <!-- 密码生成器 -->
        <div v-else-if="activeMenu === 'generator'" class="generator-view">
          <PasswordGenerator />
        </div>

        <!-- 设置 -->
        <div v-else-if="activeMenu === 'settings'" class="settings-view">
          <h2>设置</h2>
          <el-form label-width="120px">
            <el-form-item label="数据文件位置">
              <el-input v-model="vaultPath" readonly>
                <template #append>
                  <el-button @click="openVaultLocation">打开位置</el-button>
                </template>
              </el-input>
              <p class="form-tip">您可以复制此文件到其他设备进行迁移</p>
            </el-form-item>
          </el-form>
        </div>
      </el-main>
    </el-container>

    <!-- 添加/编辑密码对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingEntry ? '编辑密码' : '添加密码'"
      width="500px"
    >
      <el-form :model="entryForm" label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="entryForm.title" placeholder="例如：GitHub" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="entryForm.username" placeholder="用户名/邮箱" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="entryForm.password"
            type="password"
            show-password
            placeholder="密码"
          >
            <template #append>
              <el-button @click="generateForEntry">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="网址">
          <el-input v-model="entryForm.url" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="entryForm.notes"
            type="textarea"
            rows="3"
            placeholder="其他信息..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveEntry">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVaultStore, type PasswordEntry } from '@/stores/vault'
import { ElMessage, ElMessageBox } from 'element-plus'
import PasswordGenerator from '@/components/PasswordGenerator.vue'

const router = useRouter()
const vaultStore = useVaultStore()

// 状态
const activeMenu = ref('passwords')
const searchQuery = ref('')
const showAddDialog = ref(false)
const editingEntry = ref<PasswordEntry | null>(null)
const vaultPath = ref('')

// 表单
const entryForm = ref({
  title: '',
  username: '',
  password: '',
  url: '',
  notes: '',
})

// 计算属性
const entryCount = computed(() => vaultStore.entryCount)
const filteredEntries = computed(() => vaultStore.searchEntries(searchQuery.value))

// 方法
const handleMenuSelect = (index: string) => {
  activeMenu.value = index
}

const handleLock = () => {
  vaultStore.lockVault()
  router.push('/unlock')
}

const copyPassword = async (password: string) => {
  try {
    await navigator.clipboard.writeText(password)
    ElMessage.success('密码已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

const editEntry = (entry: PasswordEntry) => {
  editingEntry.value = entry
  entryForm.value = {
    title: entry.title,
    username: entry.username,
    password: entry.password,
    url: entry.url || '',
    notes: entry.notes || '',
  }
  showAddDialog.value = true
}

const confirmDelete = (entry: PasswordEntry) => {
  ElMessageBox.confirm(
    `确定要删除 "${entry.title}" 吗？`,
    '确认删除',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    vaultStore.deleteEntry(entry.id)
    ElMessage.success('已删除')
  })
}

const saveEntry = async () => {
  if (!entryForm.value.title || !entryForm.value.password) {
    ElMessage.warning('请填写标题和密码')
    return
  }

  try {
    if (editingEntry.value) {
      await vaultStore.updateEntry(editingEntry.value.id, entryForm.value)
      ElMessage.success('已更新')
    } else {
      await vaultStore.addEntry(entryForm.value)
      ElMessage.success('已添加')
    }
    
    showAddDialog.value = false
    resetForm()
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  }
}

const generateForEntry = async () => {
  const password = await vaultStore.generatePassword({
    length: 16,
    useUppercase: true,
    useNumbers: true,
    useSymbols: true,
  })
  entryForm.value.password = password
}

const resetForm = () => {
  editingEntry.value = null
  entryForm.value = {
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
  }
}

const openVaultLocation = () => {
  // 打开文件位置
}

onMounted(() => {
  // 加载 vault 路径
})
</script>

<style scoped>
.main-container {
  height: 100vh;
}

.sidebar {
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.app-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
}

.count-tag {
  margin-left: auto;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid #e4e7ed;
}

.main-content {
  background: #f5f7fa;
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.password-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.password-card {
  cursor: pointer;
}

.password-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.password-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.password-actions {
  display: flex;
  gap: 4px;
}

.password-info {
  color: #606266;
  font-size: 14px;
}

.password-info p {
  margin: 4px 0;
}

.notes {
  color: #909399;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e4e7ed;
}

.form-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
</style>
