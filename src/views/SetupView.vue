<template>
  <div class="setup-container">
    <div class="setup-card">
      <div class="logo">
        <el-icon size="64" color="#409EFF"><Lock /></el-icon>
        <h1>PasswordCat</h1>
        <p class="subtitle">本地密码管理器</p>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="设置主密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入主密码"
            show-password
            size="large"
          />
        </el-form-item>

        <el-form-item label="确认主密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入主密码"
            show-password
            size="large"
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
          @click="handleCreate"
          style="width: 100%"
        >
          创建密码库
        </el-button>
      </el-form>

      <div class="tips">
        <el-alert
          title="重要提示"
          type="warning"
          :closable="false"
          description="主密码用于加密您的所有数据。请务必牢记，如果丢失将无法恢复！"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const vaultStore = useVaultStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const error = ref('')

const form = reactive({
  password: '',
  confirmPassword: '',
})

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  password: [
    { required: true, message: '请输入主密码', trigger: 'blur' },
    { min: 8, message: '密码长度至少8位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认主密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

const handleCreate = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    loading.value = true
    error.value = ''
    
    try {
      await vaultStore.createVault(form.password)
      router.push('/vault')
    } catch (e: any) {
      error.value = e.message || '创建失败'
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.setup-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.setup-card {
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

.tips {
  margin-top: 24px;
}
</style>
