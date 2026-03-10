const { defineConfig } = require('@playwright/test');

const webServerCommand = process.platform === 'win32'
  ? 'python -m http.server 5500 -d chip-todo'
  : 'python3 -m http.server 5500 -d chip-todo';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    baseURL: 'http://localhost:5500',
  },
  webServer: {
    command: webServerCommand,
    port: 5500,
    reuseExistingServer: true,
  },
});
