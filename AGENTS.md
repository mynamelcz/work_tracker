# AGENTS.md - Chip Todo Web Application

## Project Overview

This is a vanilla HTML/CSS/JS single-page web application for a chip testing department task management system. It runs directly in the browser using localStorage for data persistence.

## Project Structure

```
./
├── chip-todo/
│   ├── index.html      # Main entry point
│   ├── css/
│   │   └── style.css   # All styles
│   └── js/
│       ├── store.js    # Data persistence layer (localStorage)
│       ├── utils.js    # Utility functions
│       └── app.js      # Main application logic
├── package.json        # Minimal package (oh-my-opencode dependency only)
└── node_modules/
```

## Build / Run Commands

### Running the Application

This is a vanilla HTML/CSS/JS project with no build system required.

```bash
# Open directly in browser (Windows)
start chip-todo/index.html

# macOS
open chip-todo/index.html

# Linux
xdg-open chip-todo/index.html

# VS Code Live Server (recommended for development)
# Install: code --install-extension ritwickdey.LiveServer
# Then right-click index.html -> Open with Live Server
```

### Linting

This project has no built-in linter. To add JavaScript linting:

```bash
# Install ESLint (one-time setup)
npm init -y
npm install --save-dev eslint

# Run ESLint on all JS files
npx eslint chip-todo/js/*.js

# Run on a single file
npx eslint chip-todo/js/app.js
```

### Testing

**No formal test framework exists.** Manual testing approach:

1. Open `chip-todo/index.html` in browser
2. Test CRUD operations for members, projects, tasks
3. Verify localStorage persistence (refresh page)
4. Test week navigation and historical data

**To add automated testing (recommended):**

```bash
# Install testing dependencies
npm install --save-dev @playwright/test

# Create tests/test.js with Playwright tests
# Run all tests
npx playwright test

# Run a single test file
npx playwright test tests/app.spec.js

# Run tests matching a pattern
npx playwright test --grep "member"
```

## Code Style Guidelines

### General Principles

- Keep files small and focused (single responsibility)
- Use ES6+ features (const/let, arrow functions, template literals)
- Avoid dependencies unless absolutely necessary
- All code must work in modern browsers (Chrome, Firefox, Safari, Edge)

### JavaScript Conventions

#### Naming Conventions

- **Classes**: PascalCase (e.g., `ChipTodoApp`, `DataStore`)
- **Functions/variables**: camelCase (e.g., `getWeekKey`, `currentView`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `STORAGE_KEY`, `DEFAULT_DATA`)
- **DOM elements**: Prefix with `$` for clarity (e.g., `this.$container`)
- **Private methods**: Prefix with `_` (e.g., `_bindEvents()`)
- **File names**: camelCase (e.g., `store.js`, `utils.js`)

#### File Organization

```javascript
// 1. Constants (top-level)
const STORAGE_KEY = 'chip_todo_data';
const HISTORY_KEY = 'chip_todo_history';

const DEFAULT_DATA = { ... };

// 2. Class definitions
class DataStore { ... }

// 3. Utility objects (if separate file)
const Utils = { ... };

// 4. Module exports / Application initialization
const store = new DataStore();
const app = new ChipTodoApp();
```

#### Imports and Module Pattern

This is a vanilla JS project - no ES modules or imports. All files share global scope via script tags in index.html:

```html
<script src="js/utils.js"></script>
<script src="js/store.js"></script>
<script src="js/app.js"></script>
```

- Define dependencies in order: utils.js → store.js → app.js
- utils.js must load first (no dependencies)
- store.js depends on utils.js (uses Utils)
- app.js depends on both

#### Type Guidelines

JavaScript is untyped. Use JSDoc for documentation:

```javascript
/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} projectId
 * @property {string} name
 * @property {string|null} assignee
 * @property {string} status - 'pending' | 'in_progress' | 'completed'
 * @property {number} progress - 0-100
 */

/**
 * Get tasks for a specific week
 * @param {number} week
 * @param {number} year
 * @returns {Task[]}
 */
getTasksByWeek(week, year) { ... }
```

#### Error Handling

- Wrap localStorage operations in try-catch
- Provide user-friendly error messages via alert()
- Validate form inputs before processing
- Log errors to console for debugging

```javascript
// Good pattern
load() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored data:', e);
    }
  }
  return { ...DEFAULT_DATA };
}

// Form validation example
if (!formData.get('name')?.trim()) {
  alert('名称不能为空');
  return;
}
```

#### Event Handling

- Use event delegation for dynamic elements
- Clean up event listeners when removing elements (modal overlays)
- Use closest() for safer event targeting

```javascript
// Good pattern - delegation
Utils.$('#app').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (tab) {
    this.switchView(tab.dataset.view);
  }
});

// Cleanup pattern
const overlay = Utils.showModal(modalContent);
modalContent.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
```

#### Formatting Rules

- Use 2 spaces for indentation
- Maximum line length: 100 characters
- Use template literals instead of string concatenation
- Prefer const over let, avoid var
- Use semicolons consistently

```javascript
// Good
const projectName = project.name;
const fullName = `${member.name} (${member.role})`;
const tasks = store.getTasksByWeek(week, year);

// Avoid
var projectName = project.name;
var fullName = member.name + ' (' + member.role + ')';
```

### CSS Conventions

- Use CSS custom properties (variables) for colors and spacing
- Follow BEM-lite naming: `.block`, `.block__element`, `.block--modifier`
- Keep selectors simple and specific
- Group related styles

```css
/* Good pattern */
:root {
  --primary: #3B82F6;
  --primary-hover: #2563EB;
  --danger: #EF4444;
  --radius: 8px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
}

.btn { ... }
.btn--primary { ... }
.btn__icon { ... }
.btn--danger { ... }

/* Avoid overly specific selectors */
.btn .icon { ... }  /* Avoid */
.btn__icon { ... }  /* Preferred */
```

### HTML Conventions

- Use semantic HTML5 elements (header, nav, main, footer, section)
- Keep inline styles to a minimum
- Use data-* attributes for JavaScript hooks
- Add alt text to images

```html
<!-- Good -->
<button class="tab active" data-view="board">看板</button>
<div class="task-item" data-id="task-123">

<!-- Avoid -->
<button class="tab active" view="board">看板</button>
<div class="task-item" id="task-123">
```

### Git Conventions

- Commit messages: clear, concise, imperative mood
- Branch naming: feature/description, bugfix/description
- No commit if tests fail
- Run lint before committing

## Additional Notes

- Data is stored in browser's localStorage under keys: `chip_todo_data`, `chip_todo_history`
- No authentication or server-side storage
- Single-user application (no multi-user sync)
- No Cursor or Copilot rules found in repository
