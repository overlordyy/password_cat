/**
 * sign-mac.cjs
 * 对编译产物做 ad-hoc 签名，消除 macOS quarantine 提示
 * 用户下载后右键 → 打开，无需终端命令
 */

const { execSync } = require('child_process')
const { readFileSync } = require('fs')
const path = require('path')

// 读取当前版本号
const pkg = JSON.parse(readFileSync(path.join(__dirname, '../package.json'), 'utf8'))
const version = pkg.version

const appPath = path.join(
  __dirname,
  '../src-tauri/target/aarch64-apple-darwin/release/bundle/macos/PasswordCat.app'
)

const dmgPath = path.join(
  __dirname,
  `../src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/PasswordCat_${version}_aarch64.dmg`
)

console.log(`\n🔏 对 PasswordCat v${version} 进行 ad-hoc 签名...`)
console.log(`   App: ${appPath}`)

try {
  // 1. 对 .app 做 ad-hoc 签名（--sign - 表示 ad-hoc，不需要开发者证书）
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' })
  console.log('✅ .app 签名完成')

  // 2. 重新打包 DMG（签名后需要重新打包）
  console.log('\n📦 重新打包 DMG...')
  execSync(
    `hdiutil create -volname "PasswordCat" -srcfolder "${appPath}" -ov -format UDZO "${dmgPath}"`,
    { stdio: 'inherit' }
  )
  console.log(`✅ DMG 打包完成: PasswordCat_${version}_aarch64.dmg`)

  // 3. 对 DMG 本身也做签名
  execSync(`codesign --force --sign - "${dmgPath}"`, { stdio: 'inherit' })
  console.log('✅ DMG 签名完成\n')

  console.log(`🎉 构建完成！PasswordCat v${version} 已签名，用户无需终端即可安装。`)
} catch (err) {
  console.error('❌ 签名失败:', err.message)
  process.exit(1)
}
