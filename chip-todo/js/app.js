class ChipTodoApp {
  constructor() {
    this.currentView = 'board';
    this.currentProject = null;
    this.currentMember = null;
    this.currentMeetingId = null;
    this.meetingDraft = null;
    this.meetingSearchQuery = '';
    this.meetingSearchMonth = '';
    this.boardFilter = 'all'; // all, pending, in_progress, paused, completed
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
    if (this.currentView === 'meeting' && view !== 'meeting') {
      this.collectMeetingDraftFromDom();
    }

    this.currentView = view;
    Utils.$$('.tab').forEach(t => t.classList.remove('active'));
    Utils.$(`.tab[data-view="${view}"]`).classList.add('active');
    Utils.$$('.view').forEach(v => v.classList.add('hidden'));
    Utils.$(`#${view}View`).classList.remove('hidden');

    if (view === 'board') {
      this.renderBoard();
    } else if (view === 'management') {
      this.renderManagement();
    } else if (view === 'meeting') {
      this.renderMeeting();
    }

    this.updateStats();
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
      pending: '待处理',
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
              <p class="board-readonly-hint">看板仅用于查看任务，任务新增和编辑请到“管理”页。</p>
            </div>
            <div class="filter-tabs">
              <button class="filter-tab ${this.boardFilter === 'all' ? 'active' : ''}" data-filter="all">全部</button>
              <button class="filter-tab ${this.boardFilter === 'pending' ? 'active' : ''}" data-filter="pending">待处理</button>
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
    if (filter === 'pending') {
      return store.data.tasks.filter((task) => task.status === 'pending');
    }
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
      const memberName = member
        ? member.name
        : (assigneeId === 'unassigned' ? '未分配' : (memberTasks[0]?.assigneeName || '未分配'));
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
    const durationDays = this.getTaskDurationDays(task);
    
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
        <div class="task-meta">
          <span class="task-status">${progress}% ${Utils.getStatusText(task.status)}</span>
          <span class="task-duration">${Utils.icon('clock')} 持续 ${durationDays} 天</span>
        </div>
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
        this.showTaskDetail(taskEl.dataset.id);
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

  getProgressSliderBackground(progress) {
    const clampedProgress = Math.min(100, Math.max(0, Number(progress) || 0));
    const progressColor = this.getProgressColor(clampedProgress);
    return `linear-gradient(90deg, ${progressColor} 0%, ${progressColor} ${clampedProgress}%, #E2E8F0 ${clampedProgress}%, #E2E8F0 100%)`;
  }

  getTaskDurationDays(task) {
    const start = task?.createdAt ? new Date(task.createdAt) : null;
    const end = task?.completedAt ? new Date(task.completedAt) : new Date();

    if (!start || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 1;
    }

    const dayMs = 24 * 60 * 60 * 1000;
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs));
  }

  renderTaskMeetingHistory(taskId) {
    const entries = store.getTaskMeetingHistory(taskId);
    if (entries.length === 0) {
      return `
        <div class="task-history-empty">
          暂无会议记录，后续会议中填写的进展和阻塞问题会显示在这里。
        </div>
      `;
    }

    return `
      <div class="task-history-list">
        ${entries.map((entry) => `
          <article class="task-history-item">
            <div class="task-history-header">
              <strong>${Utils.escapeHtml(entry.meetingTitle)}</strong>
              <span>${this.formatMeetingDateTime(entry.updatedAt || entry.createdAt)}</span>
            </div>
            <div class="task-history-grid">
              <div class="task-history-block">
                <label>进展记录</label>
                <p>${Utils.escapeHtml(entry.work) || '未记录'}</p>
              </div>
              <div class="task-history-block">
                <label>阻塞问题</label>
                <p>${Utils.escapeHtml(entry.issues) || '未记录'}</p>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;
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
    const durationDays = this.getTaskDurationDays(task);
    
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
          <span class="detail-priority-badge priority-${task.priority || 'medium'}">${priorityLabels[task.priority || 'medium']}</span>
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
          <label>持续时间</label>
          <span>${durationDays} 天</span>
        </div>
        <div class="detail-row">
          <label>描述</label>
          <span>${Utils.escapeHtml(task.description) || '暂无描述'}</span>
        </div>
        <div class="detail-section">
          <label>会议记录</label>
          ${this.renderTaskMeetingHistory(task.id)}
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
            <input type="range" name="progress" min="0" max="100" value="${currentProgress}" class="progress-slider" id="progressSlider" style="background: ${this.getProgressSliderBackground(currentProgress)}" ${isLockedCompletedProject ? 'disabled' : ''}>
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
      progressSlider.style.background = this.getProgressSliderBackground(value);
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

  cloneMeetingDraftValue(value) {
    return JSON.parse(JSON.stringify(value || null));
  }

  createMeetingDraft(meeting = null) {
    const baseMeeting = meeting ? this.cloneMeetingDraftValue(meeting) : null;
    const tasks = (baseMeeting?.tasks || [])
      .map((task) => store.normalizeMeetingTask(task))
      .filter(Boolean);
    const attendees = Array.from(new Set([
      ...(baseMeeting?.attendees || []),
      ...tasks.map((task) => task.assignee).filter(Boolean)
    ])).filter((attendeeId) => attendeeId !== 'unassigned');

    return {
      id: baseMeeting?.id || null,
      title: String(baseMeeting?.title || '周会').trim() || '周会',
      attendees,
      notes: String(baseMeeting?.notes || ''),
      taskReports: this.cloneMeetingDraftValue(baseMeeting?.taskReports || {}),
      tasks,
      createdAt: baseMeeting?.createdAt || new Date().toISOString(),
      updatedAt: baseMeeting?.updatedAt || null
    };
  }

  getMeetingDraft() {
    if (this.currentMeetingId) {
      const storedMeeting = store.getMeeting(this.currentMeetingId);
      if (!storedMeeting) {
        this.currentMeetingId = null;
        this.meetingDraft = this.createMeetingDraft();
      } else if (!this.meetingDraft || this.meetingDraft.id !== this.currentMeetingId) {
        this.meetingDraft = this.createMeetingDraft(storedMeeting);
      }
    } else if (!this.meetingDraft) {
      this.meetingDraft = this.createMeetingDraft();
    }

    return this.meetingDraft;
  }

  formatMeetingDateTime(value) {
    if (!value) return '未记录';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  sanitizeMeetingFilename(name) {
    return String(name || 'meeting-report')
      .trim()
      .replace(/[<>:"/\\|?*]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'meeting-report';
  }

  normalizeMeetingForComparison(meeting) {
    const draft = this.createMeetingDraft(meeting);
    const normalizedTasks = (draft.tasks || [])
      .map((task) => ({
        id: task.id || '',
        projectId: task.projectId || '',
        projectName: task.projectName || '',
        name: task.name || '',
        assignee: task.assignee || '',
        assigneeName: task.assigneeName || '',
        priority: task.priority || 'medium',
        progress: task.progress || 0,
        status: task.status || 'in_progress'
      }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const normalizedReports = Object.fromEntries(
      Object.entries(draft.taskReports || {})
        .sort(([taskIdA], [taskIdB]) => String(taskIdA).localeCompare(String(taskIdB)))
        .map(([taskId, report]) => [taskId, {
          work: report?.work || '',
          issues: report?.issues || '',
          plan: report?.plan || ''
        }])
    );

    return {
      id: draft.id || null,
      title: draft.title || '周会',
      notes: draft.notes || '',
      attendees: [...(draft.attendees || [])].sort(),
      tasks: normalizedTasks,
      taskReports: normalizedReports
    };
  }

  hasMeetingDraftChanges(draft) {
    const baseline = draft?.id
      ? (store.getMeeting(draft.id) || draft)
      : { createdAt: draft?.createdAt || new Date().toISOString() };

    return JSON.stringify(this.normalizeMeetingForComparison(draft)) !==
      JSON.stringify(this.normalizeMeetingForComparison(baseline));
  }

  async saveMeetingDraftWithConfirmation(message = '确定要保存当前会议记录吗？') {
    this.collectMeetingDraftFromDom();
    const confirmed = await Utils.confirm(message);
    if (!confirmed) {
      return null;
    }

    const draftData = this.collectMeetingDraftFromDom({ persistTaskUpdates: true });
    const isNewMeeting = !draftData.id;
    const savedMeeting = store.saveMeeting(draftData);
    this.currentMeetingId = savedMeeting.id;
    this.meetingDraft = this.createMeetingDraft(savedMeeting);
    this.updateStats();
    alert(isNewMeeting ? '会议已创建并保存！' : '会议记录已保存！');
    return savedMeeting;
  }

  collectMeetingDraftFromDom(options = {}) {
    const { persistTaskUpdates = false } = options;
    const container = Utils.$('#meetingView');
    const draft = this.createMeetingDraft(this.getMeetingDraft());

    if (!container || container.classList.contains('hidden')) {
      this.meetingDraft = draft;
      return draft;
    }

    draft.title = String(Utils.$('#meetingTitle')?.value || draft.title || '周会').trim() || '周会';
    draft.notes = Utils.$('#meetingNotes')?.value || '';
    draft.attendees = Utils.$$('.meeting-member-group', container)
      .map((group) => group.dataset.assigneeId)
      .filter((attendeeId) => attendeeId && attendeeId !== 'unassigned');

    const taskReports = {};
    const tasks = [];

    Utils.$$('.meeting-task-item', container).forEach((taskEl) => {
      const taskId = taskEl.dataset.taskId;
      const storedTask = store.data.tasks.find((item) => item.id === taskId) || null;
      const assigneeId = taskEl.dataset.assigneeId || storedTask?.assignee || '';
      const projectId = taskEl.dataset.projectId || storedTask?.projectId || '';
      const priority = taskEl.dataset.priority || storedTask?.priority || 'medium';
      const progress = Math.min(100, Math.max(0, parseInt(taskEl.querySelector('.task-progress-input')?.value || '0', 10) || 0));
      const work = taskEl.querySelector('.task-work')?.value || '';
      const issues = taskEl.querySelector('.task-issues')?.value || '';
      const taskName = taskEl.querySelector('.task-name')?.textContent?.trim() || storedTask?.name || '未命名任务';
      const projectName = taskEl.querySelector('.task-project')?.textContent?.trim()
        || store.getProject(projectId)?.name
        || '未指定项目';
      const nextStatus = progress >= 100
        ? 'completed'
        : (storedTask?.status === 'paused' ? 'paused' : 'in_progress');

      if (persistTaskUpdates && storedTask) {
        store.updateTask(taskId, {
          progress,
          status: nextStatus
        });
      }

      const latestTask = persistTaskUpdates && storedTask
        ? store.data.tasks.find((item) => item.id === taskId) || storedTask
        : storedTask;

      tasks.push(latestTask
        ? {
            ...store.createMeetingTaskSnapshot(latestTask),
            progress,
            status: nextStatus
          }
        : {
            id: taskId,
            projectId,
            projectName,
            name: taskName,
            assignee: assigneeId,
            assigneeName: store.data.members.find((item) => item.id === assigneeId)?.name || '未分配',
            priority,
            progress,
            status: nextStatus
          });

      if (work || issues) {
        taskReports[taskId] = {
          work,
          issues,
          plan: draft.taskReports?.[taskId]?.plan || '',
          updatedAt: new Date().toISOString()
        };
      }
    });

    draft.tasks = tasks;
    draft.taskReports = taskReports;
    draft.attendees = Array.from(new Set([
      ...draft.attendees,
      ...tasks.map((task) => task.assignee).filter(Boolean)
    ])).filter((attendeeId) => attendeeId && attendeeId !== 'unassigned');

    this.meetingDraft = draft;
    return draft;
  }

  openMeetingAttendeeModal() {
    const draft = this.collectMeetingDraftFromDom();
    const selectedIds = new Set(draft.attendees || []);
    const members = store.data.members;
    const modalContent = Utils.createElement('div', { class: 'meeting-selector-modal' });

    modalContent.innerHTML = `
      <div class="modal-header">
        <h2>${Utils.icon('user')} 导入参会人员</h2>
        <button class="btn btn-icon close-btn">${Utils.icon('close')}</button>
      </div>
      <div class="meeting-selector-body">
        <p class="meeting-selector-hint">从成员库中选择本次会议参会人员，已导入任务的成员会保留在会议记录中。</p>
        <div class="meeting-selector-actions">
          <button type="button" class="btn btn-secondary btn-small" data-select="all">导入全部成员</button>
          <button type="button" class="btn btn-secondary btn-small" data-select="none">清空选择</button>
        </div>
        <div class="member-select-list">
          ${members.length === 0
            ? '<p class="empty">暂无成员，先到管理页添加成员。</p>'
            : members.map((member) => `
                <label class="member-select-item">
                  <input type="checkbox" name="meetingAttendeeSelection" value="${member.id}" ${selectedIds.has(member.id) ? 'checked' : ''}>
                  <span class="member-avatar" style="background:${member.color}">${member.name[0]}</span>
                  <span>${Utils.escapeHtml(member.name)}</span>
                  <span class="role-badge">${Utils.escapeHtml(member.role || '成员')}</span>
                </label>
              `).join('')}
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary cancel-btn">取消</button>
        <button type="button" class="btn btn-primary confirm-btn" ${members.length === 0 ? 'disabled' : ''}>确认导入</button>
      </div>
    `;

    const overlay = Utils.showModal(modalContent);
    const cleanup = () => overlay.remove();

    modalContent.querySelector('.close-btn')?.addEventListener('click', cleanup);
    modalContent.querySelector('.cancel-btn')?.addEventListener('click', cleanup);
    modalContent.querySelector('[data-select="all"]')?.addEventListener('click', () => {
      Utils.$$('input[name="meetingAttendeeSelection"]', modalContent).forEach((input) => {
        input.checked = true;
      });
    });
    modalContent.querySelector('[data-select="none"]')?.addEventListener('click', () => {
      Utils.$$('input[name="meetingAttendeeSelection"]', modalContent).forEach((input) => {
        input.checked = false;
      });
    });
    modalContent.querySelector('.confirm-btn')?.addEventListener('click', () => {
      const nextAttendees = Utils.$$('input[name="meetingAttendeeSelection"]:checked', modalContent)
        .map((input) => input.value);
      const attendeeSet = new Set(nextAttendees);
      draft.attendees = nextAttendees;
      draft.tasks = draft.tasks.filter((task) => attendeeSet.has(task.assignee));
      draft.taskReports = Object.fromEntries(
        Object.entries(draft.taskReports || {}).filter(([taskId]) => draft.tasks.some((task) => task.id === taskId))
      );
      this.meetingDraft = this.createMeetingDraft(draft);
      cleanup();
      this.renderMeeting();
    });
  }

  openMeetingTaskImportModal(memberId) {
    const draft = this.collectMeetingDraftFromDom();
    const member = store.data.members.find((item) => item.id === memberId) || null;
    if (!member) {
      alert('该成员不存在，无法导入任务');
      return;
    }

    const currentTaskIds = new Set((draft.tasks || []).map((task) => task.id));
    const availableTasks = store.getUnfinishedTasksByMember(memberId)
      .filter((task) => !currentTaskIds.has(task.id));
    const modalContent = Utils.createElement('div', { class: 'meeting-selector-modal' });

    modalContent.innerHTML = `
      <div class="modal-header">
        <h2>${Utils.icon('download')} 导入任务</h2>
        <button class="btn btn-icon close-btn">${Utils.icon('close')}</button>
      </div>
      <div class="meeting-selector-body">
        <p class="meeting-selector-hint">选择 ${Utils.escapeHtml(member.name)} 当前未完成的任务导入会议记录。暂停中的任务也会出现在这里。</p>
        <div class="task-select-list">
          ${availableTasks.length === 0
            ? '<p class="empty">该成员当前没有可导入的未完成任务。</p>'
            : availableTasks.map((task) => {
                const project = store.getProject(task.projectId);
                const projectName = project ? project.name : '未指定项目';
                return `
                  <label class="task-select-item">
                    <input type="checkbox" value="${task.id}">
                    <span class="task-select-name">${Utils.escapeHtml(task.name)}</span>
                    <span class="task-select-project">${Utils.escapeHtml(projectName)}</span>
                    <span class="task-select-progress" style="color: ${this.getProgressColor(task.progress || 0)}">${task.progress || 0}%</span>
                  </label>
                `;
              }).join('')}
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary cancel-btn">取消</button>
        <button type="button" class="btn btn-primary confirm-btn" ${availableTasks.length === 0 ? 'disabled' : ''}>确认导入</button>
      </div>
    `;

    const overlay = Utils.showModal(modalContent);
    const cleanup = () => overlay.remove();

    modalContent.querySelector('.close-btn')?.addEventListener('click', cleanup);
    modalContent.querySelector('.cancel-btn')?.addEventListener('click', cleanup);
    modalContent.querySelector('.confirm-btn')?.addEventListener('click', () => {
      const selectedTaskIds = Utils.$$('input[type="checkbox"]:checked', modalContent).map((input) => input.value);
      if (selectedTaskIds.length === 0) {
        cleanup();
        return;
      }

      const selectedTasks = availableTasks
        .filter((task) => selectedTaskIds.includes(task.id))
        .map((task) => store.createMeetingTaskSnapshot(task));
      draft.tasks = [
        ...draft.tasks,
        ...selectedTasks
      ];
      this.meetingDraft = this.createMeetingDraft(draft);
      cleanup();
      this.renderMeeting();
    });
  }

  renderMeetingTaskItem(task, taskReport = {}) {
    const priorityLabels = { low: '低', medium: '中', high: '高' };
    const priorityIcons = {
      low: Utils.icon('arrowDown'),
      medium: Utils.icon('minus'),
      high: Utils.icon('arrowUp')
    };
    const priority = task.priority || 'medium';
    const progress = task.progress || 0;
    const progressClass = this.getProgressClass(progress);
    const progressColor = this.getProgressColor(progress);

    return `
      <div class="meeting-task-item" data-task-id="${task.id}" data-assignee-id="${task.assignee || ''}" data-project-id="${task.projectId || ''}" data-priority="${priority}">
        <div class="task-item-header">
          <span class="task-project">${Utils.escapeHtml(task.projectName || '未指定项目')}</span>
          <span class="task-name">${Utils.escapeHtml(task.name)}</span>
          <span class="task-priority meeting-task-priority priority-${priority}" title="优先级: ${priorityLabels[priority]}">${priorityIcons[priority]} ${priorityLabels[priority]}</span>
          <button class="btn btn-icon btn-danger btn-small remove-task-btn" title="移出会议记录">${Utils.icon('trash')}</button>
        </div>
        <div class="task-progress-slider">
          <div class="task-progress-slider-header">
            <span class="progress-label">进度</span>
            <span class="progress-value" style="color: ${progressColor}">${progress}%</span>
          </div>
          <input type="range" class="task-progress-input ${progressClass}" min="0" max="100" value="${progress}" style="background: linear-gradient(90deg, ${progressColor} 0%, ${progressColor} ${progress}%, #e2e8f0 ${progress}%, #e2e8f0 100%);">
        </div>
        <div class="task-report-fields">
          <div class="report-field">
            <label>${Utils.icon('check')} 进展记录</label>
            <textarea class="task-work" placeholder="记录本次会议同步到的进展...">${Utils.escapeHtml(taskReport.work || '')}</textarea>
          </div>
          <div class="report-field">
            <label>${Utils.icon('alertCircle')} 阻塞问题</label>
            <textarea class="task-issues" placeholder="记录风险、问题和需要协调的事项...">${Utils.escapeHtml(taskReport.issues || '')}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  renderMeeting() {
    const container = Utils.$('#meetingView');
    const draft = this.getMeetingDraft();
    const members = store.data.members;
    const meetingsList = store.getMeetingsList({
      query: this.meetingSearchQuery,
      month: this.meetingSearchMonth
    });
    const hasSearchFilters = Boolean(this.meetingSearchQuery || this.meetingSearchMonth);
    const tasksByAssignee = store.groupMeetingTasksByAssignee(draft.tasks || []);
    const attendeeIds = Array.from(new Set([
      ...(draft.attendees || []),
      ...Object.keys(tasksByAssignee)
    ]));

    const attendeeCards = (draft.attendees || []).length === 0
      ? '<p class="empty">暂无参会人员，可通过“导入参会人员”选择成员。</p>'
      : draft.attendees.map((attendeeId) => {
          const member = members.find((item) => item.id === attendeeId) || null;
          const fallbackTask = tasksByAssignee[attendeeId]?.[0] || null;
          const memberName = member ? member.name : (fallbackTask?.assigneeName || '未知成员');
          const memberColor = member ? member.color : '#6B7280';
          const memberRole = member?.role || '成员';
          return `
            <div class="meeting-attendee-card" data-member-id="${attendeeId}">
              <span class="member-avatar" style="background:${memberColor}">${memberName[0]}</span>
              <div class="meeting-attendee-info">
                <strong>${Utils.escapeHtml(memberName)}</strong>
                <span>${Utils.escapeHtml(memberRole)}</span>
              </div>
              <button class="btn btn-icon btn-small remove-attendee-btn" data-attendee-id="${attendeeId}" title="移出参会人员">${Utils.icon('close')}</button>
            </div>
          `;
        }).join('');

    let tasksHtml = '';
    attendeeIds.forEach((assigneeId) => {
      const tasks = tasksByAssignee[assigneeId] || [];
      const member = members.find((item) => item.id === assigneeId) || null;
      const fallbackTask = tasks[0] || null;
      const memberName = member ? member.name : (fallbackTask?.assigneeName || '未分配');
      const memberColor = member ? member.color : '#6B7280';
      const taskItems = tasks.length === 0
        ? '<p class="empty-inline">暂无已导入任务，可点击“导入任务”带入未完成事项。</p>'
        : tasks.map((task) => this.renderMeetingTaskItem(task, draft.taskReports?.[task.id] || {})).join('');
      const importTaskButton = assigneeId === 'unassigned'
        ? ''
        : `<button class="btn btn-small btn-outline import-task-btn" data-assignee-id="${assigneeId}" data-member-name="${Utils.escapeHtml(memberName)}">${Utils.icon('download')} 导入任务</button>`;

      tasksHtml += `
        <div class="meeting-member-group" data-assignee-id="${assigneeId}">
          <div class="meeting-member-header">
            <span class="member-avatar" style="background:${memberColor}">${memberName[0]}</span>
            <span class="member-name">${Utils.escapeHtml(memberName)}</span>
            ${importTaskButton}
          </div>
          <div class="meeting-tasks">
            ${taskItems}
          </div>
        </div>
      `;
    });

    if (attendeeIds.length === 0) {
      tasksHtml = '<p class="empty">先导入参会人员，再按人导入未完成任务进行会议记录。</p>';
    }

    const historyItems = meetingsList.map((meeting) => `
      <div class="history-item ${meeting.id === this.currentMeetingId ? 'active' : ''}" data-meeting-id="${meeting.id}">
        <div class="history-item-top">
          <span class="history-week">${Utils.escapeHtml(meeting.title || '周会')}</span>
          <span class="history-date">${this.formatMeetingDateTime(meeting.createdAt)}</span>
        </div>
        <div class="history-item-meta">${meeting.attendeeCount}人 · ${meeting.taskCount}项任务</div>
      </div>
    `).join('');

    container.innerHTML = `
        <div class="meeting-page">
          <div class="meeting-sidebar">
          <div class="meeting-sidebar-header">
            <h3>${Utils.icon('document')} 查询会议</h3>
          </div>
          <form class="meeting-search-form" id="meetingSearchForm">
            <label class="meeting-search-field">
              <span>主题</span>
              <input type="search" id="meetingSearchInput" value="${Utils.escapeHtml(this.meetingSearchQuery)}" placeholder="按会议主题查询">
            </label>
            <label class="meeting-search-field">
              <span>日期</span>
              <input type="month" id="meetingSearchMonth" value="${Utils.escapeHtml(this.meetingSearchMonth)}">
            </label>
            <div class="meeting-search-actions">
              <button type="submit" class="btn btn-secondary btn-small">查询</button>
            </div>
          </form>
          <div class="meeting-history-list">
            ${historyItems || `<p class="empty">${hasSearchFilters ? '没有匹配的会议记录' : '暂无会议记录'}</p>`}
          </div>
        </div>

        <div class="meeting-main">
          <div class="page-header">
            <div>
              <h2>${draft.id ? '编辑会议' : '新建会议'}</h2>
              <p class="meeting-meta">创建时间：${this.formatMeetingDateTime(draft.createdAt)}${draft.updatedAt ? ` · 最近保存：${this.formatMeetingDateTime(draft.updatedAt)}` : ''}</p>
            </div>
            <div class="meeting-actions">
              <button class="btn btn-meeting-new" id="newMeetingBtn">${Utils.icon('plus')} 新建会议</button>
              ${draft.id ? `<button class="btn btn-danger" id="deleteMeetingBtn">${Utils.icon('trash')} 删除会议</button>` : ''}
              <button class="btn btn-meeting-export" id="exportMeetingHtmlBtn">${Utils.icon('download')} 导出HTML报告</button>
              <button class="btn btn-primary" id="saveMeetingBtn">${Utils.icon('check')} 保存会议</button>
            </div>
          </div>

          <div class="meeting-form meeting-form-grid">
            <div class="form-group">
              <label>会议主题</label>
              <input type="text" id="meetingTitle" value="${Utils.escapeHtml(draft.title || '周会')}" placeholder="例如：周会 / 项目评审 / 问题复盘">
            </div>
            <div class="form-group">
              <label>会议创建时间</label>
              <input type="text" id="meetingCreatedAt" value="${this.formatMeetingDateTime(draft.createdAt)}" readonly>
            </div>
            <div class="form-group form-group-full">
              <div class="meeting-section-header">
                <label>参会人员</label>
                <div class="meeting-section-actions">
                  <button type="button" class="btn btn-secondary btn-small" id="importAttendeesBtn">${Utils.icon('user')} 导入参会人员</button>
                  <button type="button" class="btn btn-secondary btn-small" id="clearAttendeesBtn" ${(draft.attendees || []).length === 0 ? 'disabled' : ''}>清空</button>
                </div>
              </div>
              <div class="meeting-attendee-cards">
                ${attendeeCards}
              </div>
            </div>
            <div class="form-group form-group-full">
              <label>会议备注</label>
              <textarea id="meetingNotes" placeholder="记录会议结论、决议、待办和需要跟进的事项...">${Utils.escapeHtml(draft.notes || '')}</textarea>
            </div>
          </div>

          <div class="meeting-tasks-section">
            <div class="meeting-section-header">
              <h3>${Utils.icon('document')} 任务进展记录 (${(draft.tasks || []).length}项)</h3>
            </div>
            <p class="meeting-hint">每位参会人员可以导入自己当前未完成的任务，在会议过程中记录进展并直接调整进度。</p>
            <div class="meeting-tasks-list">
              ${tasksHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    Utils.$('#meetingSearchForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.meetingSearchQuery = Utils.$('#meetingSearchInput')?.value?.trim() || '';
      this.meetingSearchMonth = Utils.$('#meetingSearchMonth')?.value || '';
      this.renderMeeting();
    });

    Utils.$('#newMeetingBtn')?.addEventListener('click', async () => {
      const currentDraft = this.collectMeetingDraftFromDom();
      if (this.hasMeetingDraftChanges(currentDraft)) {
        const savedMeeting = await this.saveMeetingDraftWithConfirmation('当前会议有未保存内容，是否先保存后再新建会议？');
        if (!savedMeeting) {
          alert('请先保存当前会议，再新建新的会议记录。');
          return;
        }
      }

      this.currentMeetingId = null;
      this.meetingDraft = this.createMeetingDraft();
      this.renderMeeting();
    });

    Utils.$('#importAttendeesBtn')?.addEventListener('click', () => {
      this.openMeetingAttendeeModal();
    });

    Utils.$('#clearAttendeesBtn')?.addEventListener('click', async () => {
      const confirmed = await Utils.confirm('确定要清空当前会议中的参会人员和已导入任务吗？');
      if (!confirmed) return;
      const draftData = this.collectMeetingDraftFromDom();
      draftData.attendees = [];
      draftData.tasks = [];
      draftData.taskReports = {};
      this.meetingDraft = this.createMeetingDraft(draftData);
      this.renderMeeting();
    });

    Utils.$$('#saveMeetingBtn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const savedMeeting = await this.saveMeetingDraftWithConfirmation('确定要保存当前会议记录吗？');
        if (!savedMeeting) return;
        this.renderMeeting();
      });
    });

    Utils.$('#deleteMeetingBtn')?.addEventListener('click', async () => {
      const draftData = this.collectMeetingDraftFromDom();
      if (!draftData.id) return;

      const confirmed = await Utils.confirm(`确定要删除会议“${draftData.title || '周会'}”吗？该操作不可恢复。`);
      if (!confirmed) return;

      store.deleteMeeting(draftData.id);
      this.currentMeetingId = null;
      this.meetingDraft = this.createMeetingDraft();
      alert('会议已删除');
      this.renderMeeting();
    });

    Utils.$('#exportMeetingHtmlBtn')?.addEventListener('click', () => {
      this.exportMeetingHtmlReport();
    });

    Utils.$$('.history-item').forEach((item) => {
      item.addEventListener('click', () => {
        const meetingId = item.dataset.meetingId;
        const meeting = store.getMeeting(meetingId);
        if (!meeting) return;
        this.currentMeetingId = meetingId;
        this.meetingDraft = this.createMeetingDraft(meeting);
        this.renderMeeting();
      });
    });

    Utils.$$('.remove-attendee-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const attendeeId = btn.dataset.attendeeId;
        const confirmed = await Utils.confirm('移出该参会人员后，ta 已导入的任务也会从当前会议中移除，是否继续？');
        if (!confirmed) return;
        const draftData = this.collectMeetingDraftFromDom();
        draftData.attendees = draftData.attendees.filter((id) => id !== attendeeId);
        draftData.tasks = draftData.tasks.filter((task) => task.assignee !== attendeeId);
        draftData.taskReports = Object.fromEntries(
          Object.entries(draftData.taskReports || {}).filter(([taskId]) => draftData.tasks.some((task) => task.id === taskId))
        );
        this.meetingDraft = this.createMeetingDraft(draftData);
        this.renderMeeting();
      });
    });

    Utils.$$('.import-task-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.openMeetingTaskImportModal(btn.dataset.assigneeId);
      });
    });

    Utils.$$('.task-progress-input').forEach((slider) => {
      slider.addEventListener('input', (e) => {
        const taskItem = e.target.closest('.meeting-task-item');
        const rawValue = parseInt(e.target.value, 10);
        const value = Math.min(100, Math.max(0, Number.isNaN(rawValue) ? 0 : rawValue));
        e.target.value = value;
        const progressColor = this.getProgressColor(value);
        const progressClass = this.getProgressClass(value);
        const valueSpan = taskItem.querySelector('.progress-value');
        valueSpan.textContent = `${value}%`;
        valueSpan.style.color = progressColor;
        e.target.style.background = `linear-gradient(90deg, ${progressColor} 0%, ${progressColor} ${value}%, #e2e8f0 ${value}%, #e2e8f0 100%)`;
        e.target.className = `task-progress-input ${progressClass}`;
      });
    });

    Utils.$$('.remove-task-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const taskItem = btn.closest('.meeting-task-item');
        const taskName = taskItem.querySelector('.task-name')?.textContent || '该任务';
        const confirmed = await Utils.confirm(`确定要将“${taskName}”从当前会议中移除吗？`);
        if (!confirmed) return;

        const draftData = this.collectMeetingDraftFromDom();
        const taskId = taskItem.dataset.taskId;
        draftData.tasks = draftData.tasks.filter((task) => task.id !== taskId);
        delete draftData.taskReports[taskId];
        this.meetingDraft = this.createMeetingDraft(draftData);
        this.renderMeeting();
      });
    });
  }

  buildMeetingHtmlReport(meeting) {
    const normalizedMeeting = this.createMeetingDraft(meeting);
    const attendeeNames = normalizedMeeting.attendees
      .map((attendeeId) => store.data.members.find((member) => member.id === attendeeId)?.name || '未知成员')
      .join('、') || '无';
    const tasksByAssignee = store.groupMeetingTasksByAssignee(normalizedMeeting.tasks || []);

    const taskSections = Object.entries(tasksByAssignee).map(([assigneeId, tasks]) => {
      const member = store.data.members.find((item) => item.id === assigneeId) || null;
      const memberName = member
        ? member.name
        : (assigneeId === 'unassigned' ? '未分配' : (tasks[0]?.assigneeName || '未分配'));
      const taskRows = tasks.map((task) => {
        const taskReport = normalizedMeeting.taskReports?.[task.id] || {};
        return `
          <tr>
            <td>${Utils.escapeHtml(task.projectName || '未指定项目')}</td>
            <td>${Utils.escapeHtml(task.name)}</td>
            <td>${task.progress || 0}%</td>
            <td>${Utils.escapeHtml(taskReport.work || '-')}</td>
            <td>${Utils.escapeHtml(taskReport.issues || '-')}</td>
          </tr>
        `;
      }).join('');

      return `
        <section class="report-section">
          <h2>${Utils.escapeHtml(memberName)}</h2>
          <table>
            <thead>
              <tr>
                <th>项目</th>
                <th>任务</th>
                <th>进度</th>
                <th>进展记录</th>
                <th>阻塞问题</th>
              </tr>
            </thead>
            <tbody>
              ${taskRows || '<tr><td colspan="5">暂无任务</td></tr>'}
            </tbody>
          </table>
        </section>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${Utils.escapeHtml(normalizedMeeting.title || '周会')} - 会议报告</title>
  <style>
    body {
      margin: 0;
      padding: 40px;
      font-family: "Segoe UI", "PingFang SC", sans-serif;
      color: #1f2937;
      background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
    }
    .report-shell {
      max-width: 1100px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
      overflow: hidden;
    }
    .report-header {
      padding: 36px 40px 28px;
      background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
      color: #ffffff;
    }
    .report-header h1 {
      margin: 0 0 12px;
      font-size: 34px;
    }
    .report-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 24px;
      font-size: 15px;
      opacity: 0.92;
    }
    .report-body {
      padding: 32px 40px 40px;
    }
    .report-notes {
      margin-bottom: 28px;
      padding: 20px 24px;
      border-radius: 18px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      white-space: pre-wrap;
      line-height: 1.7;
    }
    .report-section + .report-section {
      margin-top: 28px;
    }
    .report-section h2 {
      margin: 0 0 16px;
      font-size: 22px;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
    }
    thead {
      background: #eff6ff;
    }
    th, td {
      padding: 14px 16px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      vertical-align: top;
      font-size: 14px;
      line-height: 1.6;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
  </style>
</head>
<body>
  <div class="report-shell">
    <header class="report-header">
      <h1>${Utils.escapeHtml(normalizedMeeting.title || '周会')}</h1>
      <div class="report-meta">
        <span>创建时间：${this.formatMeetingDateTime(normalizedMeeting.createdAt)}</span>
        <span>最近更新：${this.formatMeetingDateTime(normalizedMeeting.updatedAt || normalizedMeeting.createdAt)}</span>
        <span>参会人员：${Utils.escapeHtml(attendeeNames)}</span>
        <span>任务数：${normalizedMeeting.tasks.length}</span>
      </div>
    </header>
    <main class="report-body">
      <section class="report-notes">${Utils.escapeHtml(normalizedMeeting.notes || '暂无会议备注')}</section>
      ${taskSections || '<p>暂无任务记录</p>'}
    </main>
  </div>
</body>
</html>`;
  }

  exportMeetingHtmlReport() {
    const meeting = this.collectMeetingDraftFromDom();
    const html = this.buildMeetingHtmlReport(meeting);
    const timestamp = this.formatMeetingDateTime(meeting.createdAt).replace(/[ :]/g, '-');
    const filename = `${this.sanitizeMeetingFilename(meeting.title || '周会')}-${timestamp}.html`;
    Utils.downloadFile(html, filename, 'text/html');
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



