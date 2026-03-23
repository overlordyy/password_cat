fn main() {
  tauri_build::build();

  // Windows: 隐藏控制台窗口
  #[cfg(target_os = "windows")]
  {
    use std::env;
    println!("cargo:rustc-link-arg=/SUBSYSTEM:WINDOWS");
  }
}
