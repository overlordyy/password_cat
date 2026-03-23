# PasswordCat 🐱‍💻

一款本地优先的密码管理器，你的数据真正属于你。

## 特性

- 🔒 **本地优先**：数据默认存储在本地，无需联网
- 🔐 **端到端加密**：使用 Argon2 + AES-256-GCM 加密
- 🗝️ **主密码保护**：只有正确的主密码才能解密数据
- 📋 **密码生成器**：生成高强度随机密码
- 📁 **文件可迁移**：复制数据文件即可在不同设备间迁移
- 🎨 **简洁界面**：基于 Element Plus 的现代化 UI

## 技术栈

- **前端**: Vue 3 + TypeScript + Element Plus
- **后端**: Tauri (Rust)
- **加密**: Argon2id + AES-256-GCM

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri-dev

# 构建
npm run tauri-build
```

## 安全说明

- 主密码不会被存储，只用于派生加密密钥
- 数据使用 AES-256-GCM 加密
- 密钥派生使用 Argon2id，抵抗暴力破解
- 请务必备份 `vault.enc` 文件

## 许可证

MIT
