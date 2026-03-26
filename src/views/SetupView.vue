<template>
  <div class="setup-container">
    <div class="setup-card">
      <!-- 顶部装饰 -->
      <div class="top-decoration"></div>
      
      <div class="logo-section">
        <div class="logo-icon">🔐</div>
        <h1 class="logo-title">PasswordCat</h1>
        <p class="logo-subtitle">智能密码管理器</p>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" label-position="top" class="setup-form">
        <el-form-item label="设置主密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="输入强密码（8位以上）"
            show-password
            size="large"
            prefix-icon="Lock"
            clearable
          />
          <div class="password-strength">
            <div class="strength-bar">
              <div class="strength-fill" :style="{ width: passwordStrength + '%', backgroundColor: strengthColor }"></div>
            </div>
            <span class="strength-text">{{ strengthText }}</span>
          </div>
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="再次输入密码"
            show-password
            size="large"
            prefix-icon="Lock"
            clearable
          />
        </el-form-item>

        <el-button 
          type="primary" 
          size="large" 
          @click="handleSetup" 
          :loading="loading"
          class="setup-button"
        >
          创建密码库
        </el-button>
      </el-form>

      <!-- 底部装饰 -->
      <div class="bottom-decoration"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const vaultStore = useVaultStore()

const form = ref({
  password: '',
  confirmPassword: '',
})

const loading = ref(false)
const formRef = ref()

const rules = {
  password: [
    { required: true, message: '请输入主密码', trigger: 'blur' },
    { min: 8, message: '密码至少8位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: any, callback: any) => {
        if (value !== form.value.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

// 密码强度计算
const passwordStrength = computed(() => {
  const pwd = form.value.password
  let strength = 0
  
  if (pwd.length >= 8) strength += 25
  if (pwd.length >= 12) strength += 25
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25
  if (/\d/.test(pwd)) strength += 12.5
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd)) strength += 12.5
  
  return Math.min(strength, 100)
})

const strengthColor = computed(() => {
  if (passwordStrength.value < 40) return '#F56C6C'
  if (passwordStrength.value < 70) return '#E6A23C'
  return '#67C23A'
})

const strengthText = computed(() => {
  if (passwordStrength.value < 40) return '弱'
  if (passwordStrength.value < 70) return '中'
  return '强'
})

const handleSetup = async () => {
  loading.value = true
  try {
    await formRef.value?.validate()
    await vaultStore.createVault(form.value.password)
    ElMessage.success('密码库创建成功！')
    router.push('/vault')
  } catch (error) {
    ElMessage.error(`创建失败: ${error}`)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.setup-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-navbar);
  padding: 20px;
}

.setup-card {
  width: 100%;
  max-width: 380px;
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 36px 32px;
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
    background: var(--bg-button-primary);
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
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}

.logo-icon {
  font-size: 40px;
  margin-bottom: 12px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.logo-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
  background: var(--bg-button-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 6px 0 0 0;
  letter-spacing: 1px;
}

.setup-form {
  position: relative;
  z-index: 1;

  :deep(.el-form-item__label) {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 14px;
  }

  :deep(.el-input__wrapper) {
    background: var(--bg-input);
    border: 2px solid var(--border-color);
    transition: all 0.3s;

    &:hover {
      border-color: var(--border-hover);
    }

    &:focus-within {
      background: var(--bg-secondary);
      border-color: var(--border-hover);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
  }
}

.password-strength {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: all 0.3s;
  border-radius: 2px;
}

.strength-text {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 30px;
}

.setup-button {
  width: 100%;
  height: 38px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: var(--bg-button-primary);
  transition: all 0.3s;
  margin-top: 16px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
