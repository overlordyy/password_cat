fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            crypto::derive_key,
            crypto::encrypt_data,
            crypto::decrypt_data,
            crypto::generate_password,
            storage::save_vault,
            storage::load_vault,
            storage::vault_exists,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod crypto {
    use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
    use argon2::password_hash::SaltString;
    use argon2::password_hash::rand_core::OsRng;
    use aes_gcm::{
        aead::{Aead, KeyInit, OsRng as AesRng},
        Aes256Gcm, Nonce,
    };
    use sha2::{Sha256, Digest};
    use base64::{Engine as _, engine::general_purpose};
    use rand::Rng;

    #[tauri::command]
    pub fn derive_key(password: &str, salt: Option<&str>) -> Result<(String, String), String> {
        let salt = match salt {
            Some(s) => SaltString::from_b64(s).map_err(|e| e.to_string())?,
            None => SaltString::generate(&mut OsRng),
        };

        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| e.to_string())?;

        let hash = password_hash.hash.ok_or("Failed to get hash")?;
        let key = general_purpose::STANDARD.encode(hash.as_bytes());

        Ok((key, salt.to_string()))
    }

    #[tauri::command]
    pub fn encrypt_data(data: &str, key: &str) -> Result<String, String> {
        let key_bytes = general_purpose::STANDARD.decode(key).map_err(|e| e.to_string())?;
        let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|e| e.to_string())?;

        let nonce_bytes: [u8; 12] = AesRng.gen();
        let nonce = Nonce::from_slice(&nonce_bytes);

        let encrypted = cipher
            .encrypt(nonce, data.as_bytes())
            .map_err(|e| e.to_string())?;

        let mut result = nonce_bytes.to_vec();
        result.extend(encrypted);

        Ok(general_purpose::STANDARD.encode(result))
    }

    #[tauri::command]
    pub fn decrypt_data(encrypted_data: &str, key: &str) -> Result<String, String> {
        let key_bytes = general_purpose::STANDARD.decode(key).map_err(|e| e.to_string())?;
        let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|e| e.to_string())?;

        let data = general_purpose::STANDARD.decode(encrypted_data).map_err(|e| e.to_string())?;

        if data.len() < 12 {
            return Err("Invalid encrypted data".to_string());
        }

        let (nonce_bytes, ciphertext) = data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        let decrypted = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| e.to_string())?;

        String::from_utf8(decrypted).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn generate_password(length: usize, use_uppercase: bool, use_numbers: bool, use_symbols: bool) -> String {
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
        (0..length)
            .map(|_| charset[rng.gen_range(0..charset.len())])
            .collect()
    }
}

mod storage {
    use std::fs;
    use std::path::PathBuf;
    use tauri::Manager;

    fn get_vault_path(app_handle: &tauri::AppHandle) -> PathBuf {
        let mut path = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
        path.push("vault.enc");
        path
    }

    #[tauri::command]
    pub fn save_vault(app_handle: tauri::AppHandle, data: &str) -> Result<(), String> {
        let path = get_vault_path(&app_handle);
        fs::write(&path, data).map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn load_vault(app_handle: tauri::AppHandle) -> Result<String, String> {
        let path = get_vault_path(&app_handle);
        fs::read_to_string(&path).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn vault_exists(app_handle: tauri::AppHandle) -> bool {
        let path = get_vault_path(&app_handle);
        path.exists()
    }
}
