class ChipTodoApp {
  constructor() {
    this.currentView = 'board';
    this.currentProject = null;
    this.currentMember = null;
    this.meetingWeek = null;
    this.meetingYear = null;
    this.boardFilter = 'all'; // all, in_progress, paused, completed
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadInitialData();
  }

  loadInitialData() {
    const now = store.getCurrentWeek();
    if (!store.data.currentWeek || !store.data.currentYear) {
      store.setCurrentWeek(now.week, now.year);
    }
  }

  render() {
    const app = Utils.$('#app');
    app.innerHTML = `
      <header class="header">
        <h1>${Utils.icon('chip')} 芯片测试工作看板</h1>
      </header>
      
      <nav class="tabs">
        <button class="tab ${this.currentView === 'board' ? 'active' : ''}" data-view="board">${Utils.icon('board')} 看板</button>
        <button class="tab ${this.currentView === 'management' ? 'active' : ''}" data-view="management">${Utils.icon('settings')} 管理</button>
        <button class="tab ${this.currentView === 'meeting' ? 'active' : ''}" data-view="meeting">${Utils.icon('calendar')} 会议</button>
      </nav>
      
      <main class="main-content">
        <div id="boardView" class="view ${this.currentView === 'board' ? '' : 'hidden'}"></div>
        <div id="managementView" class="view ${this.currentView === 'management' ? '' : 'hidden'}"></div>
        <div id="meetingView" class="view ${this.currentView === 'meeting' ? '' : 'hidden'}"></div>
      </main>
      
      <footer class="footer">
        <div class="stats" id="stats"></div>
        <div class="actions">
          <button class="btn btn-secondary" id="exportBtn">${Utils.icon('download')} 导出</button>
          <button class="btn btn-secondary" id="importBtn">${Utils.icon('upload')} 导入</button>
          <input type="file" id="importFile" accept=".json" style="display:none">
        </div>
      </footer>
    `;
    
    this.renderBoard();
    this.renderManagement();
    this.renderMeeting();
    this.updateStats();
  }

  bindEvents() {
    const appRoot = Utils.$('#app');

    appRoot.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab) {
        this.switchView(tab.dataset.view);
        return;
      }
      
      const exportBtn = e.target.closest('#exportBtn');
      if (exportBtn) {
        this.exportData();
        return;
      }
      
