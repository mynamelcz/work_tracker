class ChipTodoApp {
  constructor() {
    this.currentView = 'board';
    this.currentProject = null;
    this.currentMember = null;
    this.meetingWeek = null;
    this.meetingYear = null;
    this.boardFilter = 'all'; // all, not_started, in_progress, paused
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
    Utils.$('#app').addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab) {
        this.switchView(tab.dataset.view);
      }
      
      const exportBtn = e.target.closest('#exportBtn');
      if (exportBtn) {
        this.exportData();
      }
      
      const importBtn = e.target.closest('#importBtn');
      if (importBtn) {
        Utils.$('#importFile').click();
      }
    });
    
    Utils.$('#importFile').addEventListener('change', (e) => {
      this.importData(e.target.files[0]);
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
    
    // Get filtered projects based on boardFilter
    const { tasks, projects } = this.getFilteredData(this.boardFilter);
    container.innerHTML = `
      <div class="board">
        <div class="sidebar">
          <h3>项目列表</h3>
          <div class="project-list" id="projectList">
            ${projects.map(p => this.renderProjectItem(p)).join('')}
          </div>
        </div>
        
        <div class="board-content">
          <div class="board-header">
            <h3>任务甘特图</h3>
            <div class="filter-tabs">
              <button class="filter-tab ${this.boardFilter === 'all' ? 'active' : ''}" data-filter="all">全部</button>
              <button class="filter-tab ${this.boardFilter === 'not_started' ? 'active' : ''}" data-filter="not_started">未开始</button>
              <button class="filter-tab ${this.boardFilter === 'in_progress' ? 'active' : ''}" data-filter="in_progress">进行中</button>
              <button class="filter-tab ${this.boardFilter === 'paused' ? 'active' : ''}" data-filter="paused">暂停</button>
            </div>
          </div>
          ${tasks.length === 0 ? '<p class="empty">暂无任务</p>' : this.renderGantt(tasks, members, projects)}
        </div>
      </div>
    `;
    
    this.bindBoardEvents();
    this.bindFilterEvents();
  }

  getFilteredData(filter) {
    let filteredProjects;
    
    if (filter === 'all') {
      filteredProjects = store.data.projects;
    } else {
      filteredProjects = store.data.projects.filter(p => p.status === filter);
    }
    
    const projectIds = new Set(filteredProjects.map(p => p.id));
    const tasks = store.data.tasks.filter(t => projectIds.has(t.projectId));
    
    return { tasks, projects: filteredProjects };
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

  renderProjectItem(project) {
    const projectTasks = store.getTasksByProject(project.id);
    const taskCount = projectTasks.length;
    const completedCount = projectTasks.filter(t => t.status === 'completed').length;
    const isActive = this.currentProject === project.id ? 'active' : '';
    const statusLabels = { not_started: '未开始', in_progress: '进行中', paused: '暂停' };
    const statusClass = { not_started: 'status-pending', in_progress: 'status-in_progress', paused: 'status-paused' };
    const projectStatus = project.status || 'not_started';
    
    return `
      <div class="project-item ${isActive}" data-id="${project.id}">
        <div class="project-item-header">
          <div class="project-name">${Utils.escapeHtml(project.name)}</div>
          <span class="project-status-dot ${statusClass[projectStatus]}" title="${statusLabels[projectStatus]}"></span>
        </div>
        <div class="project-meta">${completedCount}/${taskCount} 任务</div>
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
        this.currentProject = item.dataset.id;
        this.renderBoard();
        this.showProjectDetail(item.dataset.id);
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
    const statusLabels = { not_started: '未开始', in_progress: '进行中', paused: '暂停' };
    const statusClass = { not_started: 'status-pending', in_progress: 'status-in_progress', paused: 'status-paused' };
    const projectStatus = project.status || 'not_started';
    
    return `
      <div class="project-card" data-id="${project.id}">
        <div class="project-card-header">
          <h3>${Utils.escapeHtml(project.name)}</h3>
          <span class="project-status-badge ${statusClass[projectStatus]}">${statusLabels[projectStatus]}</span>
        </div>
        <p>${Utils.escapeHtml(project.description) || '暂无描述'}</p>
        <div class="project-card-meta">
          <span>${Utils.icon('document')} ${completed}/${tasks.length} 任务</span>
          <span>${Utils.icon('user')} ${members.length} 人</span>
        </div>
        <div class="project-members">
          ${members.map(m => `<span class="member-chip" style="background:${m.color}">${m.name[0]}</span>`).join('')}
        </div>
        <button class="btn btn-secondary view-btn">查看详情</button>
      </div>
    `;
  }

  showProjectDetail(projectId) {
    const project = store.data.projects.find(p => p.id === projectId);
    if (!project) return;
    
    const tasks = store.getTasksByProject(projectId);
    const members = store.getProjectMembers(projectId);
    const statusLabels = { not_started: '未开始', in_progress: '进行中', paused: '暂停' };
    const statusClass = { not_started: 'status-pending', in_progress: 'status-in_progress', paused: 'status-paused' };
    const currentStatus = project.status || 'not_started';
    
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
          <option value="not_started" ${currentStatus === 'not_started' ? 'selected' : ''}>未开始</option>
          <option value="in_progress" ${currentStatus === 'in_progress' ? 'selected' : ''}>进行中</option>
          <option value="paused" ${currentStatus === 'paused' ? 'selected' : ''}>暂停</option>
        </select>
      </div>
      
      <div class="project-detail-section">
        <h3>${Utils.icon('user')} 参与人员</h3>
        <div class="member-list">
          ${members.length === 0 ? '<p>暂无成员</p>' : members.map(m => `
            <div class="member-item">
              <span class="member-avatar" style="background:${m.color}">${m.name[0]}</span>
              <span>${Utils.escapeHtml(m.name)}</span>
              <span class="role">${Utils.escapeHtml(m.role)}</span>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-secondary btn-sm" id="addMemberToProject">+ 添加成员</button>
      </div>
      
      <div class="project-detail-section">
        <h3>${Utils.icon('document')} 任务列表</h3>
        <button class="btn btn-primary btn-sm" id="addTaskToProject">+ 添加任务</button>
        <div class="task-list">
          ${tasks.length === 0 ? '<p>暂无任务</p>' : tasks.map(t => this.renderTaskItem(t)).join('')}
        </div>
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-danger" id="deleteProject">${Utils.icon('trash')} 删除项目</button>
      </div>
    `;
    
    const overlay = Utils.showModal(modalContent);
    
    modalContent.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
    
    modalContent.querySelector('#projectStatusSelect').addEventListener('change', (e) => {
      store.updateProject(projectId, { status: e.target.value });
      overlay.remove();
      this.showProjectDetail(projectId);
    });
    
    modalContent.querySelector('#addMemberToProject')?.addEventListener('click', () => {
      overlay.remove();
      this.showAddMemberToProject(projectId);
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
        this.showTaskModal(item.dataset.id);
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
    const currentStatus = project?.status || 'not_started';
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
            <option value="not_started" ${currentStatus === 'not_started' ? 'selected' : ''}>未开始</option>
            <option value="in_progress" ${currentStatus === 'in_progress' ? 'selected' : ''}>进行中</option>
            <option value="paused" ${currentStatus === 'paused' ? 'selected' : ''}>暂停</option>
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
      const data = {
        name: formData.get('name'),
        status: formData.get('status'),
        description: formData.get('description')
      };
      
      if (isEdit) {
        store.updateProject(project.id, data);
      } else {
        store.addProject(data);
      }
      
      overlay.remove();
      this.render();
    });
  }

  showAddMemberToProject(projectId) {
    const allMembers = store.data.members;
    const project = store.data.projects.find(p => p.id === projectId);
    const currentMembers = project ? project.members : [];
    
    const modalContent = Utils.createElement('div', { class: 'form-modal' });
    modalContent.innerHTML = `
      <h2>添加成员到项目</h2>
      <div class="member-select-list">
        ${allMembers.map(m => `
          <label class="member-select-item">
            <input type="checkbox" value="${m.id}" ${currentMembers.includes(m.id) ? 'checked' : ''}>
            <span class="member-avatar" style="background:${m.color}">${m.name[0]}</span>
            <span>${Utils.escapeHtml(m.name)}</span>
            <span class="role">${Utils.escapeHtml(m.role)}</span>
          </label>
        `).join('')}
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary cancel-btn">取消</button>
        <button type="button" class="btn btn-primary confirm-btn">确认</button>
      </div>
    `;
    
    const overlay = Utils.showModal(modalContent);
    
    modalContent.querySelector('.cancel-btn').addEventListener('click', () => overlay.remove());
    modalContent.querySelector('.confirm-btn').addEventListener('click', () => {
      const selected = Array.from(modalContent.querySelectorAll('input:checked')).map(i => i.value);
      store.updateProject(projectId, { members: selected });
      overlay.remove();
      this.showProjectDetail(projectId);
    });
  }

  showTaskModal(taskId = null, projectId = null) {
    const task = taskId ? store.data.tasks.find(t => t.id === taskId) : null;
    const isEdit = !!task;
    const weekProjects = store.data.projects.filter(p => p.weekKey === store.getWeekKey(store.data.currentWeek, store.data.currentYear));
    const members = store.data.members;
    const currentProgress = task?.progress || 0;
    const progressColor = this.getProgressColor(currentProgress);
    
    const modalContent = Utils.createElement('div', { class: 'form-modal' });
    modalContent.innerHTML = `
      <h2>${isEdit ? '编辑任务' : '新建任务'}</h2>
      <form id="taskForm">
        <div class="form-group">
          <label>任务名称</label>
          <input type="text" name="name" required value="${task ? Utils.escapeHtml(task.name) : ''}" placeholder="任务描述">
        </div>
        <div class="form-group">
          <label>所属项目</label>
          <select name="projectId" required>
            ${weekProjects.map(p => `
              <option value="${p.id}" ${(projectId || task?.projectId) === p.id ? 'selected' : ''}>
                ${Utils.escapeHtml(p.name)}
              </option>
            `).join('')}
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
            <input type="range" name="progress" min="0" max="100" value="${currentProgress}" class="progress-slider" id="progressSlider">
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
          <select name="status">
            <option value="pending" ${!task || task.status === 'pending' ? 'selected' : ''}>待处理</option>
            <option value="in_progress" ${task?.status === 'in_progress' ? 'selected' : ''}>进行中</option>
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
          <button type="submit" class="btn btn-primary">${isEdit ? '保存' : '创建'}</button>
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
      const data = {
        name: formData.get('name'),
        projectId: formData.get('projectId'),
        assignee: formData.get('assignee') || null,
        priority: formData.get('priority'),
        status: formData.get('status'),
        progress: parseInt(formData.get('progress')) || 0,
        description: formData.get('description')
      };
      
      const taskProjectId = projectId || (task ? task.projectId : null);
      
      if (isEdit) {
        store.updateTask(taskId, data);
      } else {
        store.addTask(data);
      }
      
      overlay.remove();
      if (taskProjectId) {
        this.showProjectDetail(taskProjectId);
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
      const data = {
        name: formData.get('name'),
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
    
    const attendeeCheckboxes = members.map(m => `
      <label class="attendee-checkbox">
        <input type="checkbox" value="${m.id}" ${meeting?.attendees?.includes(m.id) ? 'checked' : ''}>
        <span class="member-avatar" style="background:${m.color}">${m.name[0]}</span>
        <span>${Utils.escapeHtml(m.name)}</span>
      </label>
    `).join('');
    
    let tasksHtml = '';
    Object.entries(tasksByAssignee).forEach(([assigneeId, tasks]) => {
      const member = members.find(m => m.id === assigneeId);
      const memberName = member ? member.name : '未分配';
      const memberColor = member ? member.color : '#6B7280';
      
      const taskItems = tasks.map(task => {
        const project = store.data.projects.find(p => p.id === task.projectId);
        const projectName = project ? project.name : '未指定项目';
        const taskReport = meeting?.taskReports?.[task.id] || {};
        
        return `
          <div class="meeting-task-item" data-task-id="${task.id}">
            <div class="task-item-header">
              <span class="task-name">${Utils.escapeHtml(task.name)}</span>
              <span class="task-project">${Utils.escapeHtml(projectName)}</span>
              <span class="task-progress" style="color: ${this.getProgressColor(task.progress)}">${task.progress}%</span>
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
              <div class="report-field">
                <label>${Utils.icon('target')} 下周计划</label>
                <textarea class="task-plan" placeholder="下周计划做什么...">${Utils.escapeHtml(taskReport.plan || '')}</textarea>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      tasksHtml += `
        <div class="meeting-member-group">
          <div class="meeting-member-header">
            <span class="member-avatar" style="background:${memberColor}">${memberName[0]}</span>
            <span class="member-name">${Utils.escapeHtml(memberName)}</span>
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
                ${attendeeCheckboxes}
              </div>
            </div>
            
            <div class="form-group">
              <label>会议备注</label>
              <textarea id="meetingNotes" placeholder="会议讨论内容、决策事项等...">${meeting?.notes || ''}</textarea>
            </div>
          </div>
          
          <div class="meeting-tasks-section">
            <h3>${Utils.icon('document')} 任务进展记录 (${Object.values(tasksByAssignee).flat().length}项)</h3>
            <p class="meeting-hint">为每个任务记录：本周工作内容、遇到的问题、下周计划</p>
            <div class="meeting-tasks-list">
              ${tasksHtml}
            </div>
          </div>
        </div>
      </div>
    `;
    
    Utils.$('#saveMeetingBtn')?.addEventListener('click', () => {
      const date = Utils.$('#meetingDate').value;
      const notes = Utils.$('#meetingNotes').value;
      const attendees = Array.from(Utils.$$('#meetingView input[type="checkbox"]:checked')).map(cb => cb.value);
      
      store.saveMeeting(week, year, { date, notes, attendees });
      
      Utils.$$('.meeting-task-item').forEach(taskEl => {
        const taskId = taskEl.dataset.taskId;
        const work = taskEl.querySelector('.task-work')?.value || '';
        const issues = taskEl.querySelector('.task-issues')?.value || '';
        const plan = taskEl.querySelector('.task-plan')?.value || '';
        
        if (work || issues || plan) {
          store.updateTaskReport(week, year, taskId, { work, issues, plan });
        }
      });
      
      alert('会议记录已保存！');
      this.renderMeeting();
    });
    
    Utils.$('#generateReportBtn')?.addEventListener('click', () => {
      this.showMeetingReport(week, year);
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
        if (taskReport.plan) {
          reportContent += `- 🎯 下周计划: ${taskReport.plan}\n`;
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
