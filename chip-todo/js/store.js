const STORAGE_KEY = 'chip_todo_data';
const HISTORY_KEY = 'chip_todo_history';

const DEFAULT_DATA = {
  members: [],
  projects: [],
  tasks: [],
  currentWeek: 1,
  currentYear: 2026
};

class DataStore {
  constructor() {
    this.data = this.load();
  }

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

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  getWeekKey(week, year) {
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  getCurrentWeek() {
    return Utils.getISOWeek();
  }

  setCurrentWeek(week, year) {
    this.data.currentWeek = week;
    this.data.currentYear = year;
    this.save();
  }

  addMember(member) {
    const id = 'm_' + Date.now();
    this.data.members.push({
      id,
      name: member.name,
      role: member.role || '成员',
      color: member.color || this.generateColor(),
      createdAt: new Date().toISOString()
    });
    this.save();
    return id;
  }

  updateMember(id, updates) {
    const index = this.data.members.findIndex(m => m.id === id);
    if (index !== -1) {
      this.data.members[index] = { ...this.data.members[index], ...updates };
      this.save();
    }
  }

  deleteMember(id) {
    this.data.members = this.data.members.filter(m => m.id !== id);
    this.data.tasks.forEach(task => {
      if (task.assignee === id) {
        task.assignee = null;
      }
    });
    this.save();
  }

  addProject(project) {
    const id = 'p_' + Date.now();
    this.data.projects.push({
      id,
      name: project.name,
      description: project.description || '',
      members: project.members || [],
      weekKey: this.getWeekKey(this.data.currentWeek, this.data.currentYear),
      createdAt: new Date().toISOString()
    });
    this.save();
    return id;
  }

  updateProject(id, updates) {
    const index = this.data.projects.findIndex(p => p.id === id);
    if (index !== -1) {
      this.data.projects[index] = { ...this.data.projects[index], ...updates };
      this.save();
    }
  }

  deleteProject(id) {
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    this.data.tasks = this.data.tasks.filter(t => t.projectId !== id);
    this.save();
  }

  addTask(task) {
    const id = 't_' + Date.now();
    this.data.tasks.push({
      id,
      projectId: task.projectId,
      name: task.name,
      description: task.description || '',
      assignee: task.assignee || null,
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      progress: task.progress !== undefined ? task.progress : 0,
      weekKey: this.getWeekKey(this.data.currentWeek, this.data.currentYear),
      createdAt: new Date().toISOString(),
      completedAt: null
    });
    this.save();
    return id;
  }

  updateTask(id, updates) {
    const index = this.data.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      const task = this.data.tasks[index];
      if (updates.progress !== undefined) {
        updates.progress = Math.min(100, Math.max(0, parseInt(updates.progress) || 0));
        if (updates.progress >= 100 && task.status !== 'completed') {
          updates.status = 'completed';
          updates.completedAt = new Date().toISOString();
        } else if (updates.progress > 0 && updates.progress < 100 && task.status === 'pending') {
          updates.status = 'in_progress';
        } else if (updates.progress === 0 && task.status === 'completed') {
          updates.status = 'pending';
          updates.completedAt = null;
        }
      }
      this.data.tasks[index] = { ...task, ...updates };
      this.save();
    }
  }

  deleteTask(id) {
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this.save();
  }

  getTasksByWeek(week, year) {
    const weekKey = this.getWeekKey(week, year);
    return this.data.tasks.filter(t => t.weekKey === weekKey);
  }

  getTasksByProject(projectId) {
    return this.data.tasks.filter(t => t.projectId === projectId);
  }

  getTasksByMember(memberId) {
    return this.data.tasks.filter(t => t.assignee === memberId);
  }

  getProjectMembers(projectId) {
    const project = this.data.projects.find(p => p.id === projectId);
    if (!project) return [];
    return this.data.members.filter(m => project.members.includes(m.id));
  }

  archiveCurrentWeek() {
    const weekKey = this.getWeekKey(this.data.currentWeek, this.data.currentYear);
    const history = this.loadHistory();
    
    const weekData = {
      weekKey,
      week: this.data.currentWeek,
      year: this.data.currentYear,
      members: this.data.members,
      projects: this.data.projects.filter(p => p.weekKey === weekKey),
      tasks: this.data.tasks.filter(t => t.weekKey === weekKey),
      archivedAt: new Date().toISOString()
    };
    
    history.push(weekData);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    
    this.data.tasks = this.data.tasks.filter(t => t.weekKey !== weekKey);
    this.data.projects = this.data.projects.filter(p => p.weekKey !== weekKey);
    this.save();
  }

  loadHistory() {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  exportData() {
    return JSON.stringify({
      data: this.data,
      history: this.loadHistory(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  importData(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (imported.data) {
        this.data = imported.data;
        this.save();
      }
      if (imported.history) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(imported.history));
      }
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  generateColor() {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
      '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getStats(week, year) {
    const weekTasks = this.getTasksByWeek(week, year);
    const total = weekTasks.length;
    const completed = weekTasks.filter(t => t.progress >= 100).length;
    const inProgress = weekTasks.filter(t => t.progress > 0 && t.progress < 100).length;
    const pending = weekTasks.filter(t => !t.progress || t.progress === 0).length;
    
    const membersWithTasks = new Set(weekTasks.map(t => t.assignee).filter(Boolean)).size;
    
    const totalProgress = total > 0 ? Math.round(weekTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / total) : 0;
    
    return {
      total,
      completed,
      inProgress,
      pending,
      progress: totalProgress,
      membersWithTasks
    };
  }
}

const store = new DataStore();