      const importBtn = e.target.closest('#importBtn');
      if (importBtn) {
        Utils.$('#importFile').click();
      }
    });

    appRoot.addEventListener('change', (e) => {
      if (e.target.matches('#importFile')) {
        this.importData(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  switchView(view) {
    this.currentView = view;
    Utils.$$('.tab').forEach(t => t.classList.remove('active'));
    Utils.$(`.tab[data-view="${view}"]`).classList.add('active');
    Utils.$$('.view').forEach(v => v.classList.add('hidden'));
    Utils.$(`#${view}View`).classList.remove('hidden');
  }

  updateStats() {
    const stats = store.getStats(store.data.currentWeek, store.data.currentYear);
    const statsEl = Utils.$('#stats');
    if (!statsEl) return;
    statsEl.innerHTML = `
      <span>${Utils.icon('chart')} ${stats.completed}/${stats.total} 任务完成</span>
      <span class="progress-bar">
        <span class="progress-fill" style="width: ${stats.progress}%"></span>
      </span>
      <span>${stats.progress}%</span>
      <span>${Utils.icon('user')} 负责人: ${stats.membersWithTasks}人</span>
    `;
  }

  renderBoard() {
    const container = Utils.$('#boardView');
    const members = store.data.members;
    const { tasks, projects, selectedProject, totalTasks } = this.getFilteredData(this.boardFilter);
    const projectTaskStats = this.getProjectTaskStats(this.getTasksByStatusFilter(this.boardFilter));
    const filterLabels = {
      all: '全部任务',
      in_progress: '进行中',
      paused: '已暂停',
      completed: '已完成'
    };

    container.innerHTML = `
      <div class="board">
        <div class="sidebar">
          <div class="board-summary">
            <div class="summary-card">
              <span class="summary-label">当前范围</span>
              <strong>${filterLabels[this.boardFilter]}</strong>
            </div>
            <div class="summary-card">
              <span class="summary-label">可见任务</span>
              <strong>${totalTasks}</strong>
            </div>
          </div>
          <h3>项目列表</h3>
          <div class="project-list" id="projectList">
            <div class="project-item ${this.currentProject ? '' : 'active'}" data-id="">
              <div class="project-item-header">
                <div class="project-name">全部项目</div>
              </div>
              <div class="project-meta">${totalTasks} 项任务</div>
            </div>
            ${projects.map(p => this.renderProjectItem(p, projectTaskStats[p.id])).join('')}
          </div>
        </div>
        
        <div class="board-content">
          <div class="board-header">
            <div>
              <h3>任务甘特图</h3>
              <p class="board-subtitle">
                ${selectedProject
                  ? `当前项目：${Utils.escapeHtml(selectedProject.name)}`
                  : '按任务状态和项目查看当前工作负载'}
              </p>
            </div>
            <div class="filter-tabs">
              <button class="filter-tab ${this.boardFilter === 'all' ? 'active' : ''}" data-filter="all">全部</button>
              <button class="filter-tab ${this.boardFilter === 'in_progress' ? 'active' : ''}" data-filter="in_progress">进行中</button>
              <button class="filter-tab ${this.boardFilter === 'paused' ? 'active' : ''}" data-filter="paused">暂停</button>
              <button class="filter-tab ${this.boardFilter === 'completed' ? 'active' : ''}" data-filter="completed">已完成</button>
            </div>
          </div>
          ${tasks.length === 0
            ? `<div class="empty empty-panel">
                <strong>当前筛选下没有任务</strong>
                <span>切换状态筛选，或到“管理”页补充项目与任务。</span>
              </div>`
            : this.renderGantt(tasks, members, projects)}
        </div>
      </div>
    `;
    
    this.bindBoardEvents();
    this.bindFilterEvents();
  }

  getFilteredData(filter) {
    const tasks = this.getTasksByStatusFilter(filter);

    const projectIds = new Set(tasks.map((task) => task.projectId));
    const projects = store.data.projects.filter((project) => projectIds.has(project.id));

    if (this.currentProject && !projectIds.has(this.currentProject)) {
      this.currentProject = null;
    }

    const visibleTasks = this.currentProject
      ? tasks.filter((task) => task.projectId === this.currentProject)
      : tasks;

    return {
      tasks: visibleTasks,
      projects,
      totalTasks: tasks.length,
      selectedProject: this.currentProject
        ? store.data.projects.find((project) => project.id === this.currentProject) || null
        : null
    };
  }

  getTasksByStatusFilter(filter) {
    if (filter === 'in_progress') {
      return store.data.tasks.filter((task) => task.status === 'in_progress');
    }
    if (filter === 'paused') {
      return store.data.tasks.filter((task) => task.status === 'paused');
    }
    if (filter === 'completed') {
      return store.data.tasks.filter((task) => task.status === 'completed');
    }
    return [...store.data.tasks];
  }

  getProjectTaskStats(tasks) {
    return tasks.reduce((stats, task) => {
      if (!stats[task.projectId]) {
        stats[task.projectId] = { total: 0, completed: 0 };
      }

      stats[task.projectId].total += 1;
      if (task.status === 'completed') {
        stats[task.projectId].completed += 1;
      }
      return stats;
    }, {});
  }

  getWeekStartDate(year, week) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const startWeek = simple;
    if (dow <= 4) {
      startWeek.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      startWeek.setDate(simple.getDate() + 8 - simple.getDay());
    }
    return startWeek;
  }

  bindFilterEvents() {
    Utils.$$('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.boardFilter = btn.dataset.filter;
        this.renderBoard();
      });
    });
  }

  renderProjectItem(project, stats = { total: 0, completed: 0 }) {
    const isActive = this.currentProject === project.id ? 'active' : '';
    const statusLabels = {
      in_progress: '进行中',
      paused: '暂停',
      completed: '已结项'
    };
    const statusClass = {
      in_progress: 'status-in_progress',
      paused: 'status-paused',
      completed: 'status-completed'
    };
    const projectStatus = project.status || 'in_progress';
    
    return `
      <div class="project-item ${isActive}" data-id="${project.id}">
        <div class="project-item-header">
          <div class="project-name">${Utils.escapeHtml(project.name)}</div>
          <span class="project-status-dot ${statusClass[projectStatus]}" title="${statusLabels[projectStatus]}"></span>
        </div>
        <div class="project-meta">${stats.completed}/${stats.total} 任务</div>
      </div>
    `;
  }

  renderGantt(tasks, members, projects) {
    const tasksByAssignee = {};
    tasks.forEach(task => {
      const assigneeId = task.assignee || 'unassigned';
      if (!tasksByAssignee[assigneeId]) {
        tasksByAssignee[assigneeId] = [];
      }
      tasksByAssignee[assigneeId].push(task);
    });
    
    const projectMap = new Map(projects.map(p => [p.id, p]));
    let html = '<div class="gantt">';
    
    Object.entries(tasksByAssignee).forEach(([assigneeId, memberTasks]) => {
      const member = members.find(m => m.id === assigneeId);
      const memberName = member ? member.name : '未分配';
      const memberColor = member ? member.color : '#6B7280';
      
      html += `
        <div class="gantt-row">
          <div class="gantt-member">
            <span class="member-avatar" style="background: ${memberColor}">${memberName[0]}</span>
            <span>${Utils.escapeHtml(memberName)}</span>
          </div>
          <div class="gantt-tasks">
            ${memberTasks.map(task => {
              const project = projectMap.get(task.projectId);
              return this.renderGanttTask(task, project);
            }).join('')}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }

  renderGanttTask(task, project) {
    const progress = task.progress || 0;
    const statusClass = Utils.getStatusClass(task.status);
    const progressClass = this.getProgressClass(progress);
    const progressColor = this.getProgressColor(progress);
    
    const priorityLabels = { low: '低', medium: '中', high: '高' };
    const priorityIcons = { 
      low: Utils.icon('arrowDown'), 
      medium: Utils.icon('minus'), 
      high: Utils.icon('arrowUp') 
    };
    const priority = task.priority || 'medium';
    
    return `
      <div class="gantt-task ${statusClass}" data-id="${task.id}">
        <div class="task-info">
          <span class="task-project">${project ? Utils.escapeHtml(project.name) : '未指定项目'}</span>
          <span class="task-priority" title="优先级: ${priorityLabels[priority]}">${priorityIcons[priority]}</span>
          <span class="task-name">${Utils.escapeHtml(task.name)}</span>
        </div>
        <div class="task-bar">
          <div class="task-progress ${progressClass}" style="width: ${progress}%; background: ${progressColor};"></div>
        </div>
        <span class="task-status">${progress}% ${Utils.getStatusText(task.status)}</span>
      </div>
    `;
  }

  bindBoardEvents() {
    Utils.$$('.project-item').forEach(item => {
      item.addEventListener('click', () => {
        this.currentProject = item.dataset.id || null;
        this.renderBoard();
      });
    });

    Utils.$$('.gantt-task').forEach((taskEl) => {
      taskEl.addEventListener('click', () => {
        this.showTaskModal(taskEl.dataset.id);
      });
    });
  }

  getProgressClass(progress) {
    if (progress >= 100) return 'progress-complete';
    if (progress >= 76) return 'progress-high';
    if (progress >= 51) return 'progress-medium';
    if (progress >= 26) return 'progress-low';
    return 'progress-none';
  }

  getProgressColor(progress) {
    if (progress >= 100) return '#10B981';
    if (progress >= 76) return '#14B8A6';
    if (progress >= 51) return '#3B82F6';
    if (progress >= 26) return '#F97316';
    return '#EF4444';
  }

  renderManagement() {
    const container = Utils.$('#managementView');
    const allProjects = store.data.projects;
    const allMembers = store.data.members;
    
    container.innerHTML = `
      <div class="management-page">
        <div class="management-section">
          <div class="page-header">
            <h2>${Utils.icon('folder')} 项目管理</h2>
            <button class="btn btn-primary" id="newProjectBtn">${Utils.icon('plus')} 新建项目</button>
          </div>
          ${allProjects.length === 0 ? '<p class="empty">暂无项目</p>' : ''}
          <div class="project-cards">
            ${allProjects.map(p => this.renderProjectCard(p)).join('')}
          </div>
        </div>
        
        <div class="management-section">
          <div class="page-header">
            <h2>${Utils.icon('user')} 人员管理</h2>
            <button class="btn btn-primary" id="newMemberBtn">${Utils.icon('plus')} 添加成员</button>
          </div>
          ${allMembers.length === 0 ? '<p class="empty">暂无成员</p>' : ''}
          <div class="member-cards">
            ${allMembers.map(m => this.renderMemberCard(m)).join('')}
          </div>
        </div>
      </div>
    `;
    
    Utils.$('#newProjectBtn')?.addEventListener('click', () => this.showProjectModal());
    Utils.$('#newMemberBtn')?.addEventListener('click', () => this.showMemberModal());
    
    Utils.$$('.project-card').forEach(card => {
      card.querySelector('.view-btn')?.addEventListener('click', () => {
        this.showProjectDetail(card.dataset.id);
      });
    });
    
    Utils.$$('.member-card').forEach(card => {
      card.querySelector('.edit-btn')?.addEventListener('click', () => {
        const member = store.data.members.find(m => m.id === card.dataset.id);
        this.showMemberModal(member);
      });
      card.querySelector('.delete-btn')?.addEventListener('click', async () => {
        if (await Utils.confirm('确定要删除此成员吗？')) {
          store.deleteMember(card.dataset.id);
          this.render();
        }
      });
    });
  }

  renderMemberCard(member) {
    const weekTasks = store.getTasksByWeek(store.data.currentWeek, store.data.currentYear);
    const memberTasks = weekTasks.filter(t => t.assignee === member.id);
    const completed = memberTasks.filter(t => t.status === 'completed').length;
    
    return `
      <div class="member-card" data-id="${member.id}">
        <div class="member-avatar large" style="background:${member.color}">${member.name[0]}</div>
        <h3>${Utils.escapeHtml(member.name)}</h3>
        <span class="role-badge">${Utils.escapeHtml(member.role || '成员')}</span>
        <p>本周任务: ${completed}/${memberTasks.length} 完成</p>
        <div class="member-actions">
          <button class="btn btn-secondary btn-sm edit-btn">编辑</button>
          <button class="btn btn-danger btn-sm delete-btn">删除</button>
        </div>
      </div>
    `;
  }

  renderProjectCard(project) {
    const tasks = store.getTasksByProject(project.id);
    const members = store.getProjectMembers(project.id);
    const completed = tasks.filter(t => t.status === 'completed').length;
    const statusLabels = {
      in_progress: '进行中',
      paused: '暂停',
      completed: '已结项'
    };
    const statusClass = {
      in_progress: 'status-in_progress',
      paused: 'status-paused',
      completed: 'status-completed'
    };
    const projectStatus = project.status || 'in_progress';
    
    return `
      <div class="project-card" data-id="${project.id}">
        <div class="project-card-header">
          <h3>${Utils.escapeHtml(project.name)}</h3>
          <span class="project-status-badge ${statusClass[projectStatus]}">${statusLabels[projectStatus]}</span>
        </div>
        <p>${Utils.escapeHtml(project.description) || '暂无描述'}</p>
        <div class="project-card-meta">
          <span>${Utils.icon('document')} ${completed}/${tasks.length} 任务</span>
          <span>${Utils.icon('user')} ${members.length} 位负责人</span>
        </div>
        <div class="project-members">
          ${members.map(m => `<span class="member-chip" style="background:${m.color}">${m.name[0]}</span>`).join('')}
        </div>
        <button class="btn btn-secondary view-btn">查看详情</button>
      </div>
    `;
  }

  showProjectDetail(projectId) {
    const project = store.getProject(projectId);
    if (!project) return;
    
    const tasks = store.getTasksByProject(projectId);
    const members = store.getProjectMembers(projectId);
    const statusLabels = {
      in_progress: '进行中',
      paused: '暂停',
      completed: '已结项'
    };
    const statusClass = {
      in_progress: 'status-in_progress',
      paused: 'status-paused',
      completed: 'status-completed'
    };
    let currentStatus = project.status || 'in_progress';
    const isCompletedProject = currentStatus === 'completed';
    const canAddTasks = !isCompletedProject;
    
    const modalContent = Utils.createElement('div', { class: 'project-detail-modal' });
    modalContent.innerHTML = `
      <div class="modal-header">
        <h2>${Utils.escapeHtml(project.name)}</h2>
        <button class="btn btn-icon close-btn">${Utils.icon('close')}</button>
      </div>
      <p>${Utils.escapeHtml(project.description) || '暂无描述'}</p>
      
      <div class="project-detail-section">
        <h3>${Utils.icon('chart')} 项目状态</h3>
        <select name="status" class="project-status-select" id="projectStatusSelect">
          <option value="in_progress" ${currentStatus === 'in_progress' ? 'selected' : ''}>进行中</option>
          <option value="paused" ${currentStatus === 'paused' ? 'selected' : ''}>暂停</option>
          <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>已结项</option>
        </select>
      </div>
      
      <div class="project-detail-section">
        <h3>${Utils.icon('user')} 参与人员</h3>
        <p class="section-hint">根据当前项目任务的负责人自动汇总，无需单独维护。</p>
        <div class="member-list">
          ${members.length === 0 ? '<p class="empty-inline">暂无负责人，给项目任务分配成员后会自动显示。</p>' : members.map(m => `
            <div class="member-item">
              <span class="member-avatar" style="background:${m.color}">${m.name[0]}</span>
              <span>${Utils.escapeHtml(m.name)}</span>
              <span class="role">${Utils.escapeHtml(m.role || '成员')}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="project-detail-section">
        <h3>${Utils.icon('document')} 任务列表</h3>
        <button class="btn btn-primary btn-sm" id="addTaskToProject" ${canAddTasks ? '' : 'disabled'}>
          ${canAddTasks ? '+ 添加任务' : '已结项项目不可新增任务'}
        </button>
        <p class="section-hint" id="projectTaskHint" style="${canAddTasks ? 'display:none;' : ''}">
          如需补充任务，请先将项目状态调整为未开始、进行中或暂停。
        </p>
        <div class="task-list">
          ${tasks.length === 0 ? '<p>暂无任务</p>' : tasks.map(t => this.renderTaskItem(t)).join('')}
        </div>
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-danger" id="deleteProject">${Utils.icon('trash')} 删除项目</button>
      </div>
    `;
    
    const overlay = Utils.showModal(modalContent);
    const addTaskButton = modalContent.querySelector('#addTaskToProject');
    const projectTaskHint = modalContent.querySelector('#projectTaskHint');

    const syncTaskControls = (status) => {
      const canCreateTask = status !== 'completed';
      addTaskButton.disabled = !canCreateTask;
      addTaskButton.textContent = canCreateTask
        ? '+ 添加任务'
        : '已结项项目不可新增任务';
      projectTaskHint.style.display = canCreateTask ? 'none' : 'block';
    };
    
    modalContent.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
    
    modalContent.querySelector('#projectStatusSelect').addEventListener('change', (e) => {
      const nextStatus = e.target.value;
      const success = store.updateProject(projectId, { status: nextStatus });
      if (!success) {
        alert('项目还有未完成任务，不能直接结项。');
        e.target.value = currentStatus;
        return;
      }
      currentStatus = nextStatus;
      syncTaskControls(currentStatus);
      this.render();
    });
    
    modalContent.querySelector('#addTaskToProject')?.addEventListener('click', () => {
      overlay.remove();
      this.showTaskModal(null, projectId);
    });
    
    modalContent.querySelector('#deleteProject')?.addEventListener('click', async () => {
      if (await Utils.confirm('确定要删除此项目吗？')) {
        store.deleteProject(projectId);
        overlay.remove();
        this.render();
      }
    });
    
    modalContent.querySelectorAll('.task-item').forEach(item => {
      item.addEventListener('click', () => {
        overlay.remove();
        this.showTaskModal(item.dataset.id, projectId);
      });
    });
  }

  showTaskDetail(taskId) {
    const task = store.data.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const project = store.data.projects.find(p => p.id === task.projectId);
    const member = store.data.members.find(m => m.id === task.assignee);
    const priorityLabels = { low: '低', medium: '中', high: '高' };
    const priorityIcons = { 
      low: Utils.icon('arrowDown'), 
      medium: Utils.icon('minus'), 
      high: Utils.icon('arrowUp') 
    };
    
    const modalContent = Utils.createElement('div', { class: 'form-modal' });
    modalContent.innerHTML = `
      <h2>${Utils.icon('document')} 任务详情</h2>
      <div class="task-detail-view">
        <div class="detail-row">
          <label>任务名称</label>
          <span>${Utils.escapeHtml(task.name)}</span>
        </div>
        <div class="detail-row">
          <label>所属项目</label>
          <span>${project ? Utils.escapeHtml(project.name) : '未指定'}</span>
        </div>
        <div class="detail-row">
          <label>负责人</label>
          <span>${member ? Utils.escapeHtml(member.name) : '未分配'}</span>
        </div>
        <div class="detail-row">
          <label>优先级</label>
          <span>${priorityIcons[task.priority || 'medium']} ${priorityLabels[task.priority || 'medium']}</span>
        </div>
        <div class="detail-row">
          <label>状态</label>
          <span class="status-badge ${Utils.getStatusClass(task.status)}">${Utils.getStatusText(task.status)}</span>
        </div>
        <div class="detail-row">
          <label>进度</label>
          <span>${task.progress || 0}%</span>
        </div>
        <div class="detail-row">
          <label>描述</label>
          <span>${Utils.escapeHtml(task.description) || '暂无描述'}</span>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary cancel-btn">关闭</button>
      </div>
    `;
    
    const overlay = Utils.showModal(modalContent);
    
    modalContent.querySelector('.cancel-btn').addEventListener('click', () => overlay.remove());
  }

  renderTaskItem(task) {
    const member = store.data.members.find(m => m.id === task.assignee);
    const statusClass = Utils.getStatusClass(task.status);
    const progress = task.progress || 0;
    const progressColor = this.getProgressColor(progress);
    
    return `
      <div class="task-item ${statusClass}" data-id="${task.id}">
        <span class="task-item-name">${Utils.escapeHtml(task.name)}</span>
        <span class="task-item-progress" style="color: ${progressColor}">${progress}%</span>
        <span class="task-item-assignee">${member ? member.name : '未分配'}</span>
        <span class="task-item-status">${Utils.getStatusText(task.status)}</span>
      </div>
    `;
  }

  showProjectModal(project = null) {
    const isEdit = !!project;
    const currentStatus = project?.status || 'in_progress';
    const modalContent = Utils.createElement('div', { class: 'form-modal' });
    modalContent.innerHTML = `
      <h2>${isEdit ? '编辑项目' : '新建项目'}</h2>
      <form id="projectForm">
        <div class="form-group">
          <label>项目名称（芯片型号）</label>
          <input type="text" name="name" required value="${project ? Utils.escapeHtml(project.name) : ''}" placeholder="例如: A1芯片测试">
        </div>
        <div class="form-group">
          <label>状态</label>
          <select name="status">
            <option value="in_progress" ${currentStatus === 'in_progress' ? 'selected' : ''}>进行中</option>
            <option value="paused" ${currentStatus === 'paused' ? 'selected' : ''}>暂停</option>
            <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>已结项</option>
          </select>
        </div>
        <div class="form-group">
          <label>描述</label>
          <textarea name="description" placeholder="项目描述">${project ? Utils.escapeHtml(project.description) : ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary cancel-btn">取消</button>
          <button type="submit" class="btn btn-primary">${isEdit ? '保存' : '创建'}</button>
        </div>
      </form>
    `;
    
    const overlay = Utils.showModal(modalContent);
    
    modalContent.querySelector('.cancel-btn').addEventListener('click', () => overlay.remove());
    modalContent.querySelector('#projectForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const name = String(formData.get('name') || '').trim();
      if (!name) {
        alert('请输入项目名称');
        return;
      }
      const data = {
        name,
        status: formData.get('status'),
        description: String(formData.get('description') || '').trim()
      };

      let success = true;
      if (isEdit) {
        success = store.updateProject(project.id, data);
      } else {
        success = !!store.addProject(data);
      }

      if (!success) {
        alert('项目还有未完成任务，不能直接结项。');
        return;
      }
      
      overlay.remove();
      this.render();
    });
  }

  showTaskModal(taskId = null, projectId = null) {
    const task = taskId ? store.data.tasks.find(t => t.id === taskId) : null;
    const isEdit = !!task;
    const currentWeekKey = store.getWeekKey(store.data.currentWeek, store.data.currentYear);
    const selectedProjectId = projectId || task?.projectId || '';
    const weekProjects = store.data.projects.filter(p => (
      p.weekKey === currentWeekKey || p.id === selectedProjectId
    ));
    const availableProjects = weekProjects.filter((project) => (
      project.status !== 'completed' || project.id === selectedProjectId
    ));
    const selectedProject = store.getProject(selectedProjectId);
    const isLockedCompletedProject = isEdit && selectedProject?.status === 'completed';
    const hasProjectOptions = availableProjects.length > 0;
    const members = store.data.members;
    const currentProgress = task?.progress || 0;
    const progressColor = this.getProgressColor(currentProgress);
    
    const modalContent = Utils.createElement('div', { class: 'form-modal' });
    modalContent.innerHTML = `
      <h2>${isEdit ? '编辑任务' : '新建任务'}</h2>
      <form id="taskForm">
        ${isLockedCompletedProject
          ? '<p class="section-hint">当前项目已结项，只允许修改说明性信息，不能再调整所属项目、进度或状态。</p>'
          : ''}
        <div class="form-group">
          <label>任务名称</label>
          <input type="text" name="name" required value="${task ? Utils.escapeHtml(task.name) : ''}" placeholder="任务描述">
        </div>
        <div class="form-group">
          <label>所属项目</label>
          <select name="projectId" required ${!hasProjectOptions || isLockedCompletedProject ? 'disabled' : ''}>
            ${hasProjectOptions ? availableProjects.map(p => `
              <option value="${p.id}" ${(projectId || task?.projectId) === p.id ? 'selected' : ''}>
                ${Utils.escapeHtml(p.name)}
              </option>
            `).join('') : '<option value="">当前周没有可用项目</option>'}
          </select>
        </div>
        <div class="form-group">
          <label>负责人</label>
          <select name="assignee">
            <option value="">未分配</option>
            ${members.map(m => `
              <option value="${m.id}" ${task?.assignee === m.id ? 'selected' : ''}>
                ${Utils.escapeHtml(m.name)}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>进度: <span id="progressValue" style="color: ${progressColor}">${currentProgress}%</span></label>
          <div class="progress-slider-container">
            <input type="range" name="progress" min="0" max="100" value="${currentProgress}" class="progress-slider" id="progressSlider" ${isLockedCompletedProject ? 'disabled' : ''}>
          </div>
        </div>
        <div class="form-group">
          <label>优先级</label>
          <select name="priority">
            <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>低</option>
            <option value="medium" ${!task || task.priority === 'medium' ? 'selected' : ''}>中</option>
            <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>高</option>
          </select>
        </div>
        <div class="form-group">
          <label>状态</label>
          <select name="status" ${isLockedCompletedProject ? 'disabled' : ''}>
            <option value="in_progress" ${!task || task.status === 'in_progress' ? 'selected' : ''}>进行中</option>
            <option value="paused" ${task?.status === 'paused' ? 'selected' : ''}>暂停</option>
            <option value="completed" ${task?.status === 'completed' ? 'selected' : ''}>已完成</option>
          </select>
        </div>
        <div class="form-group">
          <label>描述</label>
          <textarea name="description" placeholder="详细描述">${task ? Utils.escapeHtml(task.description) : ''}</textarea>
        </div>
        <div class="form-actions">
          ${isEdit ? '<button type="button" class="btn btn-danger delete-btn">删除</button>' : ''}
          <button type="button" class="btn btn-secondary cancel-btn">取消</button>
          <button type="submit" class="btn btn-primary" ${!hasProjectOptions && !isEdit ? 'disabled' : ''}>${isEdit ? '保存' : '创建'}</button>
        </div>
      </form>
    `;
    
    const overlay = Utils.showModal(modalContent);
    
    const progressSlider = modalContent.querySelector('#progressSlider');
    const progressValue = modalContent.querySelector('#progressValue');
    progressSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      progressValue.textContent = value + '%';
      progressValue.style.color = this.getProgressColor(value);
    });
    
    modalContent.querySelector('.cancel-btn').addEventListener('click', () => overlay.remove());
    
    if (isEdit) {
      modalContent.querySelector('.delete-btn').addEventListener('click', async () => {
        if (await Utils.confirm('确定要删除此任务吗？')) {
          store.deleteTask(taskId);
          overlay.remove();
          this.render();
        }
      });
    }
    
    modalContent.querySelector('#taskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const name = String(formData.get('name') || '').trim();
      const submittedProjectId = isLockedCompletedProject
        ? task.projectId
        : formData.get('projectId');
      const data = {
        name,
        projectId: submittedProjectId,
        assignee: formData.get('assignee') || null,
        priority: formData.get('priority'),
        status: isLockedCompletedProject ? task.status : formData.get('status'),
        progress: isLockedCompletedProject
          ? task.progress
          : parseInt(formData.get('progress'), 10) || 0,
        description: String(formData.get('description') || '').trim()
      };

      if (!name) {
        alert('请输入任务名称');
        return;
      }

      if (!data.projectId) {
        alert('请选择所属项目');
        return;
      }

      let success = false;
      if (isEdit) {
        success = store.updateTask(taskId, data);
      } else {
        success = !!store.addTask(data);
      }

      if (!success) {
        alert('已结项项目不能新增任务或接收未结项任务。');
        return;
      }
      
      overlay.remove();
      if (projectId) {
        this.showProjectDetail(data.projectId);
      } else {
        this.render();
      }
    });
  }

  showMemberModal(member = null) {
    const isEdit = !!member;
    const modalContent = Utils.createElement('div', { class: 'form-modal' });
    modalContent.innerHTML = `
      <h2>${isEdit ? '编辑成员' : '添加成员'}</h2>
      <form id="memberForm">
        <div class="form-group">
          <label>姓名</label>
          <input type="text" name="name" required value="${member ? Utils.escapeHtml(member.name) : ''}" placeholder="成员姓名">
        </div>
        <div class="form-group">
          <label>角色</label>
          <input type="text" name="role" value="${member ? Utils.escapeHtml(member.role || '成员') : '成员'}" placeholder="例如：测试工程师">
        </div>
        <div class="form-group">
          <label>颜色</label>
          <input type="color" name="color" value="${member ? member.color : '#3B82F6'}">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary cancel-btn">取消</button>
          <button type="submit" class="btn btn-primary">${isEdit ? '保存' : '添加'}</button>
        </div>
      </form>
    `;
    
    const overlay = Utils.showModal(modalContent);
    
    modalContent.querySelector('.cancel-btn').addEventListener('click', () => overlay.remove());
    modalContent.querySelector('#memberForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const name = String(formData.get('name') || '').trim();
      if (!name) {
        alert('请输入成员姓名');
        return;
      }
      const data = {
        name,
        role: String(formData.get('role') || '').trim() || '成员',
        color: formData.get('color')
      };
      
      if (isEdit) {
        store.updateMember(member.id, data);
      } else {
        store.addMember(data);
      }
      
      overlay.remove();
      this.render();
    });
  }

  renderMeeting() {
    const container = Utils.$('#meetingView');
    const week = this.meetingWeek || store.data.currentWeek;
    const year = this.meetingYear || store.data.currentYear;
    
    this.meetingWeek = week;
    this.meetingYear = year;
    
    const meeting = store.getMeeting(week, year);
    const members = store.data.members;
    const tasksByAssignee = store.getTasksByAssignee(week, year);
    const weekRange = Utils.getWeekRange(week, year);
    const meetingsList = store.getMeetingsList();
    
    const attendeeList = members.map(m => `
      <span class="attendee-item" title="${Utils.escapeHtml(m.name)}">
        <span class="member-avatar" style="background:${m.color}">${m.name[0]}</span>
      </span>
    `).join('');
    
    let tasksHtml = '';
    Object.entries(tasksByAssignee).forEach(([assigneeId, tasks]) => {
      const member = members.find(m => m.id === assigneeId);
      const memberName = member ? member.name : '未分配';
      const memberColor = member ? member.color : '#6B7280';
      
      const priorityLabels = { low: '低', medium: '中', high: '高' };
      const priorityIcons = { 
        low: Utils.icon('arrowDown'), 
        medium: Utils.icon('minus'), 
        high: Utils.icon('arrowUp') 
      };
      
      const taskItems = tasks.map(task => {
        const project = store.data.projects.find(p => p.id === task.projectId);
        const projectName = project ? project.name : '未指定项目';
        const taskReport = meeting?.taskReports?.[task.id] || {};
        const priority = task.priority || 'medium';
        
        return `
          <div class="meeting-task-item" data-task-id="${task.id}" data-assignee-id="${task.assigneeId || ''}">
            <div class="task-item-header">
              <span class="task-project">${Utils.escapeHtml(projectName)}</span>
              <span class="task-sep">|</span>
              <span class="task-name">${Utils.escapeHtml(task.name)}</span>
              <span class="task-sep">|</span>
              <span class="task-priority" title="优先级: ${priorityLabels[priority]}">${priorityIcons[priority]} ${priorityLabels[priority]}</span>
              <button class="btn btn-icon btn-danger btn-small remove-task-btn" title="删除记录">${Utils.icon('trash')}</button>
            </div>
            <div class="task-progress-slider">
              <label>进度: <span class="progress-value">${task.progress || 0}</span>%</label>
              <input type="range" class="task-progress-input" min="0" max="100" value="${task.progress || 0}">
            </div>
            <div class="task-report-fields">
              <div class="report-field">
                <label>${Utils.icon('check')} 本周工作</label>
                <textarea class="task-work" placeholder="本周完成了什么工作...">${Utils.escapeHtml(taskReport.work || '')}</textarea>
              </div>
              <div class="report-field">
                <label>${Utils.icon('alertCircle')} 遇到问题</label>
                <textarea class="task-issues" placeholder="遇到什么困难或问题...">${Utils.escapeHtml(taskReport.issues || '')}</textarea>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      tasksHtml += `
        <div class="meeting-member-group" data-assignee-id="${assigneeId}">
          <div class="meeting-member-header">
            <span class="member-avatar" style="background:${memberColor}">${memberName[0]}</span>
            <span class="member-name">${Utils.escapeHtml(memberName)}</span>
            <button class="btn btn-small btn-outline add-task-btn" data-assignee-id="${assigneeId}" data-member-name="${Utils.escapeHtml(memberName)}">${Utils.icon('plus')} 添加任务</button>
          </div>
          <div class="meeting-tasks">
            ${taskItems}
          </div>
        </div>
      `;
    });
    
    if (Object.keys(tasksByAssignee).length === 0) {
      tasksHtml = '<p class="empty">本周暂无未完成任务</p>';
    }
    
    const historyItems = meetingsList.slice(0, 10).map(m => `
      <div class="history-item ${m.weekKey === store.getWeekKey(week, year) ? 'active' : ''}" data-week="${m.week}" data-year="${m.year}">
        <span class="history-week">${m.year}年第${m.week}周</span>
        <span class="history-date">${m.date}</span>
      </div>
    `).join('');
    
    container.innerHTML = `
      <div class="meeting-page">
        <div class="meeting-sidebar">
          <h3>${Utils.icon('document')} 历史会议</h3>
          <div class="meeting-history-list">
            ${historyItems || '<p class="empty">暂无历史会议</p>'}
          </div>
        </div>
        
        <div class="meeting-main">
          <div class="page-header">
            <div class="week-nav">
              <button class="btn btn-icon" id="prevMeetingWeek">${Utils.icon('chevronLeft')}</button>
              <span class="current-week" id="meetingWeekDisplay">第${week}周 (${weekRange})</span>
              <button class="btn btn-icon" id="nextMeetingWeek">${Utils.icon('chevronRight')}</button>
            </div>
            <div class="meeting-actions">
              <button class="btn btn-secondary" id="generateReportBtn">${Utils.icon('chart')} 生成报告</button>
              <button class="btn btn-primary" id="saveMeetingBtn">${Utils.icon('check')} 保存会议</button>
            </div>
          </div>
          
          <div class="meeting-form">
            <div class="form-group">
              <label>会议日期</label>
              <input type="date" id="meetingDate" value="${meeting?.date || new Date().toISOString().split('T')[0]}">
            </div>
            
            <div class="form-group">
              <label>参会人员</label>
              <div class="attendees-list">
                ${attendeeList}
              </div>
            </div>
            
            <div class="form-group">
              <label>会议备注</label>
              <textarea id="meetingNotes" placeholder="会议讨论内容、决策事项等...">${meeting?.notes || ''}</textarea>
            </div>
          </div>
          
          <div class="meeting-tasks-section">
            <h3>${Utils.icon('document')} 任务进展记录 (${Object.values(tasksByAssignee).flat().length}项)</h3>
            <p class="meeting-hint">为每个任务记录：本周工作内容、遇到的问题</p>
            <div class="meeting-tasks-list">
              ${tasksHtml}
            </div>
          </div>
        </div>
      </div>
      
      <div id="taskSelectModal" class="task-select-modal hidden">
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>选择任务 - <span id="modalMemberName"></span></h3>
            <button class="btn btn-icon modal-close" id="closeTaskModal">${Utils.icon('x')}</button>
          </div>
          <div class="modal-body">
            <div id="taskSelectList" class="task-select-list"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="cancelTaskModal">取消</button>
            <button class="btn btn-primary" id="confirmTaskModal">添加选中任务</button>
          </div>
        </div>
      </div>
    `;
    
    Utils.$('#saveMeetingBtn')?.addEventListener('click', () => {
      const date = Utils.$('#meetingDate').value;
      const notes = Utils.$('#meetingNotes').value;
      
      const attendees = [];
      
      Utils.$$('.meeting-task-item').forEach(taskEl => {
        const taskId = taskEl.dataset.taskId;
        const assigneeId = taskEl.dataset.assigneeId;
        const work = taskEl.querySelector('.task-work')?.value || '';
        const issues = taskEl.querySelector('.task-issues')?.value || '';
        const progress = parseInt(taskEl.querySelector('.task-progress-input')?.value || '0', 10);

        store.updateTaskReport(week, year, taskId, { work, issues });
        
        if (assigneeId && (work || issues)) {
          if (!attendees.includes(assigneeId)) {
            attendees.push(assigneeId);
          }
        }
        
        store.updateTask(taskId, { progress });
      });
      
      store.saveMeeting(week, year, { date, notes, attendees });
      
      alert('会议记录已保存！');
      this.renderMeeting();
    });
    
    Utils.$('#generateReportBtn')?.addEventListener('click', () => {
      this.showMeetingReport(week, year);
    });
    
    let currentAddTaskMemberId = null;
    const existingTaskIds = new Set(Object.values(tasksByAssignee).flat().map(t => t.id));
    
    Utils.$$('.add-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentAddTaskMemberId = btn.dataset.assigneeId;
        const memberName = btn.dataset.memberName;
        
        const allTasks = store.getUnfinishedTasksByMember(currentAddTaskMemberId);
        const availableTasks = allTasks.filter(t => !existingTaskIds.has(t.id));
        
        const modal = Utils.$('#taskSelectModal');
        const taskList = Utils.$('#taskSelectList');
        Utils.$('#modalMemberName').textContent = memberName;
        
        if (availableTasks.length === 0) {
          taskList.innerHTML = '<p class="empty">该成员没有未完成的任务</p>';
        } else {
          taskList.innerHTML = availableTasks.map(task => {
            const project = store.data.projects.find(p => p.id === task.projectId);
            const projectName = project ? project.name : '未指定项目';
            return `
              <label class="task-select-item">
                <input type="checkbox" value="${task.id}">
                <span class="task-select-name">${Utils.escapeHtml(task.name)}</span>
                <span class="task-select-project">${Utils.escapeHtml(projectName)}</span>
                <span class="task-select-progress" style="color: ${this.getProgressColor(task.progress || 0)}">${task.progress || 0}%</span>
              </label>
            `;
          }).join('');
        }
        
        modal.classList.remove('hidden');
      });
    });
    
    Utils.$('#closeTaskModal')?.addEventListener('click', () => {
      Utils.$('#taskSelectModal').classList.add('hidden');
    });
    
    Utils.$('#cancelTaskModal')?.addEventListener('click', () => {
      Utils.$('#taskSelectModal').classList.add('hidden');
    });
    
    Utils.$('.modal-backdrop')?.addEventListener('click', () => {
      Utils.$('#taskSelectModal').classList.add('hidden');
    });
    
    Utils.$('#confirmTaskModal')?.addEventListener('click', () => {
      const selectedCheckboxes = Utils.$$('#taskSelectList input[type="checkbox"]:checked');
      const selectedTaskIds = Array.from(selectedCheckboxes).map(cb => cb.value);
      
      if (selectedTaskIds.length > 0) {
        const memberGroup = Utils.$(`.meeting-member-group[data-assignee-id="${currentAddTaskMemberId}"]`);
        const tasksContainer = memberGroup?.querySelector('.meeting-tasks');
        
        const priorityLabels = { low: '低', medium: '中', high: '高' };
        const priorityIcons = { 
          low: Utils.icon('arrowDown'), 
          medium: Utils.icon('minus'), 
          high: Utils.icon('arrowUp') 
        };
        
        selectedTaskIds.forEach(taskId => {
          const task = store.data.tasks.find(t => t.id === taskId);
          if (!task) return;
          
          const project = store.data.projects.find(p => p.id === task.projectId);
          const projectName = project ? project.name : '未指定项目';
          const meeting = store.getMeeting(week, year);
          const taskReport = meeting?.taskReports?.[task.id] || {};
          const priority = task.priority || 'medium';
          
          const taskHtml = `
            <div class="meeting-task-item" data-task-id="${task.id}" data-assignee-id="${task.assignee || ''}">
              <div class="task-item-header">
                <span class="task-project">${Utils.escapeHtml(projectName)}</span>
                <span class="task-sep">|</span>
                <span class="task-name">${Utils.escapeHtml(task.name)}</span>
                <span class="task-sep">|</span>
                <span class="task-priority" title="优先级: ${priorityLabels[priority]}">${priorityIcons[priority]} ${priorityLabels[priority]}</span>
                <button class="btn btn-icon btn-danger btn-small remove-task-btn" title="删除记录">${Utils.icon('trash')}</button>
              </div>
              <div class="task-progress-slider">
                <label>进度: <span class="progress-value">${task.progress || 0}</span>%</label>
                <input type="range" class="task-progress-input" min="0" max="100" value="${task.progress || 0}">
              </div>
              <div class="task-report-fields">
                <div class="report-field">
                  <label>${Utils.icon('check')} 本周工作</label>
                  <textarea class="task-work" placeholder="本周完成了什么工作...">${Utils.escapeHtml(taskReport.work || '')}</textarea>
                </div>
                <div class="report-field">
                  <label>${Utils.icon('alertCircle')} 遇到问题</label>
                  <textarea class="task-issues" placeholder="遇到什么困难或问题...">${Utils.escapeHtml(taskReport.issues || '')}</textarea>
                </div>
              </div>
            </div>
          `;
          
          tasksContainer.insertAdjacentHTML('beforeend', taskHtml);
        });
        
        Utils.$('#taskSelectModal').classList.add('hidden');
        
        Utils.$$('.meeting-tasks .meeting-task-item:last-child .task-progress-input').forEach(slider => {
          slider.addEventListener('input', (e) => {
            const valueSpan = e.target.closest('.task-progress-slider').querySelector('.progress-value');
            valueSpan.textContent = e.target.value;
          });
        });
      } else {
        Utils.$('#taskSelectModal').classList.add('hidden');
      }
    });
    
    Utils.$$('.task-progress-input').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const valueSpan = e.target.closest('.task-progress-slider').querySelector('.progress-value');
        valueSpan.textContent = e.target.value;
      });
    });
    
    Utils.$$('.remove-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskItem = btn.closest('.meeting-task-item');
        const taskId = taskItem.dataset.taskId;
        const taskName = taskItem.querySelector('.task-name')?.textContent || '该任务';
        
        if (confirm(`确定要从会议记录中删除"${taskName}"吗？\n（不会删除任务本身，只删除会议中的进展记录）`)) {
          taskItem.remove();
        }
      });
    });
    
    Utils.$('#prevMeetingWeek')?.addEventListener('click', () => {
      let w = this.meetingWeek;
      let y = this.meetingYear;
      w--;
      if (w < 1) {
        y--;
        w = Utils.getWeeksInYear(y);
      }
      this.meetingWeek = w;
      this.meetingYear = y;
      this.renderMeeting();
    });
    
    Utils.$('#nextMeetingWeek')?.addEventListener('click', () => {
      let w = this.meetingWeek;
      let y = this.meetingYear;
      w++;
      if (w > Utils.getWeeksInYear(y)) {
        w = 1;
        y++;
      }
      this.meetingWeek = w;
      this.meetingYear = y;
      this.renderMeeting();
    });
    
    Utils.$$('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        this.meetingWeek = parseInt(item.dataset.week);
        this.meetingYear = parseInt(item.dataset.year);
        this.renderMeeting();
      });
    });
  }

  showMeetingReport(week, year) {
    const meeting = store.getMeeting(week, year);
    const members = store.data.members;
    const tasksByAssignee = store.getTasksByAssignee(week, year);
    const weekRange = Utils.getWeekRange(week, year);
    
    if (!meeting) {
      alert('请先保存会议记录');
      return;
    }
    
    const attendeeNames = meeting.attendees?.map(id => {
      const m = members.find(m => m.id === id);
      return m ? m.name : null;
    }).filter(Boolean).join('、') || '无';
    
    let reportContent = `# 芯片测试组 周会报告\n`;
    reportContent += `**${year}年第${week}周** (${weekRange})\n\n`;
    
    reportContent += `## 会议信息\n`;
    reportContent += `- **日期**: ${meeting.date}\n`;
    reportContent += `- **参会人员**: ${attendeeNames}\n\n`;
    
    reportContent += `## 成员任务进展\n\n`;
    
    Object.entries(tasksByAssignee).forEach(([assigneeId, tasks]) => {
      const member = members.find(m => m.id === assigneeId);
      const memberName = member ? member.name : '未分配';
      
      reportContent += `### ${memberName}\n`;
      
      tasks.forEach(task => {
        const project = store.data.projects.find(p => p.id === task.projectId);
        const projectName = project ? project.name : '未指定项目';
        const taskReport = meeting.taskReports?.[task.id] || {};
        
        reportContent += `**${task.name}** (${projectName}) - 进度: ${task.progress}%\n`;
        
        if (taskReport.work) {
          reportContent += `- 📝 本周工作: ${taskReport.work}\n`;
        }
        if (taskReport.issues) {
          reportContent += `- ⚠️ 遇到问题: ${taskReport.issues}\n`;
        }
        reportContent += `\n`;
      });
    });
    
    const issuesList = [];
    Object.values(meeting.taskReports || {}).forEach(report => {
      if (report.issues) {
        issuesList.push(report.issues);
      }
    });
    
    if (issuesList.length > 0) {
      reportContent += `## 问题汇总\n\n`;
      issuesList.forEach((issue, i) => {
        reportContent += `${i + 1}. ${issue}\n`;
      });
      reportContent += `\n`;
    }
    
    if (meeting.notes) {
      reportContent += `## 会议决议\n\n${meeting.notes}\n`;
    }
    
    const modalContent = Utils.createElement('div', { class: 'report-modal' });
    modalContent.innerHTML = `
      <div class="modal-header">
        <h2>${Utils.icon('chart')} 会议报告</h2>
        <button class="btn btn-icon close-btn">${Utils.icon('close')}</button>
      </div>
      <div class="report-preview">
        <pre>${Utils.escapeHtml(reportContent)}</pre>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary cancel-btn">关闭</button>
        <button type="button" class="btn btn-primary" id="copyReportBtn">${Utils.icon('copy')} 复制到剪贴板</button>
      </div>
    `;
    
    const overlay = Utils.showModal(modalContent);
    
    modalContent.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
    modalContent.querySelector('.cancel-btn').addEventListener('click', () => overlay.remove());
    
    modalContent.querySelector('#copyReportBtn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(reportContent);
        alert('报告已复制到剪贴板！可粘贴到钉钉/企业微信/Word');
      } catch (e) {
        alert('复制失败，请手动复制');
      }
    });
  }

  exportData() {
    const data = store.exportData();
    const filename = `chip-todo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    Utils.downloadFile(data, filename);
  }

  async importData(file) {
    if (!file) return;
    try {
      const content = await Utils.readFile(file);
      const hasData = store.data.members.length > 0 || store.data.projects.length > 0 || store.data.tasks.length > 0;
      if (hasData) {
        const confirmed = await Utils.confirm('导入将覆盖当前所有数据，确定要继续吗？建议先导出备份。');
        if (!confirmed) return;
      }
      if (store.importData(content)) {
        this.render();
        alert('导入成功！');
      } else {
        alert('导入失败，请检查文件格式');
      }
    } catch (e) {
      alert('导入失败: ' + e.message);
    }
  }
}

const app = new ChipTodoApp();
window.app = app;
