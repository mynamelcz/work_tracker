# Chip Todo - 芯片测试工作看板

一个基于浏览器本地存储的芯片测试部门任务管理系统。

## 功能特性

- 📊 看板视图 - 甘特图展示任务进度
- 📁 项目管理 - 创建和管理芯片测试项目
- 👥 成员管理 - 团队成员和角色管理
- 📅 周视图 - 按周查看和导航任务
- 📜 历史存档 - 存档每周数据
- 📤 导入/导出 - JSON 格式数据备份

## 快速开始

### 运行应用

直接在浏览器中打开 `chip-todo/index.html`：

```bash
# Windows
start chip-todo/index.html

# macOS
open chip-todo/index.html

# Linux
xdg-open chip-todo/index.html
```

或使用 VS Code Live Server：

1. 安装扩展：`code --install-extension ritwickdey.LiveServer`
2. 右键 `index.html` → Open with Live Server

## 数据存储

- 本地存储：`localStorage`
- 数据键：`chip_todo_data`（当前数据）、`chip_todo_history`（历史存档）
- 导出备份：支持 JSON 格式导出/导入

## 技术栈

- Vanilla HTML/CSS/JavaScript
- 无需构建工具
- 兼容现代浏览器（Chrome, Firefox, Safari, Edge）
