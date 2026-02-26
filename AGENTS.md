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
# Windows
start chip-todo/index.html

# macOS
open chip-todo/index.html

# VS Code Live Server (recommended)
# Install: code --install-extension ritwickdey.LiveServer
# Right-click index.html -> Open with Live Server
```

### Linting

```bash
# Install ESLint
npm init -y && npm install --save-dev eslint

# Run on all JS files
npx eslint chip-todo/js/*.js

# Run single file
npx eslint chip-todo/js/app.js
```

### Testing

**Manual testing**: Open `chip-todo/index.html` in browser, test CRUD operations, verify localStorage persistence.

**Automated testing with Playwright:**

```bash
# Install
npm install --save-dev @playwright/test

# Run all tests
npx playwright test

# Run single test file
npx playwright test tests/app.spec.js

# Run tests matching pattern
npx playwright test --grep "member"
```

## Code Style Guidelines

### JavaScript Conventions

#### Naming
- **Classes**: PascalCase (`ChipTodoApp`, `DataStore`)
- **Functions/variables**: camelCase (`getWeekKey`, `currentView`)
- **Constants**: UPPER_SNAKE_CASE (`STORAGE_KEY`, `DEFAULT_DATA`)
- **DOM elements**: Prefix with `$` (`this.$container`)
- **Private methods**: Prefix with `_` (`_bindEvents()`)
- **File names**: camelCase (`store.js`, `utils.js`)

#### File Organization
```javascript
// 1. Constants
const STORAGE_KEY = 'chip_todo_data';

// 2. Class definitions
class DataStore { ... }

// 3. Utility objects
const Utils = { ... };

// 4. Application initialization
const store = new DataStore();
```

#### Imports (Script Tag Order)
```html
<script src="js/utils.js"></script>
<script src="js/store.js"></script>
<script src="js/app.js"></script>
```
- utils.js loads first (no dependencies)
- store.js depends on utils.js
- app.js depends on both

#### Type Guidelines (JSDoc)
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
 * @param {number} week
 * @param {number} year
 * @returns {Task[]}
 */
getTasksByWeek(week, year) { ... }
```

#### Error Handling
- Wrap localStorage operations in try-catch
- Use alert() for user-friendly messages
- Validate form inputs before processing
```javascript
load() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); }
    catch (e) { console.error('Failed to parse:', e); }
  }
  return { ...DEFAULT_DATA };
}
```

#### Event Handling
- Use event delegation for dynamic elements
- Use closest() for safer targeting
- Clean up modal overlays on close

#### Formatting
- 2 spaces indentation
- Max 100 characters per line
- Template literals over concatenation
- Prefer const, avoid var

### CSS Conventions
- CSS custom properties for colors/spacing
- BEM-lite: `.block`, `.block__element`, `.block--modifier`
- Simple, specific selectors

### HTML Conventions
- Semantic HTML5 elements
- data-* attributes for JS hooks

### Git Conventions
- Imperative commit messages
- Branch: `feature/description`, `bugfix/description`

## Additional Notes

- localStorage keys: `chip_todo_data`, `chip_todo_history`
- No authentication or server-side storage
- No Cursor or Copilot rules found
