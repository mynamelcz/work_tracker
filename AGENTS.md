# AGENTS.md - Chip Todo Web Application

## Project Overview

Vanilla HTML/CSS/JS SPA for chip testing department task management. Uses localStorage for data persistence.

## Project Structure

```
./
├── chip-todo/
│   ├── index.html          # Main entry point
│   ├── clear-data.html     # Data clearing utility
│   ├── css/style.css       # All styles
│   └── js/
│       ├── utils.js        # Utility functions (loads first)
│       ├── store.js        # Data persistence layer
│       ├── demo-data.js    # Demo data generator
│       └── app.js          # Main application logic
├── tests/app.spec.js       # Playwright tests
├── playwright.config.js
├── package.json
└── .gitignore
```

## Build / Run Commands

### Running the Application
```bash
# Windows: start chip-todo/index.html
# Python server: python3 -m http.server 5500 -d chip-todo
```

### NPM Scripts (add to package.json)
```json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:single": "playwright test tests/app.spec.js"
  }
}
```

### Testing
```bash
# Install deps: npm install --save-dev @playwright/test
# Install browsers: npx playwright install chromium
# Run all tests: npm test
# Run single test: npm run test:single
# Run with UI: npm run test:ui
# Run specific test: npx playwright test -g "test name"
```

## Code Style Guidelines

### Naming Conventions
- **Classes**: PascalCase (`ChipTodoApp`, `DataStore`)
- **Functions/variables**: camelCase (`getWeekKey`, `currentView`)
- **Constants**: UPPER_SNAKE_CASE (`STORAGE_KEY`, `MEETINGS_KEY`)
- **DOM elements**: Prefix with `$` (`this.$container`)
- **Private methods**: Prefix with `_` (`_bindEvents()`)

### File Organization
```javascript
// Order: Constants → Class definitions → Utility objects → Init
const STORAGE_KEY = 'chip_todo_data';
class DataStore { ... }
const Utils = { ... };
const store = new DataStore();
```

### Script Load Order (in index.html)
```html
<script src="js/utils.js"></script>
<script src="js/store.js"></script>
<script src="js/demo-data.js"></script>
<script src="js/app.js"></script>
```

### Error Handling
- Wrap localStorage operations in try-catch
- Use alert() for user-facing messages
- Validate form inputs before processing

### Formatting
- 2 spaces indentation
- Max 100 characters per line
- Use template literals instead of string concatenation
- Prefer const, avoid var

### CSS Conventions
- CSS custom properties for colors/spacing
- BEM-lite naming: `.block`, `.block__element`

## Status Types

### Project Status (3 states)
- `in_progress` - 进行中
- `paused` - 暂停
- `completed` - 已结项

### Task Status (3 states)
- `in_progress` - 进行中
- `paused` - 暂停
- `completed` - 已完成

### Task Priority
- `low` - 低
- `medium` - 中
- `high` - 高

## Data Models

### localStorage Keys
- `chip_todo_data` - Main app data (projects, tasks, members)
- `chip_todo_meetings` - Meeting reports

### Data Structure
```javascript
{
  projects: [{ id, name, status, members: [...], ... }],
  members: [{ id, name, role, color }],
  tasks: [{ id, name, projectId, status, priority, progress, assignee, ... }]
}
```

## Testing Guidelines

### Test Pattern
```javascript
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('should add new project', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.click('.tab[data-view="management"]');
  // ... test logic
});
```

## Debugging Tips

- DevTools console: `localStorage.getItem('chip_todo_data')` to view raw data
- Reset: `localStorage.clear()` to clear all data
- Check browser console for runtime errors

## Cursor / Copilot Rules
- No Cursor rules found
- No Copilot rules found
