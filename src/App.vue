<template>
  <router-view />
</template>

<script setup lang="ts">
</script>

<style>
:root {
  /* Light theme (default) */
  --bg-primary: #f5f7fa;
  --bg-secondary: #ffffff;
  --bg-card: #ffffff;
  --bg-input: #f5f7fa;
  --bg-sidebar: #ffffff;
  --bg-navbar: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --bg-button-primary: linear-gradient(135deg, #667eea, #764ba2);
  
  --text-primary: #303133;
  --text-secondary: #606266;
  --text-muted: #909399;
  --text-white: #ffffff;
  
  --border-color: #e4e7eb;
  --border-hover: #667eea;
  
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.12);
  --shadow-sidebar: 0 4px 12px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-card: #1f2937;
  --bg-input: #2d3748;
  --bg-sidebar: #1f2937;
  --bg-navbar: linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 100%);
  --bg-button-primary: linear-gradient(135deg, #3b82f6, #8b5cf6);
  
  --text-primary: #f9fafb;
  --text-secondary: #e5e7eb;
  --text-muted: #9ca3af;
  --text-white: #ffffff;
  
  --border-color: #374151;
  --border-hover: #3b82f6;
  
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-sidebar: 0 4px 12px rgba(0, 0, 0, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: background 0.3s, color 0.3s;
}

#app {
  height: 100vh;
  width: 100vw;
}
</style>
