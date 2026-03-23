import { createRouter, createWebHistory } from 'vue-router'
import SetupView from '@/views/SetupView.vue'
import UnlockView from '@/views/UnlockView.vue'
import MainView from '@/views/MainView.vue'
import { useVaultStore } from '@/stores/vault'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: SetupView,
      meta: { requiresNoVault: true },
    },
    {
      path: '/unlock',
      name: 'unlock',
      component: UnlockView,
      meta: { requiresVault: true },
    },
    {
      path: '/vault',
      name: 'vault',
      component: MainView,
      meta: { requiresUnlock: true },
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const vaultStore = useVaultStore()
  
  // 检查是否有 vault 文件
  const hasVault = await vaultStore.checkVaultExists()
  
  if (to.meta.requiresNoVault && hasVault) {
    next('/unlock')
  } else if (to.meta.requiresVault && !hasVault) {
    next('/')
  } else if (to.meta.requiresUnlock && !vaultStore.isUnlocked) {
    next('/unlock')
  } else {
    next()
  }
})

export default router
