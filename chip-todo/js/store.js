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
      status: project.status || 'in_progress',
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
    const status = task.status || 'in_progress';
    let progress = task.progress !== undefined
      ? Math.min(100, Math.max(0, parseInt(task.progress, 10) || 0))
      : 0;

    if (status === 'completed') {
      progress = 100;
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
        if (task.status === 'completed') {
          nextUpdates.status = 'in_progress';
          nextUpdates.completedAt = null;
        }
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

  createMeetingTaskSnapshot(task) {
    const project = this.getProject(task.projectId);
    const member = this.data.members.find((item) => item.id === task.assignee) || null;

    return {
      id: task.id,
      projectId: task.projectId,
      projectName: project ? project.name : '未指定项目',
      name: task.name,
      assignee: task.assignee || '',
      assigneeName: member ? member.name : '未分配',
      priority: task.priority || 'medium',
      progress: Number.isFinite(task.progress) ? task.progress : 0,
      status: task.status || 'in_progress'
    };
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
    const notStarted = weekTasks.filter(t => !t.progress || t.progress === 0).length;

    const membersWithTasks = new Set(weekTasks.map(t => t.assignee).filter(Boolean)).size;
    const totalProgress = total > 0 ? Math.round(weekTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / total) : 0;

    return {
      total,
      completed,
      inProgress,
      notStarted,
      progress: totalProgress,
      membersWithTasks
    };
  }

  // Meeting Records
  normalizeMeetingDateTime(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  }

  normalizeMeetingTask(task) {
    if (!task || !task.id) return null;

    const storedTask = this.data.tasks.find((item) => item.id === task.id) || null;
    const project = storedTask ? this.getProject(storedTask.projectId) : this.getProject(task.projectId);
    const member = this.data.members.find((item) => item.id === (task.assignee || storedTask?.assignee)) || null;
    const parsedProgress = parseInt(task.progress, 10);
    const progress = Number.isFinite(parsedProgress)
      ? Math.min(100, Math.max(0, parsedProgress))
      : (storedTask?.progress || 0);

    return {
      id: task.id,
      projectId: task.projectId || storedTask?.projectId || '',
      projectName: task.projectName || project?.name || '\u672a\u547d\u540d\u4efb\u52a1',
      name: this.sanitizeName(task.name || storedTask?.name || '\u672a\u547d\u540d\u4efb\u52a1') || '\u672a\u547d\u540d\u4efb\u52a1',
      assignee: task.assignee || storedTask?.assignee || '',
      assigneeName: task.assigneeName || member?.name || '\u672a\u5206\u914d',
      priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : (storedTask?.priority || 'medium'),
      progress,
      status: task.status || storedTask?.status || (progress >= 100 ? 'completed' : 'in_progress')
    };
  }

  normalizeMeetingRecord(meeting, index = 0) {
    const createdAt = this.normalizeMeetingDateTime(
      meeting?.createdAt || meeting?.scheduledAt || meeting?.date || meeting?.updatedAt
    );
    const updatedAt = this.normalizeMeetingDateTime(meeting?.updatedAt || createdAt);
    const fallbackTasks = Object.keys(meeting?.taskReports || {})
      .map((taskId) => {
        const task = this.data.tasks.find((item) => item.id === taskId);
        return task ? this.createMeetingTaskSnapshot(task) : null;
      })
      .filter(Boolean);
    const tasks = (Array.isArray(meeting?.tasks) && meeting.tasks.length > 0
      ? meeting.tasks
      : fallbackTasks)
      .map((task) => this.normalizeMeetingTask(task))
      .filter(Boolean);
    const attendees = Array.isArray(meeting?.attendees)
      ? Array.from(new Set(meeting.attendees.filter(Boolean)))
      : [];
    const taskReports = Object.entries(meeting?.taskReports || {}).reduce((acc, [taskId, report]) => {
      acc[taskId] = {
        work: String(report?.work || ''),
        issues: String(report?.issues || ''),
        plan: String(report?.plan || ''),
        updatedAt: this.normalizeMeetingDateTime(report?.updatedAt || updatedAt)
      };
      return acc;
    }, {});

    return {
      id: meeting?.id || meeting?.weekKey || this.generateId('mtg_' + index),
      title: this.sanitizeName(meeting?.title || meeting?.subject || '\u5468\u4f1a') || '\u5468\u4f1a',
      attendees,
      notes: String(meeting?.notes || ''),
      taskReports,
      tasks,
      createdAt,
      updatedAt
    };
  }

  getMeetings() {
    if (this.meetingsCache) {
      return this.meetingsCache;
    }

    const stored = localStorage.getItem(MEETINGS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const meetings = Array.isArray(parsed) ? parsed : [];
        this.meetingsCache = meetings.map((meeting, index) => this.normalizeMeetingRecord(meeting, index));
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
    const normalizedMeetings = (Array.isArray(meetings) ? meetings : [])
      .map((meeting, index) => this.normalizeMeetingRecord(meeting, index))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    this.meetingsCache = normalizedMeetings;
    localStorage.setItem(MEETINGS_KEY, JSON.stringify(this.meetingsCache));
  }

  getMeeting(id) {
    if (!id) return null;
    return this.getMeetings().find((meeting) => meeting.id === id) || null;
  }

  saveMeeting(data) {
    const meetings = this.getMeetings();
    const existingIndex = data?.id ? meetings.findIndex((meeting) => meeting.id === data.id) : -1;
    const existingMeeting = existingIndex >= 0 ? meetings[existingIndex] : null;
    const now = new Date().toISOString();
    const meeting = this.normalizeMeetingRecord({
      ...existingMeeting,
      ...data,
      id: existingMeeting?.id || data?.id || this.generateId('mtg'),
      createdAt: existingMeeting?.createdAt || data?.createdAt || now,
      updatedAt: now
    });

    if (existingIndex >= 0) {
      meetings[existingIndex] = meeting;
    } else {
      meetings.push(meeting);
    }

    this.saveMeetings(meetings);
    return meeting;
  }

  deleteMeeting(id) {
    const meetings = this.getMeetings().filter((meeting) => meeting.id !== id);
    this.saveMeetings(meetings);
  }

  updateTaskReport(meetingId, taskId, report) {
    const meeting = this.getMeeting(meetingId);
    if (!meeting) return null;

    const taskReports = this.clone(meeting.taskReports || {});
    const normalizedReport = {
      work: String(report?.work || ''),
      issues: String(report?.issues || ''),
      plan: String(report?.plan || '')
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

    return this.saveMeeting({
      ...meeting,
      taskReports
    });
  }

  searchMeetings(filters = '') {
    const normalizedFilters = typeof filters === 'string'
      ? { query: filters, startDate: '', endDate: '' }
      : (filters || {});
    const normalizedQuery = String(normalizedFilters.query || '').trim().toLowerCase();
    const startDate = normalizedFilters.startDate || '';
    const endDate = normalizedFilters.endDate || '';
    const startBoundary = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const endBoundary = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
    const meetings = [...this.getMeetings()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return meetings.filter((meeting) => {
      const attendeeNames = meeting.attendees
        .map((attendeeId) => this.data.members.find((member) => member.id === attendeeId)?.name || '')
        .join(' ');
      const haystack = [
        meeting.title,
        meeting.notes,
        attendeeNames,
        meeting.createdAt,
        meeting.updatedAt
      ].join(' ').toLowerCase();
      const meetingCreatedAt = new Date(meeting.createdAt);
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesStart = !startBoundary || meetingCreatedAt >= startBoundary;
      const matchesEnd = !endBoundary || meetingCreatedAt <= endBoundary;
      return matchesQuery && matchesStart && matchesEnd;
    });
  }

  getMeetingsList(filters = '') {
    return this.searchMeetings(filters).map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
      notes: meeting.notes?.substring(0, 60) || '',
      attendeeCount: meeting.attendees?.length || 0,
      taskCount: meeting.tasks?.length || 0,
      attendeeNames: meeting.attendees
        .map((attendeeId) => this.data.members.find((member) => member.id === attendeeId)?.name || '\u672a\u77e5\u6210\u5458')
    }));
  }

  getMeetingTasks(meetingId) {
    const meeting = this.getMeeting(meetingId);
    if (!meeting) return [];
    return this.clone(meeting.tasks || []);
  }

  groupMeetingTasksByAssignee(tasks) {
    return (Array.isArray(tasks) ? tasks : []).reduce((grouped, task) => {
      const assigneeId = task.assignee || 'unassigned';
      if (!grouped[assigneeId]) {
        grouped[assigneeId] = [];
      }
      grouped[assigneeId].push(this.normalizeMeetingTask(task));
      return grouped;
    }, {});
  }

  getMeetingTasksByAssignee(meetingId) {
    return this.groupMeetingTasksByAssignee(this.getMeetingTasks(meetingId));
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

  // Get all unfinished tasks for a specific member
  getUnfinishedTasksByMember(memberId) {
    return this.data.tasks.filter(t =>
      t.assignee === memberId &&
      t.status !== 'completed' &&
      t.status !== 'paused'
    );
  }
}

const store = new DataStore();
window.store = store;

