import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { ref, computed } from 'vue'

export interface PasswordEntry {
  id: string
  title: string
  username: string
  password: string
  url?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface VaultData {
  salt: string
  encryptedData: string
}

export const useVaultStore = defineStore('vault', () => {
  // State
  const isUnlocked = ref(false)
  const masterKey = ref('')
  const salt = ref('')
  const entries = ref<PasswordEntry[]>([])
  const vaultExists = ref(false)

  // Getters
  const entryCount = computed(() => entries.value.length)
  
  const searchEntries = (query: string) => {
    if (!query) return entries.value
    const lowerQuery = query.toLowerCase()
    return entries.value.filter(entry =>
      entry.title.toLowerCase().includes(lowerQuery) ||
      entry.username.toLowerCase().includes(lowerQuery) ||
      entry.url?.toLowerCase().includes(lowerQuery)
    )
  }

  // Actions
  const checkVaultExists = async (): Promise<boolean> => {
    try {
      vaultExists.value = await invoke('vault_exists')
      return vaultExists.value
    } catch (e) {
      console.error('Failed to check vault:', e)
      return false
    }
  }

  const createVault = async (masterPassword: string) => {
    // 生成 salt 和 key
    const [key, generatedSalt] = await invoke<[string, string]>('derive_key', {
      password: masterPassword,
      salt: null,
    })
    
    masterKey.value = key
    salt.value = generatedSalt
    
    // 初始化空数据
    const initialData = JSON.stringify({ entries: [] })
    const encrypted = await invoke<string>('encrypt_data', {
      data: initialData,
      key: masterKey.value,
    })
    
    // 保存 vault
    const vaultData: VaultData = {
      salt: salt.value,
      encryptedData: encrypted,
    }
    
    await invoke('save_vault', {
      data: JSON.stringify(vaultData),
    })
    
    entries.value = []
    isUnlocked.value = true
    vaultExists.value = true
  }

  const unlockVault = async (masterPassword: string) => {
    // 加载 vault
    const vaultJson = await invoke<string>('load_vault')
    const vaultData: VaultData = JSON.parse(vaultJson)
    
    // 使用存储的 salt 派生 key
    const [key] = await invoke<[string, string]>('derive_key', {
      password: masterPassword,
      salt: vaultData.salt,
    })
    
    // 尝试解密
    try {
      const decrypted = await invoke<string>('decrypt_data', {
        encryptedData: vaultData.encryptedData,
        key: key,
      })
      
      const data = JSON.parse(decrypted)
      entries.value = data.entries || []
      masterKey.value = key
      salt.value = vaultData.salt
      isUnlocked.value = true
      vaultExists.value = true
    } catch (e) {
      throw new Error('密码错误')
    }
  }

  const lockVault = () => {
    isUnlocked.value = false
    masterKey.value = ''
    entries.value = []
  }

  const saveEntries = async () => {
    if (!isUnlocked.value || !masterKey.value) {
      throw new Error('Vault is locked')
    }
    
    const data = JSON.stringify({ entries: entries.value })
    const encrypted = await invoke<string>('encrypt_data', {
      data,
      key: masterKey.value,
    })
    
    const vaultData: VaultData = {
      salt: salt.value,
      encryptedData: encrypted,
    }
    
    await invoke('save_vault', {
      data: JSON.stringify(vaultData),
    })
  }

  const addEntry = async (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEntry: PasswordEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    entries.value.push(newEntry)
    await saveEntries()
    return newEntry
  }

  const updateEntry = async (id: string, updates: Partial<PasswordEntry>) => {
    const index = entries.value.findIndex(e => e.id === id)
    if (index === -1) throw new Error('Entry not found')
    
    entries.value[index] = {
      ...entries.value[index],
      ...updates,
      updatedAt: Date.now(),
    }
    
    await saveEntries()
  }

  const deleteEntry = async (id: string) => {
    entries.value = entries.value.filter(e => e.id !== id)
    await saveEntries()
  }

  const generatePassword = async (options: {
    length: number
    useUppercase: boolean
    useNumbers: boolean
    useSymbols: boolean
  }): Promise<string> => {
    return await invoke('generate_password', options)
  }

  return {
    isUnlocked,
    masterKey,
    entries,
    vaultExists,
    entryCount,
    searchEntries,
    checkVaultExists,
    createVault,
    unlockVault,
    lockVault,
    saveEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    generatePassword,
  }
})
