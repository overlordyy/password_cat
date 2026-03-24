<template>
  <div class="unlock-container">
    <div class="unlock-card">
      <!-- 顶部装饰 -->
      <div class="top-decoration"></div>

      <div class="logo-section">
        <div class="logo-icon">🔐</div>
        <h1 class="logo-title">PasswordCat</h1>
        <p class="logo-subtitle">输入主密码解锁</p>
      </div>

      <el-form @submit.prevent="handleUnlock" class="unlock-form">
        <el-form-item>
          <el-input
            v-model="password"
            type="password"
            placeholder="输入主密码"
            show-password
            size="large"
            prefix-icon="Lock"
            clearable
            @keyup.enter="handleUnlock"
          />
        </el-form-item>

        <el-alert
          v-if="error"
          :title="error"
          type="error"
          :closable="true"
          @close="error = ''"
          class="error-alert"
        />

        <el-button 
          type="primary" 
          size="large" 
          @click="handleUnlock" 
          :loading="loading"
          class="unlock-button"
        >
          解锁
        </el-button>
      </el-form>

      <!-- 底部装饰 -->
      <div class="bottom-decoration"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const vaultStore = useVaultStore()

const password = ref('')
const error = ref('')
const loading = ref(false)

const handleUnlock = async () => {
  if (!password.value) {
    error.value = '请输入主密码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await vaultStore.unlockVault(password.value)
    ElMessage.success('解锁成功！')
    router.push('/vault')
  } catch (err) {
    error.value = '密码错误，请重试'
    password.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.unlock-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.unlock-card {
  width: 100%;
  max-width: 380px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 50px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea, #764ba2);
  }
}

.top-decoration {
  position: absolute;
  top: -50px;
  right: -50px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
  border-radius: 50%;
}

.bottom-decoration {
  position: absolute;
  bottom: -50px;
  left: -50px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(118, 75, 162, 0.1) 0%, transparent 70%);
  border-radius: 50%;
}

.logo-section {
  text-align: center;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.logo-icon {
  font-size: 48px;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.logo-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-subtitle {
  font-size: 13px;
  color: #909399;
  margin: 6px 0 0 0;
  letter-spacing: 1px;
}

.unlock-form {
  position: relative;
  z-index: 1;

  :deep(.el-input__wrapper) {
    background: #f5f7fa;
    border: 2px solid #e4e7eb;
    transition: all 0.3s;

    &:hover {
      border-color: #667eea;
    }

    &:focus-within {
      background: #fff;
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
    }
  }
}

.error-alert {
  margin-bottom: 16px;
}

.unlock-button {
  width: 100%;
  height: 38px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  transition: all 0.3s;
  margin-top: 16px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
