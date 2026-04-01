#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use log::{info, error};
use simplelog::{CombinedLogger, WriteLogger, TermLogger, Config, LevelFilter, TerminalMode, ColorChoice};
use std::fs::OpenOptions;
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

fn get_log_dir() -> PathBuf {
    let path = if cfg!(target_os = "windows") {
        // Windows: %APPDATA%\PasswordCat\
        dirs::data_dir()
            .map(|h| h.join("PasswordCat"))
            .unwrap_or_else(|| PathBuf::from("C:\\passwordcat"))
    } else if cfg!(target_os = "macos") {
        // macOS: ~/Library/Logs/PasswordCat/
        dirs::home_dir()
            .map(|h| h.join("Library/Logs/PasswordCat"))
            .unwrap_or_else(|| PathBuf::from("."))
    } else if cfg!(target_os = "linux") {
        // Linux: ~/.local/share/passwordcat/
        dirs::home_dir()
            .map(|h| h.join(".local/share/passwordcat"))
            .unwrap_or_else(|| PathBuf::from("."))
    } else {
        PathBuf::from(".")
    };
    
    std::fs::create_dir_all(&path).ok();
    path
}

fn init_logging() {
    let log_dir = get_log_dir();
    let log_file_path = log_dir.join("passwordcat.log");
    
    let log_file = OpenOptions::new()
        .create(true)
        .write(true)
        .append(true)
        .open(&log_file_path)
        .ok();
    
    if let Some(file) = log_file {
        #[cfg(all(not(debug_assertions), target_os = "windows"))]
        {
            // Release build on Windows: only write to file, no terminal (no console window)
            WriteLogger::init(LevelFilter::Info, Config::default(), file).ok();
        }
        #[cfg(not(all(not(debug_assertions), target_os = "windows")))]
        {
            CombinedLogger::init(vec![
                TermLogger::new(LevelFilter::Info, Config::default(), TerminalMode::Mixed, ColorChoice::Auto),
                WriteLogger::new(LevelFilter::Info, Config::default(), file),
            ]).ok();
        }
    }
    
    info!("PasswordCat started! Log file: {:?}", log_file_path);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::panic::set_hook(Box::new(|panic_info| {
        error!("PANIC: {}", panic_info);
    }));

    tauri::Builder::default()
        .setup(|app| {
            init_logging();

            // 创建系统托盘菜单
            let show_item = MenuItem::with_id(app, "show", "显示 PasswordCat", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // 创建系统托盘
            // 使用白色轮廓模板图标，macOS 菜单栏自动适配亮/暗色
            let _tray = TrayIconBuilder::new()
                .icon(tauri::include_image!("icons/tray-icon.png"))
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app: &tauri::AppHandle, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        info!("User clicked quit from tray");
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray: &tauri::tray::TrayIcon<tauri::Wry>, event| {
                    // 左键点击托盘图标时显示窗口
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            info!("System tray created");
            Ok(())
        })
        .on_window_event(|window, event| {
            // macOS：点击关闭按钮时隐藏窗口而不退出
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                #[cfg(target_os = "macos")]
                {
                    info!("Window close requested, hiding instead of quitting");
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            crypto::derive_key,
            crypto::encrypt_data,
            crypto::decrypt_data,
            crypto::generate_password,
            storage::save_vault,
            storage::load_vault,
            storage::vault_exists,
            storage::get_log_path,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // macOS：点击 Dock 图标时重新显示窗口
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { has_visible_windows, .. } = event {
                if !has_visible_windows {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                        info!("Dock icon clicked, showing window");
                    }
                }
            }
        });
}

mod crypto {
    use log::{info, error};
    use argon2::{Argon2, PasswordHasher};
    use argon2::password_hash::SaltString;
    use argon2::password_hash::rand_core::OsRng;
    use aes_gcm::{
        aead::{Aead, KeyInit, OsRng as AesRng},
        Aes256Gcm, Nonce,
    };
    use base64::{Engine as _, engine::general_purpose};
    use rand::Rng;

    #[tauri::command]
    pub fn derive_key(password: &str, salt: Option<&str>) -> Result<(String, String), String> {
        info!("derive_key called");
        
        let salt = match salt {
            Some(s) => SaltString::from_b64(s).map_err(|e| {
                error!("Failed to parse salt: {}", e);
                e.to_string()
            })?,
            None => SaltString::generate(&mut OsRng),
        };

        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| {
                error!("Failed to hash password: {}", e);
                e.to_string()
            })?;

        let hash = password_hash.hash.ok_or("Failed to get hash")?;
        let key = general_purpose::STANDARD.encode(hash.as_bytes());
        
        info!("Key derived successfully");
        Ok((key, salt.to_string()))
    }

    #[tauri::command]
    pub fn encrypt_data(data: &str, key: &str) -> Result<String, String> {
        info!("encrypt_data called");
        
        let key_bytes = general_purpose::STANDARD.decode(key).map_err(|e| {
            error!("Failed to decode key: {}", e);
            e.to_string()
        })?;
        let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|e| {
            error!("Failed to create cipher: {}", e);
            e.to_string()
        })?;

        let nonce_bytes: [u8; 12] = AesRng.gen();
        let nonce = Nonce::from_slice(&nonce_bytes);

        let encrypted = cipher
            .encrypt(nonce, data.as_bytes())
            .map_err(|e| {
                error!("Encryption failed: {}", e);
                e.to_string()
            })?;

        let mut result = nonce_bytes.to_vec();
        result.extend(encrypted);
        
        info!("Data encrypted successfully");
        Ok(general_purpose::STANDARD.encode(result))
    }

    #[tauri::command]
    pub fn decrypt_data(encrypted_data: &str, key: &str) -> Result<String, String> {
        info!("decrypt_data called");
        
        let key_bytes = general_purpose::STANDARD.decode(key).map_err(|e| {
            error!("Failed to decode key: {}", e);
            e.to_string()
        })?;
        let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|e| {
            error!("Failed to create cipher: {}", e);
            e.to_string()
        })?;

        let data = general_purpose::STANDARD.decode(encrypted_data).map_err(|e| {
            error!("Failed to decode encrypted data: {}", e);
            e.to_string()
        })?;

        if data.len() < 12 {
            error!("Invalid encrypted data: too short");
            return Err("Invalid encrypted data".to_string());
        }

        let (nonce_bytes, ciphertext) = data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        let decrypted = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| {
                error!("Decryption failed (wrong password?): {}", e);
                e.to_string()
            })?;
        
        info!("Data decrypted successfully");
        String::from_utf8(decrypted).map_err(|e| {
            error!("Failed to convert decrypted data to UTF-8: {}", e);
            e.to_string()
        })
    }

    #[tauri::command]
    pub fn generate_password(length: usize, use_uppercase: bool, use_numbers: bool, use_symbols: bool) -> String {
        info!("generate_password called: length={}", length);
        
        let mut charset: Vec<char> = ('a'..='z').collect();

        if use_uppercase {
            charset.extend('A'..='Z');
        }
        if use_numbers {
            charset.extend('0'..='9');
        }
        if use_symbols {
            charset.extend("!@#$%^&*()_+-=[]{}|;:,.<>?".chars());
        }

        let mut rng = rand::thread_rng();
        let password: String = (0..length)
            .map(|_| charset[rng.gen_range(0..charset.len())])
            .collect();
        
        info!("Password generated");
        password
    }
}

