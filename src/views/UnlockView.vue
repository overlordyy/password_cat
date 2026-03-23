<template>
  <div class="unlock-container">
    <div class="unlock-card">
      <div class="logo">
        <el-icon size="64" color="#409EFF"><Lock /></el-icon>
        <h1>PasswordCat</h1>
        <p class="subtitle">输入主密码解锁</p>
      </div>

      <el-form @submit.prevent="handleUnlock">
        <el-form-item>
          <el-input
            v-model="password"
            type="password"
            placeholder="请输入主密码"
            show-password
            size="large"
            @keyup.enter="handleUnlock"
          />
        </el-form-item>

        <el-alert
          v-if="error"
          :title="error"
          type="error"
          :closable="false"
          style="margin-bottom: 16px"
        />

        <el-button
          type="primary"
          size="large"
          :loading="loading"
          @click="handleUnlock"
          style="width: 100%"
        >
          解锁
        </el-button>
      </el-form>

      <div class="actions">
        <el-button link type="info" @click="showResetConfirm = true">
          忘记密码？重置密码库
        </el-button>
      </div>
    </div>

    <el-dialog
      v-model="showResetConfirm"
      title="确认重置"
      width="400px"
    >
      <p>重置将删除所有已保存的密码数据，此操作不可恢复！</p>
      <template #footer>
        <el-button @click="showResetConfirm = false">取消</el-button>
        <el-button type="danger" @click="handleReset">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
const router = useRouter()
const vaultStore = useVaultStore()
const password = ref('')
const loading = ref(false)
const error = ref('')
const showResetConfirm = ref(false)

const handleUnlock = async () => {
  if (!password.value) {
    error.value = '请输入密码'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    await vaultStore.unlockVault(password.value)
    router.push('/vault')
  } catch (e: any) {
    error.value = '密码错误'
  } finally {
    loading.value = false
  }
}

const handleReset = async () => {
  // 删除 vault 文件
  try {
    // 这里需要添加删除命令
    showResetConfirm.value = false
    router.push('/')
  } catch (e) {
    console.error('Reset failed:', e)
  }
}
</script>

<style scoped>
.unlock-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.unlock-card {
  width: 420px;
  padding: 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.logo {
  text-align: center;
  margin-bottom: 32px;
}

.logo h1 {
  margin-top: 16px;
  font-size: 28px;
  color: #333;
}

.subtitle {
  color: #666;
  margin-top: 8px;
}

.actions {
  margin-top: 24px;
  text-align: center;
}
</style>
