#!/usr/bin/env node
/**
 * PasswordCat 版本递增脚本
 * 规则：PATCH +1，到10进位 MINOR，MINOR 到10进位 MAJOR
 */

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, 'package.json');
const tauriPath = path.join(__dirname, 'src-tauri', 'tauri.conf.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const tauri = JSON.parse(fs.readFileSync(tauriPath, 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);

let newPatch = patch + 1;
let newMinor = minor;
let newMajor = major;

if (newPatch >= 10) { newPatch = 0; newMinor++; }
if (newMinor >= 10) { newMinor = 0; newMajor++; }

const newVersion = `${newMajor}.${newMinor}.${newPatch}`;

pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

tauri.version = newVersion;
fs.writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n');

console.log(`版本号: ${major}.${minor}.${patch} → ${newVersion}`);