mod storage {
    use log::{info, error};
    use std::fs;
    use std::path::PathBuf;

    fn get_vault_dir() -> PathBuf {
        let path = if cfg!(target_os = "windows") {
            // Windows: %APPDATA%\PasswordCat\
            dirs::data_dir()
                .map(|h| h.join("PasswordCat"))
                .unwrap_or_else(|| PathBuf::from("C:\\passwordcat"))
        } else if cfg!(target_os = "macos") {
            dirs::home_dir()
                .map(|h| h.join("Library/Application Support/PasswordCat"))
                .unwrap_or_else(|| PathBuf::from("."))
        } else if cfg!(target_os = "linux") {
            dirs::home_dir()
                .map(|h| h.join(".local/share/passwordcat"))
                .unwrap_or_else(|| PathBuf::from("."))
        } else {
            PathBuf::from(".")
        };
        
        fs::create_dir_all(&path).ok();
        path
    }

    #[tauri::command]
    pub fn save_vault(data: &str) -> Result<(), String> {
        let mut path = get_vault_dir();
        path.push("vault.enc");
        info!("Saving vault to: {:?}", path);
        
        fs::write(&path, data).map_err(|e| {
            error!("Failed to save vault: {}", e);
            e.to_string()
        })?;
        
        info!("Vault saved successfully");
        Ok(())
    }

    #[tauri::command]
    pub fn load_vault() -> Result<String, String> {
        let mut path = get_vault_dir();
        path.push("vault.enc");
        info!("Loading vault from: {:?}", path);
        
        if !path.exists() {
            info!("Vault file does not exist");
            return Err("Vault does not exist".to_string());
        }
        
        fs::read_to_string(&path).map_err(|e| {
            error!("Failed to load vault: {}", e);
            e.to_string()
        })
    }

    #[tauri::command]
    pub fn vault_exists() -> bool {
        let mut path = get_vault_dir();
        path.push("vault.enc");
        let exists = path.exists();
        info!("vault_exists: {} -> {}", path.display(), exists);
        exists
    }

    #[tauri::command]
    pub fn get_log_path() -> String {
        let path = super::get_log_dir();
        let log_file = path.join("passwordcat.log");
        let path_str = log_file.display().to_string();
        info!("Log path: {}", path_str);
        path_str
    }
}

fn main() {
    run();
}
