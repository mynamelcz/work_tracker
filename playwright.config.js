const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    baseURL: 'http://localhost:5500',
  },
  webServer: {
    command: 'python3 -m http.server 5500 -d chip-todo',
    port: 5500,
    reuseExistingServer: true,
  },
});
