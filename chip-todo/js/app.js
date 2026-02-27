class ChipTodoApp {
  constructor() {
    this.currentView = 'board';
    this.currentProject = null;
    this.currentMember = null;
    this.meetingWeek = null;
    this.meetingYear = null;
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
        <h1>🔬 芯片测试工作看板</h1>
      </header>
      
      <nav class="tabs">
        <button class="tab ${this.currentView === 'board' ? 'active' : ''}" data-view="board">📊 看板</button>
        <button class="tab ${this.currentView === 'projects' ? 'active' : ''}" data-view="projects">📁 项目</button>
        <button class="tab ${this.currentView === 'members' ? 'active' : ''}" data-view="members">👥 人员</button>
        <button class="tab ${this.currentView === 'meeting' ? 'active' : ''}" data-view="meeting">📅 会议</button>
        <button class="tab ${this.currentView === 'history' ? 'active' : ''}" data-view="history">📜 历史</button>
      </nav>
      
      <main class="main-content">
        <div id="boardView" class="view ${this.currentView === 'board' ? '' : 'hidden'}"></div>
        <div id="projectsView" class="view ${this.currentView === 'projects' ? '' : 'hidden'}"></div>
        <div id="membersView" class="view ${this.currentView === 'members' ? '' : 'hidden'}"></div>
        <div id="meetingView" class="view ${this.currentView === 'meeting' ? '' : 'hidden'}"></div>
        <div id="historyView" class="view ${this.currentView === 'history' ? '' : 'hidden'}"></div>
      </main>
      
      <footer class="footer">
        <div class="stats" id="stats"></div>
        <div class="actions">
          <button class="btn btn-secondary" id="exportBtn">📤 导出</button>
          <button class="btn btn-secondary" id="importBtn">📥 导入</button>
          <input type="file" id="importFile" accept=".json" style="display:none">
        </div>
      </footer>
    `;
    
    this.renderBoard();
    this.renderProjects();
    this.renderMembers();
    this.renderMeeting();
    this.renderHistory();
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
    statsEl.innerHTML = `
      <span>📊 ${stats.completed}/${stats.total} 任务完成</span>
      <span class="progress-bar">
        <span class="progress-fill" style="width: ${stats.progress}%"></span>
      </span>
      <span>${stats.progress}%</span>
      <span>👤 负责人: ${stats.membersWithTasks}人</span>
    `;
  }

  renderBoard() {
    const container = Utils.$('#boardView');
    const weekTasks = store.getTasksByWeek(store.data.currentWeek, store.data.currentYear);
    const projects = store.data.projects.filter(p => p.weekKey === store.getWeekKey(store.data.currentWeek, store.data.currentYear));
    const members = store.data.members;
    
    container.innerHTML = `
      <div class="board">
        <div class="sidebar">
          <h3>项目列表</h3>
          <div class="project-list" id="projectList">
            ${projects.map(p => this.renderProjectItem(p)).join('')}
          </div>
          <button class="btn btn-primary btn-block" id="addProjectBtn">+ 新建项目</button>
        </div>
        
        <div class="board-content">
          <h3>本周任务 - 甘特图视图</h3>
          ${weekTasks.length === 0 ? '<p class="empty">暂无任务</p>' : this.renderGantt(weekTasks, members, projects)}
        </div>
      </div>
    `;
    
    this.bindBoardEvents();
  }

  renderProjectItem(project) {
    const taskCount = store.getTasksByProject(project.id).length;
    const completedCount = store.getTasksByProject(project.id).filter(t => t.status === 'completed').length;
    const isActive = this.currentProject === project.id ? 'active' : '';
    
    return `
      <div class="project-item ${isActive}" data-id="${project.id}">
        <div class="project-name">${Utils.escapeHtml(project.name)}</div>
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
              const project = projects.find(p => p.id === task.projectId);
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
    const priorityEmoji = { low: '🔵', medium: '🟡', high: '🔴' };
    const priority = task.priority || 'medium';
    
    return `
      <div class="gantt-task ${statusClass}" data-id="${task.id}">
        <div class="task-info">
          <span class="task-project">${project ? Utils.escapeHtml(project.name) : '未指定项目'}</span>
          <span class="task-priority" title="优先级: ${priorityLabels[priority]}">${priorityEmoji[priority]}</span>
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
    Utils.$('#addProjectBtn').addEventListener('click', () => this.showProjectModal());
    
    Utils.$$('.project-item').forEach(item => {
      item.addEventListener('click', () => {
        this.currentProject = item.dataset.id;
        this.renderBoard();
        this.showProjectDetail(item.dataset.id);
      });
    });
    
    Utils.$$('.gantt-task').forEach(taskEl => {
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

  renderProjects() {
    const container = Utils.$('#projectsView');
    const weekProjects = store.data.projects.filter(p => p.weekKey === store.getWeekKey(store.data.currentWeek, store.data.currentYear));
    
    container.innerHTML = `
      <div class="projects-page">
        <div class="page-header">
          <h2>📁 项目管理</h2>
          <button class="btn btn-primary" id="newProjectBtn">+ 新建项目</button>
        </div>
        
        ${weekProjects.length === 0 ? '<p class="empty">暂无项目</p>' : ''}
        
        <div class="project-cards">
          ${weekProjects.map(p => this.renderProjectCard(p)).join('')}
        </div>
      </div>
    `;
    
    Utils.$('#newProjectBtn')?.addEventListener('click', () => this.showProjectModal());
    
    Utils.$$('.project-card').forEach(card => {
      card.querySelector('.view-btn')?.addEventListener('click', () => {
        this.showProjectDetail(card.dataset.id);
      });
    });
  }

  renderProjectCard(project) {
    const tasks = store.getTasksByProject(project.id);
    const members = store.getProjectMembers(project.id);
    const completed = tasks.filter(t => t.status === 'completed').length;
    
    return `
      <div class="project-card" data-id="${project.id}">
        <h3>${Utils.escapeHtml(project.name)}</h3>
        <p>${Utils.escapeHtml(project.description) || '暂无描述'}</p>
        <div class="project-card-meta">
          <span>📝 ${completed}/${tasks.length} 任务</span>
          <span>👥 ${members.length} 人</span>
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
    
    const modalContent = Utils.createElement('div', { class: 'project-detail-modal' });
    modalContent.innerHTML = `
      <div class="modal-header">
        <h2>${Utils.escapeHtml(project.name)}</h2>
        <button class="btn btn-icon close-btn">✕</button>
      </div>
      <p>${Utils.escapeHtml(project.description) || '暂无描述'}</p>
      
      <div class="project-detail-section">
        <h3>👥 参与人员</h3>
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
        <h3>📝 任务列表</h3>
        <button class="btn btn-primary btn-sm" id="addTaskToProject">+ 添加任务</button>
        <div class="task-list">
          ${tasks.length === 0 ? '<p>暂无任务</p>' : tasks.map(t => this.renderTaskItem(t)).join('')}
        </div>
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-danger" id="deleteProject">删除项目</button>
      </div>
    `;
    
    const overlay = Utils.showModal(modalContent);
    
    modalContent.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
    modalContent.querySelector('#addMemberToProject')?.addEventListener('click', () => this.showAddMemberToProject(projectId));
    modalContent.querySelector('#addTaskToProject')?.addEventListener('click', () => this.showTaskModal(null, projectId));
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
    const modalContent = Utils.createElement('div', { class: 'form-modal' });
    modalContent.innerHTML = `
      <h2>${isEdit ? '编辑项目' : '新建项目'}</h2>
      <form id="projectForm">
        <div class="form-group">
          <label>项目名称（芯片型号）</label>
          <input type="text" name="name" required value="${project ? Utils.escapeHtml(project.name) : ''}" placeholder="例如: A1芯片测试">
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
      
      if (isEdit) {
        store.updateTask(taskId, data);
      } else {
        store.addTask(data);
      }
      
      overlay.remove();
      this.render();
    });
  }

  renderMembers() {
    const container = Utils.$('#membersView');
    
    container.innerHTML = `
      <div class="members-page">
        <div class="page-header">
          <h2>👥 人员管理</h2>
          <button class="btn btn-primary" id="newMemberBtn">+ 添加成员</button>
        </div>
        
        ${store.data.members.length === 0 ? '<p class="empty">暂无成员</p>' : ''}
        
        <div class="member-cards">
          ${store.data.members.map(m => this.renderMemberCard(m)).join('')}
        </div>
      </div>
    `;
    
    Utils.$('#newMemberBtn')?.addEventListener('click', () => this.showMemberModal());
    
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
        <span class="role-badge">${Utils.escapeHtml(member.role)}</span>
        <p>本周任务: ${completed}/${memberTasks.length} 完成</p>
        <div class="member-actions">
          <button class="btn btn-secondary btn-sm edit-btn">编辑</button>
          <button class="btn btn-danger btn-sm delete-btn">删除</button>
        </div>
      </div>
    `;
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
          <input type="text" name="role" value="${member ? Utils.escapeHtml(member.role) : ''}" placeholder="例如: 测试工程师">
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
        role: formData.get('role'),
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
    // Use meeting state if set, otherwise use current week
    const week = this.meetingWeek || store.data.currentWeek;
    const year = this.meetingYear || store.data.currentYear;
    
    // Store current meeting week/year for persistence
    this.meetingWeek = week;
    this.meetingYear = year;
    
    const meeting = store.getMeeting(week, year);
    const members = store.data.members;
    const tasksByAssignee = store.getTasksByAssignee(week, year);
    
    const weekRange = Utils.getWeekRange(week, year);
    
    // Build attendee checkboxes
    const attendeeCheckboxes = members.map(m => `
      <label class="attendee-checkbox">
        <input type="checkbox" value="${m.id}" ${meeting?.attendees?.includes(m.id) ? 'checked' : ''}>
        <span class="member-avatar" style="background:${m.color}">${m.name[0]}</span>
        <span>${Utils.escapeHtml(m.name)}</span>
      </label>
    `).join('');
    
    // Build tasks by assignee
    let tasksHtml = '';
    Object.entries(tasksByAssignee).forEach(([assigneeId, tasks]) => {
      const member = members.find(m => m.id === assigneeId);
      const memberName = member ? member.name : '未分配';
      const memberRole = member ? member.role : '';
      const memberColor = member ? member.color : '#6B7280';
      
      const taskItems = tasks.map(task => {
        const project = store.data.projects.find(p => p.id === task.projectId);
        const projectName = project ? project.name : '未指定项目';
        const statusText = Utils.getStatusText(task.status);
        return `
          <div class="meeting-task-item">
            <span class="task-name">${Utils.escapeHtml(task.name)}</span>
            <span class="task-project">${Utils.escapeHtml(projectName)}</span>
            <span class="task-progress" style="color: ${this.getProgressColor(task.progress)}">${task.progress}%</span>
          </div>
        `;
      }).join('');
      
      tasksHtml += `
        <div class="meeting-member-group">
          <div class="meeting-member-header">
            <span class="member-avatar" style="background:${memberColor}">${memberName[0]}</span>
            <span class="member-name">${Utils.escapeHtml(memberName)}</span>
            <span class="member-role">${Utils.escapeHtml(memberRole)}</span>
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
    
    container.innerHTML = `
      <div class="meeting-page">
        <div class="page-header">
          <div class="week-nav">
            <button class="btn btn-icon" id="prevMeetingWeek">◀</button>
            <span class="current-week" id="meetingWeekDisplay">第${week}周 (${weekRange})</span>
            <button class="btn btn-icon" id="nextMeetingWeek">▶</button>
          </div>
          <div class="meeting-actions">
            <button class="btn btn-primary" id="saveMeetingBtn">💾 保存会议</button>
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
          <h3>📋 本周未完成任务 (${Object.values(tasksByAssignee).flat().length}项)</h3>
          <p class="meeting-hint">以下任务状态为"待处理"或"进行中"，"暂停"和"已完成"的任务不显示</p>
          <div class="meeting-tasks-list">
            ${tasksHtml}
          </div>
        </div>
      </div>
    `;
    
    // Bind save event
    Utils.$('#saveMeetingBtn')?.addEventListener('click', () => {
      const date = Utils.$('#meetingDate').value;
      const notes = Utils.$('#meetingNotes').value;
      const attendees = Array.from(Utils.$$('#meetingView input[type="checkbox"]:checked')).map(cb => cb.value);
      
      store.saveMeeting(week, year, { date, notes, attendees });
      alert('会议记录已保存！');
      this.renderMeeting();
    });
    
    // Bind week navigation
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
  }

  renderHistory() {
    const container = Utils.$('#historyView');
    const history = store.loadHistory();
    
    container.innerHTML = `
      <div class="history-page">
        <div class="page-header">
          <h2>📜 历史存档</h2>
          <button class="btn btn-primary" id="archiveWeekBtn">📦 存档本周</button>
        </div>
        
        ${history.length === 0 ? '<p class="empty">暂无历史记录</p>' : ''}
        
        <div class="history-list">
          ${history.map(h => this.renderHistoryItem(h)).join('')}
        </div>
      </div>
    `;
    
    Utils.$('#archiveWeekBtn')?.addEventListener('click', async () => {
      if (await Utils.confirm('确定要存档本周数据吗？存档后本周数据将移至历史记录。')) {
        store.archiveCurrentWeek();
        this.render();
      }
    });
  }

  renderHistoryItem(item) {
    const weekRange = Utils.getWeekRange(item.week, item.year);
    const completed = item.tasks.filter(t => t.status === 'completed').length;
    
    return `
      <div class="history-item">
        <div class="history-header">
          <h3>第${item.week}周 (${weekRange})</h3>
          <span>📝 ${completed}/${item.tasks.length} 任务完成</span>
        </div>
        <p>存档时间: ${Utils.formatDate(item.archivedAt)}</p>
        <div class="history-details">
          <span>📁 ${item.projects.length} 个项目</span>
          <span>👥 参与人员: ${new Set(item.tasks.map(t => t.assignee).filter(Boolean)).size}人</span>
        </div>
      </div>
    `;
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
