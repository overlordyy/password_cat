<template>
  <div class="generator-container">
    <h2>密码生成器</h2>
    
    <el-card class="generator-card">
      <div class="generated-password">
        <el-input
          v-model="generatedPassword"
          readonly
          size="large"
          class="password-display"
        >
          <template #append>
            <el-button @click="copyPassword">
              <el-icon><CopyDocument /></el-icon>
            </el-button>
            <el-button @click="generatePassword">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </template>
        </el-input>
      </div>

      <div class="strength-indicator">
        <span>密码强度:</span>
        <el-progress
          :percentage="strengthScore"
          :color="strengthColor"
          :stroke-width="8"
          class="strength-bar"
        />
        <el-tag :type="strengthType" size="small">{{ strengthText }}</el-tag>
      </div>

      <el-divider />

      <div class="options">
        <el-form label-width="120px">
          <el-form-item label="密码长度">
            <el-slider v-model="options.length" :min="4" :max="64" show-stops :step="1" />
            <span class="length-value">{{ options.length }} 位</span>
          </el-form-item>

          <el-form-item label="包含选项">
            <el-checkbox v-model="options.useUppercase">大写字母 (A-Z)</el-checkbox>
            <el-checkbox v-model="options.useLowercase" disabled>小写字母 (a-z)</el-checkbox>
            <el-checkbox v-model="options.useNumbers">数字 (0-9)</el-checkbox>
            <el-checkbox v-model="options.useSymbols">特殊符号 (!@#$...)</el-checkbox>
          </el-form-item>
        </el-form>
      </div>

      <el-button type="primary" size="large" @click="generatePassword" style="width: 100%">
        生成新密码
      </el-button>
    </el-card>

    <el-card class="tips-card">
      <template #header>
        <span>密码安全建议</span>
      </template>
      <ul>
        <li>密码长度至少 12 位以上</li>
        <li>包含大小写字母、数字和特殊符号</li>
        <li>不要在多个网站使用相同密码</li>
        <li>定期更换重要账户的密码</li>
        <li>使用密码管理器存储复杂密码</li>
      </ul>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { ElMessage } from 'element-plus'

const vaultStore = useVaultStore()

const options = ref({
  length: 16,
  useUppercase: true,
  useLowercase: true,
  useNumbers: true,
  useSymbols: true,
})

const generatedPassword = ref('')

const strengthScore = computed(() => {
  let score = 0
  const pwd = generatedPassword.value
  
  if (pwd.length >= 8) score += 20
  if (pwd.length >= 12) score += 20
  if (pwd.length >= 16) score += 10
  if (/[a-z]/.test(pwd)) score += 10
  if (/[A-Z]/.test(pwd)) score += 10
  if (/[0-9]/.test(pwd)) score += 10
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 20
  
  return Math.min(score, 100)
})

const strengthType = computed(() => {
  if (strengthScore.value < 40) return 'danger'
  if (strengthScore.value < 70) return 'warning'
  return 'success'
})

const strengthText = computed(() => {
  if (strengthScore.value < 40) return '弱'
  if (strengthScore.value < 70) return '中'
  return '强'
})

const strengthColor = computed(() => {
  if (strengthScore.value < 40) return '#f56c6c'
  if (strengthScore.value < 70) return '#e6a23c'
  return '#67c23a'
})

const generatePassword = async () => {
  const password = await vaultStore.generatePassword({
    length: options.value.length,
    useUppercase: options.value.useUppercase,
    useNumbers: options.value.useNumbers,
    useSymbols: options.value.useSymbols,
  })
  generatedPassword.value = password
}

const copyPassword = async () => {
  if (!generatedPassword.value) return
  try {
    await navigator.clipboard.writeText(generatedPassword.value)
    ElMessage.success('密码已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

// 初始生成
watch(options, generatePassword, { immediate: true, deep: true })
</script>

<style scoped>
.generator-container {
  max-width: 600px;
  margin: 0 auto;
}

.generator-container h2 {
  margin-bottom: 20px;
  color: #303133;
}

.generator-card {
  margin-bottom: 20px;
}

.generated-password {
  margin-bottom: 20px;
}

.password-display :deep(.el-input__inner) {
  font-family: 'Courier New', monospace;
  font-size: 18px;
  letter-spacing: 1px;
}

.strength-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.strength-bar {
  flex: 1;
}

.options {
  margin-bottom: 20px;
}

.length-value {
  margin-left: 12px;
  color: #606266;
}

.tips-card ul {
  padding-left: 20px;
  color: #606266;
  line-height: 2;
}
</style>
