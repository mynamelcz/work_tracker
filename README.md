# Chip Todo

芯片测试部门任务管理单页应用，基于原生 HTML、CSS、JavaScript 实现，使用浏览器
`localStorage` 持久化数据，不依赖后端服务。

## 项目定位

- `看板`：只读视图，用于按成员和状态查看任务，不负责编辑任务
- `管理`：创建和编辑项目、成员、任务
- `会议`：创建会议记录、导入参会人员、同步任务进展和阻塞问题、调整任务进度

这三块现在已经按职责分开：

- 看板不再承担编辑入口
- 管理页负责结构化维护任务数据
- 会议页只修改任务进度并沉淀会议记录

## 快速开始

### 直接打开

```bash
start chip-todo/index.html
```

### 本地静态服务

```bash
python -m http.server 5500 -d chip-todo
```

然后访问 `http://localhost:5500/`。

## 测试命令

```bash
npm test
npm run test:single
npm run test:ui
```

## 目录结构

```text
.
├── chip-todo/
│   ├── index.html
│   ├── clear-data.html
│   ├── css/style.css
│   └── js/
│       ├── utils.js
│       ├── store.js
│       └── app.js
├── docs/system-guide.md
├── tests/app.spec.js
├── playwright.config.js
└── package.json
```

## 数据存储

- 主数据：`chip_todo_data`
- 会议数据：`chip_todo_meetings`
- 历史归档：`chip_todo_history`

## 详细文档

完整的系统说明、页面职责、会议模型、数据结构、测试策略和维护建议见：

- [docs/system-guide.md](docs/system-guide.md)
