const STORAGE_KEY = 'chip_todo_data';
const HISTORY_KEY = 'chip_todo_history';
const MEETINGS_KEY = 'chip_todo_meetings';

const DEFAULT_DATA = {
  members: [],
  projects: [],
  tasks: [],
  currentWeek: 1,
  currentYear: 2026
};

class DataStore {
  constructor() {
    this.historyCache = null;
    this.meetingsCache = null;
    this.data = this.normalizeData(this.load());
  }

  clone(value) {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }

  normalizeData(raw) {
    const data = raw && typeof raw === 'object' ? raw : {};
    const current = this.getCurrentWeek();

    return {
      members: Array.isArray(data.members)
        ? data.members.map((member) => ({
          ...member,
          role: this.sanitizeName(member?.role) || '成员'
        }))
        : [],
      projects: Array.isArray(data.projects) ? data.projects : [],
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      currentWeek: Number.isInteger(data.currentWeek) ? data.currentWeek : current.week,
      currentYear: Number.isInteger(data.currentYear) ? data.currentYear : current.year
    };
  }

  sanitizeName(value) {
    return String(value || '').trim();
  }

  generateId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
    return this.clone(DEFAULT_DATA);
  }

  save() {
    this.data = this.normalizeData(this.data);
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
    const name = this.sanitizeName(member.name);
    if (!name) return null;

    const id = this.generateId('m');
    this.data.members.push({
      id,
      name,
      role: this.sanitizeName(member.role) || '成员',
      color: member.color || this.generateColor(),
      createdAt: new Date().toISOString()
    });
    this.save();
    return id;
  }

  updateMember(id, updates) {
    const index = this.data.members.findIndex(m => m.id === id);
    if (index !== -1) {
      const nextUpdates = { ...updates };
      if (nextUpdates.name !== undefined) {
        const name = this.sanitizeName(nextUpdates.name);
        if (!name) return;
        nextUpdates.name = name;
      }
      if (nextUpdates.role !== undefined) {
        nextUpdates.role = this.sanitizeName(nextUpdates.role) || '成员';
      }
      this.data.members[index] = { ...this.data.members[index], ...nextUpdates };
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
    const name = this.sanitizeName(project.name);
    if (!name) return null;

    const id = this.generateId('p');
    this.data.projects.push({
      id,
      name,
      description: project.description || '',
      members: project.members || [],
      status: project.status || 'not_started',
      weekKey: this.getWeekKey(this.data.currentWeek, this.data.currentYear),
      createdAt: new Date().toISOString()
    });
    this.save();
    return id;
  }

  updateProject(id, updates) {
    const index = this.data.projects.findIndex(p => p.id === id);
    if (index !== -1) {
      const nextUpdates = { ...updates };
      if (nextUpdates.name !== undefined) {
        const name = this.sanitizeName(nextUpdates.name);
        if (!name) return false;
        nextUpdates.name = name;
      }
      if (
        nextUpdates.status === 'completed' &&
        this.hasIncompleteProjectTasks(id)
      ) {
        return false;
      }
      this.data.projects[index] = { ...this.data.projects[index], ...nextUpdates };
      this.save();
      return true;
    }
    return false;
  }

  deleteProject(id) {
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    this.data.tasks = this.data.tasks.filter(t => t.projectId !== id);
    this.save();
  }

  addTask(task) {
    const name = this.sanitizeName(task.name);
    const project = this.getProject(task.projectId);
    if (!name || !project) return null;
    if (project.status === 'completed') return null;

    const id = this.generateId('t');
    const status = task.status || 'pending';
    let progress = task.progress !== undefined
      ? Math.min(100, Math.max(0, parseInt(task.progress, 10) || 0))
      : 0;

    if (status === 'completed') {
      progress = 100;
    } else if (status === 'pending') {
      progress = 0;
    } else if ((status === 'in_progress' || status === 'paused') && progress <= 0) {
      progress = 1;
    } else if ((status === 'in_progress' || status === 'paused') && progress >= 100) {
      progress = 99;
    }

    this.data.tasks.push({
      id,
      projectId: task.projectId,
      name,
      description: task.description || '',
      assignee: task.assignee || null,
      status,
      priority: task.priority || 'medium',
      progress,
      weekKey: this.getWeekKey(this.data.currentWeek, this.data.currentYear),
      createdAt: new Date().toISOString(),
      completedAt: progress >= 100 ? new Date().toISOString() : null
    });
    this.save();
    return id;
  }

  updateTask(id, updates) {
    const index = this.data.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;

    const task = this.data.tasks[index];
    const nextUpdates = { ...updates };
    const currentProject = this.getProject(task.projectId);

    if (nextUpdates.name !== undefined) {
      const name = this.sanitizeName(nextUpdates.name);
      if (!name) return false;
      nextUpdates.name = name;
    }

    if (nextUpdates.progress !== undefined) {
      nextUpdates.progress = Math.min(100, Math.max(0, parseInt(nextUpdates.progress, 10) || 0));
    }

    const targetProjectId = nextUpdates.projectId !== undefined
      ? nextUpdates.projectId
      : task.projectId;
    const targetProject = this.getProject(targetProjectId);
    if (!targetProject) return false;

    if (
      targetProject.status === 'completed' &&
      targetProjectId !== task.projectId
    ) {
      return false;
    }

    if (currentProject?.status === 'completed') {
      if (targetProjectId !== task.projectId) {
        return false;
      }
      if (
        nextUpdates.status !== undefined &&
        nextUpdates.status !== 'completed'
      ) {
        return false;
      }
      if (
        nextUpdates.progress !== undefined &&
        nextUpdates.progress < 100
      ) {
        return false;
      }
    }

    if (nextUpdates.status !== undefined && nextUpdates.status !== task.status) {
      if (nextUpdates.status === 'paused') {
        nextUpdates.pausedAt = new Date().toISOString();
        nextUpdates.completedAt = null;
        if (nextUpdates.progress === undefined) {
          const currentProgress = Math.min(99, Math.max(1, parseInt(task.progress, 10) || 1));
          nextUpdates.progress = currentProgress;
        }
      } else if (nextUpdates.status === 'completed') {
        nextUpdates.progress = 100;
        nextUpdates.completedAt = new Date().toISOString();
        nextUpdates.pausedAt = null;
      } else if (nextUpdates.status === 'pending') {
        nextUpdates.progress = 0;
        nextUpdates.completedAt = null;
        nextUpdates.pausedAt = null;
      } else if (nextUpdates.status === 'in_progress') {
        nextUpdates.completedAt = null;
        nextUpdates.pausedAt = null;
        if (nextUpdates.progress === undefined) {
          const currentProgress = parseInt(task.progress, 10) || 0;
          nextUpdates.progress = currentProgress <= 0 || currentProgress >= 100 ? 1 : currentProgress;
        } else if (nextUpdates.progress >= 100) {
          nextUpdates.progress = 99;
        }
      }
    }

    // Keep status and progress in sync when only progress is edited.
    if (nextUpdates.progress !== undefined && nextUpdates.status === undefined) {
      if (nextUpdates.progress >= 100 && task.status !== 'paused') {
        nextUpdates.status = 'completed';
        nextUpdates.completedAt = new Date().toISOString();
        nextUpdates.pausedAt = null;
      } else if (nextUpdates.progress > 0 && nextUpdates.progress < 100) {
        if (task.status === 'pending' || task.status === 'completed') {
          nextUpdates.status = 'in_progress';
        }
        if (task.status === 'completed') {
          nextUpdates.completedAt = null;
        }
      } else if (nextUpdates.progress === 0 && task.status !== 'paused') {
        nextUpdates.status = 'pending';
        nextUpdates.completedAt = null;
      }
    }

    this.data.tasks[index] = { ...task, ...nextUpdates };
    this.save();
    return true;
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

  getProject(projectId) {
    return this.data.projects.find(project => project.id === projectId) || null;
  }

  hasIncompleteProjectTasks(projectId) {
    return this.data.tasks.some(task => (
      task.projectId === projectId &&
      task.status !== 'completed'
    ));
  }

  getProjectMembers(projectId) {
    const assigneeIds = new Set(
      this.data.tasks
        .filter((task) => task.projectId === projectId && task.assignee)
        .map((task) => task.assignee)
    );
    return this.data.members.filter((member) => assigneeIds.has(member.id));
  }

  loadHistory() {
    if (this.historyCache) {
      return this.historyCache;
    }

    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.historyCache = Array.isArray(parsed) ? parsed : [];
        return this.historyCache;
      } catch (e) {
        this.historyCache = [];
        return this.historyCache;
      }
    }

    this.historyCache = [];
    return this.historyCache;
  }

  saveHistory(history) {
    this.historyCache = Array.isArray(history) ? history : [];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(this.historyCache));
  }

  archiveCurrentWeek() {
    const weekKey = this.getWeekKey(this.data.currentWeek, this.data.currentYear);
    const history = this.loadHistory();

    const weekData = {
      weekKey,
      week: this.data.currentWeek,
      year: this.data.currentYear,
      members: this.clone(this.data.members),
      projects: this.clone(this.data.projects.filter(p => p.weekKey === weekKey)),
      tasks: this.clone(this.data.tasks.filter(t => t.weekKey === weekKey)),
      archivedAt: new Date().toISOString()
    };

    history.push(weekData);
    this.saveHistory(history);

    this.data.tasks = this.data.tasks.filter(t => t.weekKey !== weekKey);
    this.data.projects = this.data.projects.filter(p => p.weekKey !== weekKey);
    this.save();
  }

  exportData() {
    return JSON.stringify({
      version: 2,
      data: this.clone(this.data),
      history: this.clone(this.loadHistory()),
      meetings: this.clone(this.getMeetings()),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  importData(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (!imported || typeof imported !== 'object') {
        return false;
      }

      const importedData = imported.data || imported;
      this.data = this.normalizeData(importedData);
      this.save();

      this.saveHistory(Array.isArray(imported.history) ? imported.history : []);
      this.saveMeetings(Array.isArray(imported.meetings) ? imported.meetings : []);
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

  // Meeting Records
  getMeetings() {
    if (this.meetingsCache) {
      return this.meetingsCache;
    }

    const stored = localStorage.getItem(MEETINGS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.meetingsCache = Array.isArray(parsed) ? parsed : [];
        return this.meetingsCache;
      } catch (e) {
        this.meetingsCache = [];
        return this.meetingsCache;
      }
    }

    this.meetingsCache = [];
    return this.meetingsCache;
  }

  saveMeetings(meetings) {
    this.meetingsCache = Array.isArray(meetings) ? meetings : [];
    localStorage.setItem(MEETINGS_KEY, JSON.stringify(this.meetingsCache));
  }

  getMeeting(week, year) {
    const meetings = this.getMeetings();
    const weekKey = this.getWeekKey(week, year);
    return meetings.find(m => m.weekKey === weekKey) || null;
  }

  saveMeeting(week, year, data) {
    const meetings = this.getMeetings();
    const weekKey = this.getWeekKey(week, year);
    const existingIndex = meetings.findIndex(m => m.weekKey === weekKey);

    const existingMeeting = existingIndex >= 0 ? meetings[existingIndex] : null;

    const meeting = {
      weekKey,
      week,
      year,
      date: data.date || new Date().toISOString().split('T')[0],
      attendees: data.attendees || [],
      notes: data.notes || '',
      taskReports: this.clone(existingMeeting?.taskReports || {}),
      createdAt: existingMeeting?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      meetings[existingIndex] = meeting;
    } else {
      meetings.push(meeting);
    }

    this.saveMeetings(meetings);
    return meeting;
  }

  updateTaskReport(week, year, taskId, report) {
    const meetings = this.getMeetings();
    const weekKey = this.getWeekKey(week, year);
    const existingIndex = meetings.findIndex(m => m.weekKey === weekKey);

    if (existingIndex >= 0) {
      const taskReports = meetings[existingIndex].taskReports || {};
      const normalizedReport = {
        work: report.work || '',
        issues: report.issues || '',
        plan: report.plan || ''
      };
      const hasContent = Object.values(normalizedReport).some(Boolean);

      if (hasContent) {
        taskReports[taskId] = {
          ...normalizedReport,
          updatedAt: new Date().toISOString()
        };
      } else {
        delete taskReports[taskId];
      }

      meetings[existingIndex].taskReports = taskReports;
      meetings[existingIndex].updatedAt = new Date().toISOString();
      this.saveMeetings(meetings);
    }
  }

  getMeetingsList() {
    const meetings = [...this.getMeetings()];
    return meetings
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.week - a.week;
      })
      .map(m => ({
        weekKey: m.weekKey,
        week: m.week,
        year: m.year,
        date: m.date,
        notes: m.notes?.substring(0, 50) || '',
        attendeeCount: m.attendees?.length || 0
      }));
  }

  // Get tasks excluding completed and paused
  getActiveTasks(week, year) {
    const weekKey = this.getWeekKey(week, year);
    return this.data.tasks.filter(t =>
      t.weekKey === weekKey &&
      t.status !== 'completed' &&
      t.status !== 'paused'
    );
  }

  // Get tasks grouped by assignee
  getTasksByAssignee(week, year) {
    const tasks = this.getActiveTasks(week, year);
    const grouped = {};

    tasks.forEach(task => {
      const assigneeId = task.assignee || 'unassigned';
      if (!grouped[assigneeId]) {
        grouped[assigneeId] = [];
      }
      grouped[assigneeId].push(task);
    });

    return grouped;
  }
}

const store = new DataStore();
window.store = store;
