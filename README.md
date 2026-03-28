<div align="center">

# 🔐 PasswordCat

**本地优先的安全工具箱 · Local-First Security Toolbox**

[![Version](https://img.shields.io/badge/version-1.0.6-667eea?style=flat-square)](https://github.com/overlordyy/password_cat/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=flat-square)](https://github.com/overlordyy/password_cat/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Tauri](https://img.shields.io/badge/built%20with-Tauri%202-blue?style=flat-square)](https://tauri.app)
[![Stars](https://img.shields.io/github/stars/overlordyy/password_cat?style=flat-square&color=yellow)](https://github.com/overlordyy/password_cat/stargazers)

[官网 / Website](https://wxbbsmange.com) · [下载 / Download](https://wxbbsmange.com/#download) · [反馈 / Issues](https://github.com/overlordyy/password_cat/issues)

</div>

---

## 为什么做这个？

你有没有遇到过这些场景：

- 需要计算文件 MD5，打开了某个在线哈希网站，顺手粘贴进去……
- 要对比两份配置文件的差异，打开了在线 diff 工具，把生产环境的配置直接粘了进去……
- 用在线 Base64 工具解码了一段 JWT Token……

**这些操作，你的数据都经过了别人的服务器。**

PasswordCat 的答案很简单：**把这些常用工具搬到本地，所有操作离线完成，数据不离开你的设备。**

---

## 功能一览

### 🔑 密码 & 服务器管理
- AES-256-GCM 加密存储，主密码不离开设备
- 支持分组管理、快速搜索、一键复制
- 服务器信息（IP / 域名 / 账户 / 密码）集中管理，一键复制全部
- 支持 URL 字段，一键跳转对应网站

### 🛠️ 开发者工具（全部离线运行）

| 工具 | 功能 |
|------|------|
| 📄 **文本对比** | 左右分栏对比，字符级差异高亮，支持上传文件 |
| 🔧 **JSON 格式化** | 格式化 / 压缩 / 修复，语法高亮 + 树形视图 |
| 🔤 **Base64 编解码** | 文本互转，支持图片文件，URL Safe 模式 |
| 🕐 **时间戳转换** | 时间戳 ↔ 日期，8 大时区实时对比 |
| #️⃣ **哈希计算** | MD5 / SHA-1 / SHA-256 / SHA-384 / SHA-512，支持文件拖入 |

### 🎨 体验
- 亮色 / 暗色主题切换（对比结果区域始终保持亮色，便于阅读）
- 支持 macOS / Windows / Linux 三平台
- 1200×800 宽敞窗口布局

---

## 下载安装

前往 **[官网下载](https://wxbbsmange.com/#download)** 或 [GitHub Releases](https://github.com/overlordyy/password_cat/releases)

| 平台 | 文件 | 要求 |
|------|------|------|
| macOS | `PasswordCat_x.x.x_aarch64.dmg` | Apple Silicon (M1/M2/M3/M4)，macOS 10.13+ |
| Windows | `PasswordCat_x.x.x_x64-setup.exe` | Windows 10/11 64-bit |
| Linux | `PasswordCat_x.x.x_amd64.AppImage` | Ubuntu / Debian / Fedora |

---

## 安全设计

```
用户主密码
    │
    ▼ Argon2id 密钥派生（抗暴力破解）
加密密钥（仅存于内存，程序退出即消失）
    │
    ▼ AES-256-GCM 加密
vault.enc（本地文件，加密后的密文）
```

- ✅ 主密码**从不存储**，每次解锁重新派生
- ✅ 所有工具（哈希 / Base64 / Diff）**完全离线**，零网络请求
- ✅ 开源代码，可自行审计，无后门
- ✅ 数据文件 `vault.enc` 可自由备份和迁移

---

## 本地开发

```bash
# 环境要求：Node.js 18+，Rust 1.70+

# 克隆项目
git clone https://github.com/overlordyy/password_cat.git
cd password_cat

# 安装依赖
npm install

# 开发模式（热重载）
npm run tauri dev

# 构建（先递增版本号）
node bump-version.cjs
npm run tauri build -- --target aarch64-apple-darwin  # macOS
npm run tauri build                                    # Windows / Linux
```

---

## 技术栈

- **前端**：Vue 3 + TypeScript + Element Plus + SCSS
- **后端**：Tauri 2.x（Rust）
- **加密**：Argon2id（密钥派生）+ AES-256-GCM（数据加密）
- **构建**：GitHub Actions（三平台自动构建）

---

## 相关项目

- [password-cat-extension](https://github.com/overlordyy/password-cat-extension)：Chrome 浏览器插件（Manifest V3）

---

## 贡献

欢迎提交 Issue 和 PR！如果这个项目对你有帮助，请点个 ⭐ Star，这是对我最大的支持。

---

## License

MIT © [overlordyy](https://github.com/overlordyy)
