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
  group?: string
  createdAt: number
  updatedAt: number
}

export interface ServerEntry {
  id: string
  name: string
  ip: string
  domain?: string
  username: string
  password: string
  notes?: string
  group?: string
  createdAt: number
  updatedAt: number
}

export interface NoteEntry {
  id: string
  title: string
  content: string
  group?: string
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
  const servers = ref<ServerEntry[]>([])
  const notes = ref<NoteEntry[]>([])
  const passwordGroups = ref<string[]>([])
  const serverGroups = ref<string[]>([])
  const noteGroups = ref<string[]>([])
  const vaultExists = ref(false)

  // Getters
  const entryCount = computed(() => entries.value.length)
  const serverCount = computed(() => servers.value.length)
  const noteCount = computed(() => notes.value.length)
  const allPasswordGroups = computed(() => passwordGroups.value.sort())
  const allServerGroups = computed(() => serverGroups.value.sort())
  const allNoteGroups = computed(() => noteGroups.value.sort())
  
  const searchEntries = (query: string) => {
    if (!query) return entries.value
    const lowerQuery = query.toLowerCase()
    return entries.value.filter(entry =>
      entry.title.toLowerCase().includes(lowerQuery) ||
      entry.username.toLowerCase().includes(lowerQuery) ||
      entry.url?.toLowerCase().includes(lowerQuery) ||
      entry.group?.toLowerCase().includes(lowerQuery)
    )
  }

  const searchServers = (query: string) => {
    if (!query) return servers.value
    const lowerQuery = query.toLowerCase()
    return servers.value.filter(server =>
      server.name.toLowerCase().includes(lowerQuery) ||
      server.ip.includes(lowerQuery) ||
      server.domain?.toLowerCase().includes(lowerQuery) ||
      server.username.toLowerCase().includes(lowerQuery) ||
      server.group?.toLowerCase().includes(lowerQuery)
    )
  }

  const searchNotes = (query: string) => {
    if (!query) return notes.value
    const lowerQuery = query.toLowerCase()
    return notes.value.filter(note =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery) ||
      note.group?.toLowerCase().includes(lowerQuery)
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
    const initialData = JSON.stringify({ entries: [], servers: [], notes: [], passwordGroups: [], serverGroups: [], noteGroups: [] })
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
    servers.value = []
    notes.value = []
    passwordGroups.value = []
    serverGroups.value = []
    noteGroups.value = []
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
      servers.value = data.servers || []
      notes.value = data.notes || []
      passwordGroups.value = data.passwordGroups || []
      serverGroups.value = data.serverGroups || []
      noteGroups.value = data.noteGroups || []
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
    servers.value = []
    notes.value = []
    passwordGroups.value = []
    serverGroups.value = []
    noteGroups.value = []
  }

  const saveEntries = async () => {
    if (!isUnlocked.value || !masterKey.value) {
      throw new Error('Vault is locked')
    }
    
    const data = JSON.stringify({ 
      entries: entries.value, 
      servers: servers.value, 
      notes: notes.value,
      passwordGroups: passwordGroups.value, 
      serverGroups: serverGroups.value,
      noteGroups: noteGroups.value
    })
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

  // Server management
  const addServer = async (server: Omit<ServerEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newServer: ServerEntry = {
      ...server,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    servers.value.push(newServer)
    if (server.group && !serverGroups.value.includes(server.group)) {
      serverGroups.value.push(server.group)
    }
    await saveEntries()
    return newServer
  }

  const updateServer = async (id: string, updates: Partial<ServerEntry>) => {
    const index = servers.value.findIndex(s => s.id === id)
    if (index === -1) throw new Error('Server not found')
    
    servers.value[index] = {
      ...servers.value[index],
      ...updates,
      updatedAt: Date.now(),
    }
    
    if (updates.group && !serverGroups.value.includes(updates.group)) {
      serverGroups.value.push(updates.group)
    }
    
    await saveEntries()
  }

  const deleteServer = async (id: string) => {
    servers.value = servers.value.filter(s => s.id !== id)
    await saveEntries()
  }

  const addPasswordGroup = (groupName: string) => {
    if (!passwordGroups.value.includes(groupName)) {
      passwordGroups.value.push(groupName)
      passwordGroups.value.sort()
    }
  }

  const addServerGroup = (groupName: string) => {
    if (!serverGroups.value.includes(groupName)) {
      serverGroups.value.push(groupName)
      serverGroups.value.sort()
    }
  }

  const deletePasswordGroup = async (groupName: string) => {
    entries.value = entries.value.filter(e => e.group !== groupName)
    passwordGroups.value = passwordGroups.value.filter(g => g !== groupName)
    await saveEntries()
  }

  const deleteServerGroup = async (groupName: string) => {
    servers.value = servers.value.filter(s => s.group !== groupName)
    serverGroups.value = serverGroups.value.filter(g => g !== groupName)
    await saveEntries()
  }

  // Note management
  const addNote = async (note: Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newNote: NoteEntry = {
      ...note,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    notes.value.push(newNote)
    if (note.group && !noteGroups.value.includes(note.group)) {
      noteGroups.value.push(note.group)
    }
    await saveEntries()
    return newNote
  }

  const updateNote = async (id: string, updates: Partial<NoteEntry>) => {
    const index = notes.value.findIndex(n => n.id === id)
    if (index === -1) throw new Error('Note not found')
    
    notes.value[index] = {
      ...notes.value[index],
      ...updates,
      updatedAt: Date.now(),
    }
    
    if (updates.group && !noteGroups.value.includes(updates.group)) {
      noteGroups.value.push(updates.group)
    }
    
    await saveEntries()
  }

  const deleteNote = async (id: string) => {
    notes.value = notes.value.filter(n => n.id !== id)
    await saveEntries()
  }

  const addNoteGroup = (groupName: string) => {
    if (!noteGroups.value.includes(groupName)) {
      noteGroups.value.push(groupName)
      noteGroups.value.sort()
    }
  }

  const deleteNoteGroup = async (groupName: string) => {
    notes.value = notes.value.filter(n => n.group !== groupName)
    noteGroups.value = noteGroups.value.filter(g => g !== groupName)
    await saveEntries()
  }

  return {
    isUnlocked,
    masterKey,
    entries,
    servers,
    notes,
    passwordGroups,
    serverGroups,
    noteGroups,
    vaultExists,
    entryCount,
    serverCount,
    noteCount,
    allPasswordGroups,
    allServerGroups,
    allNoteGroups,
    searchEntries,
    searchServers,
    searchNotes,
    checkVaultExists,
    createVault,
    unlockVault,
    lockVault,
    saveEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    generatePassword,
    addServer,
    updateServer,
    deleteServer,
    addPasswordGroup,
    addServerGroup,
    deletePasswordGroup,
    deleteServerGroup,
    addNote,
    updateNote,
    deleteNote,
    addNoteGroup,
    deleteNoteGroup,
  }
})
