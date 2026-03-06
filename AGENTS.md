# AGENTS.md - Chip Todo Web Application

## Project Overview

Vanilla HTML/CSS/JS single-page web application for chip testing department task management. Uses localStorage for data persistence.

## Project Structure

```
./
├── chip-todo/
│   ├── index.html      # Main entry point
│   ├── css/style.css   # All styles
│   └── js/
│       ├── utils.js    # Utility functions (loads first)
│       ├── store.js    # Data persistence layer
│       └── app.js      # Main application logic
├── package.json
└── .gitignore
```

## Build / Run Commands

### Running the Application

```bash
# Windows: start chip-todo/index.html
# macOS: open chip-todo/index.html
# VS Code Live Server (recommended): Right-click index.html -> Open with Live Server
```

### NPM Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "lint": "eslint chip-todo/js/*.js",
    "lint:fix": "eslint chip-todo/js/*.js --fix",
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:single": "playwright test tests/app.spec.js"
  }
}
```

### Testing

```bash
# Install deps: npm install --save-dev eslint @playwright/test
# Install browsers: npx playwright install chromium
# Run all tests: npm test
# Run single test: npm run test:single
# Run with UI: npm run test:ui
```

**Playwright config** (`playwright.config.js`):
```javascript
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: { headless: true, baseURL: 'http://localhost:5500' },
  webServer: { command: 'npx serve -l 5500 chip-todo', port: 5500, reuseExistingServer: true },
});
```

## Code Style Guidelines

### Naming
- **Classes**: PascalCase (`ChipTodoApp`, `DataStore`)
- **Functions/variables**: camelCase (`getWeekKey`, `currentView`)
- **Constants**: UPPER_SNAKE_CASE (`STORAGE_KEY`, `DEFAULT_DATA`)
- **DOM elements**: Prefix with `$` (`this.$container`)
- **Private methods**: Prefix with `_` (`_bindEvents()`)

### File Organization
```javascript
// 1. Constants → 2. Class definitions → 3. Utility objects → 4. Init
const STORAGE_KEY = 'chip_todo_data';
class DataStore { ... }
const Utils = { ... };
const store = new DataStore();
```

### Imports (Script Tag Order)
```html
<script src="js/utils.js"></script>
<script src="js/store.js"></script>
<script src="js/app.js"></script>
```

### Type Guidelines (JSDoc)
```javascript
/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} status - 'pending' | 'in_progress' | 'completed'
 */
/** @param {number} week @returns {Task[]} */
getTasksByWeek(week) { ... }
```

### Error Handling
- Wrap localStorage in try-catch
- Use alert() for user messages
- Validate form inputs before processing

### Formatting
- 2 spaces indentation, max 100 chars/line
- Template literals over concatenation
- Prefer const, avoid var

### CSS Conventions
- CSS custom properties for colors/spacing
- BEM-lite: `.block`, `.block__element`, `.block--modifier`

### Git Conventions
- Imperative commit messages
- Branch: `feature/description`, `bugfix/description`

## Additional Notes

- localStorage keys: `chip_todo_data`, `chip_todo_history`
- No authentication or server-side storage

### Debugging Tips
- Use DevTools: `localStorage.getItem('chip_todo_data')` to view raw data
- Use `localStorage.clear()` to reset data during testing

### Cursor / Copilot Rules
- No Cursor rules found (no `.cursor/rules/` or `.cursorrules`)
- No Copilot rules found (no `.github/copilot-instructions.md`)
