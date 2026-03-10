const fs = require('fs');
const { test, expect } = require('@playwright/test');

test.describe('Chip Todo App', () => {
  async function openManagement(page) {
    await page.click('.tab[data-view="management"]');
  }

  async function createProject(page, name, status = 'in_progress') {
    await openManagement(page);
    await page.click('#newProjectBtn');
    await page.fill('input[name="name"]', name);
    await page.selectOption('select[name="status"]', status);
    await page.click('#projectForm button[type="submit"]');
  }

  async function createMember(page, name, role = '\u6210\u5458') {
    await openManagement(page);
    await page.click('#newMemberBtn');
    await page.fill('#memberForm input[name="name"]', name);
    await page.fill('#memberForm input[name="role"]', role);
    await page.click('#memberForm button[type="submit"]');
  }

  async function openProjectDetail(page, name) {
    const card = page.locator('.project-card').filter({ hasText: name }).first();
    await card.locator('.view-btn').click();
    await expect(page.locator('.project-detail-modal h2')).toContainText(name);
  }

  async function addTaskFromProjectDetail(page, name, options = {}) {
    await page.click('#addTaskToProject');
    await page.fill('input[name="name"]', name);
    if (options.projectName) {
      await page.selectOption('select[name="projectId"]', { label: options.projectName });
    }
    if (options.assigneeName) {
      await page.selectOption('select[name="assignee"]', { label: options.assigneeName });
    }
    if (options.status) {
      await page.selectOption('select[name="status"]', options.status);
    }
    if (options.progress !== undefined) {
      await page.locator('#progressSlider').fill(String(options.progress));
    }
    await page.click('#taskForm button[type="submit"]');
  }

  async function confirmModal(page) {
    await page.waitForSelector('.confirm-modal');
    await page.click('.confirm-modal [data-action="confirm"]');
  }

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', error => console.log(`[Browser Error]: ${error}`));
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should load main page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle("\u{1F52C} \u82AF\u7247\u6D4B\u8BD5\u5DE5\u4F5C\u770B\u677F");
  });

  test('should display all tabs', async ({ page }) => {
    await expect(page.locator('.tab').filter({ hasText: '\u770B\u677F' })).toBeVisible();
    await expect(page.locator('.tab').filter({ hasText: '\u7BA1\u7406' })).toBeVisible();
    await expect(page.locator('.tab').filter({ hasText: '\u4F1A\u8BAE' })).toBeVisible();
  });

  test('should show board view by default', async ({ page }) => {
    await expect(page.locator('#boardView')).toBeVisible();
    await expect(page.locator('#managementView')).toHaveClass(/hidden/);
    await expect(page.locator('#meetingView')).toHaveClass(/hidden/);
  });

  test('should open task details in read-only mode from the board', async ({ page }) => {
    await createProject(page, 'Board Readonly Project');
    await openProjectDetail(page, 'Board Readonly Project');
    await addTaskFromProjectDetail(page, 'Board Readonly Task', { progress: 35 });

    await page.click('.project-detail-modal .close-btn');
    await page.click('.tab[data-view="board"]');
    await page.locator('.gantt-task', { hasText: 'Board Readonly Task' }).click();

    await expect(page.locator('.task-detail-view')).toBeVisible();
    await expect(page.locator('.task-detail-view')).toContainText('Board Readonly Task');
    await expect(page.locator('#taskForm')).toHaveCount(0);
  });

  test('should navigate to management tab', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await expect(page.locator('#managementView')).toBeVisible();
    await expect(page.locator('#boardView')).toHaveClass(/hidden/);
    await expect(page.locator('#meetingView')).toHaveClass(/hidden/);
  });

  test('should navigate to meeting tab', async ({ page }) => {
    await page.click('.tab[data-view="meeting"]');
    await expect(page.locator('#meetingView')).toBeVisible();
    await expect(page.locator('#boardView')).toHaveClass(/hidden/);
    await expect(page.locator('#managementView')).toHaveClass(/hidden/);
  });

  test('should display management page with projects and members sections', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await expect(page.locator('h2').filter({ hasText: '\u9879\u76EE\u7BA1\u7406' })).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: '\u4EBA\u5458\u7BA1\u7406' })).toBeVisible();
  });

  test('should have add project and member buttons', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await expect(page.locator('#newProjectBtn')).toBeVisible();
    await expect(page.locator('#newMemberBtn')).toBeVisible();
  });

  test('should add new project', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await page.click('#newProjectBtn');
    
    await expect(page.locator('h2').filter({ hasText: '\u65B0\u5EFA\u9879\u76EE' })).toBeVisible();
    
    await page.fill('input[name="name"]', 'Test Project');
    await page.click('#projectForm button[type="submit"]');
    
    await expect(page.locator('.project-card')).toContainText('Test Project');
  });

  test('should add new member', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await page.click('#newMemberBtn');
    
    await expect(page.locator('h2').filter({ hasText: '\u6DFB\u52A0\u6210\u5458' })).toBeVisible();
    
    await page.fill('input[name="name"]', '寮犱笁');
    await page.click('#memberForm button[type="submit"]');
    
    await page.waitForTimeout(500);
    await expect(page.locator('.member-cards .member-card')).toContainText('寮犱笁');
  });

  test('should delete member', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await page.click('#newMemberBtn');
    await page.fill('input[name="name"]', '娴嬭瘯鎴愬憳');
    await page.click('#memberForm button[type="submit"]');
    
    await page.waitForTimeout(500);
    const memberCard = page.locator('.member-cards .member-card');
    await expect(memberCard).toContainText('娴嬭瘯鎴愬憳');
    
    await memberCard.locator('.delete-btn').click();
    await page.waitForSelector('.confirm-modal');
    await page.click('.confirm-modal .btn-danger[data-action="confirm"]');
    await page.waitForTimeout(500);
    
    await expect(page.locator('.management-section').nth(1)).toContainText('\u6682\u65E0\u6210\u5458');
  });

  test('should show empty state for projects', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await expect(page.locator('.management-section').first()).toContainText('\u6682\u65E0\u9879\u76EE');
  });

  test('should show empty state for members', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    const sections = page.locator('.management-section');
    await expect(sections.nth(1)).toContainText('\u6682\u65E0\u6210\u5458');
  });

  test('should show project detail modal', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await page.click('#newProjectBtn');
    await page.fill('input[name="name"]', '娴嬭瘯椤圭洰');
    await page.click('#projectForm button[type="submit"]');
    
    await page.click('.project-card .view-btn');
    await expect(page.locator('.project-detail-modal')).toBeVisible();
    await expect(page.locator('.project-detail-modal h2')).toContainText('娴嬭瘯椤圭洰');
  });

  test('should close modal on X button', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await page.click('#newProjectBtn');
    await page.fill('input[name="name"]', '娴嬭瘯椤圭洰');
    await page.click('#projectForm button[type="submit"]');
    
    await page.click('.project-card .view-btn');
    await expect(page.locator('.project-detail-modal')).toBeVisible();
    
    await page.click('.project-detail-modal .close-btn');
    await expect(page.locator('.project-detail-modal')).not.toBeVisible();
  });

  test('should export and import data', async ({ page }) => {
    const exportBtn = page.locator('#exportBtn');
    await expect(exportBtn).toBeVisible();
    
    const importBtn = page.locator('#importBtn');
    await expect(importBtn).toBeVisible();
  });

  test('should display stats in footer', async ({ page }) => {
    await expect(page.locator('#stats')).toBeVisible();
    await expect(page.locator('#stats')).toContainText('\u4EFB\u52A1\u5B8C\u6210');
  });

  test('should prevent completing a project with unfinished tasks', async ({ page }) => {
    await createProject(page, 'Alpha Project');
    await openProjectDetail(page, 'Alpha Project');
    await addTaskFromProjectDetail(page, 'Unfinished Task');

    await page.selectOption('#projectStatusSelect', 'completed');

    await expect(page.locator('#projectStatusSelect')).toHaveValue('in_progress');
    await expect(page.locator('#addTaskToProject')).toBeEnabled();
  });

  test('should return to the new project detail after moving a task', async ({ page }) => {
    await createProject(page, 'Project A');
    await createProject(page, 'Project B');

    await openProjectDetail(page, 'Project A');
    await addTaskFromProjectDetail(page, '杩佺Щ浠诲姟');

    await page.locator('.task-item').filter({ hasText: '杩佺Щ浠诲姟' }).click();
    await expect(page.locator('h2').filter({ hasText: '\u7F16\u8F91\u4EFB\u52A1' })).toBeVisible();
    await page.selectOption('select[name="projectId"]', { label: 'Project B' });
    await page.click('#taskForm button[type="submit"]');

    await expect(page.locator('.project-detail-modal h2')).toContainText('Project B');
    await expect(page.locator('.project-detail-modal .task-list')).toContainText('杩佺Щ浠诲姟');
  });

  test('should default the meeting title to ?? and record exact creation time', async ({ page }) => {
    await page.click('.tab[data-view="meeting"]');

    await expect(page.locator('#meetingTitle')).toHaveValue('\u5468\u4F1A');
    await expect(page.locator('#meetingCreatedAt')).toHaveValue(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);

    await page.fill('#meetingTitle', 'Project Sync');
    await page.click('#saveMeetingBtn');
    await confirmModal(page);

    const meetings = await page.evaluate(() => JSON.parse(localStorage.getItem('chip_todo_meetings') || '[]'));
    expect(meetings).toHaveLength(1);
    expect(meetings[0].title).toBe('Project Sync');
    expect(meetings[0].createdAt).toMatch(/T\d{2}:\d{2}:\d{2}/);
  });

  test('should import attendees and only show unfinished tasks for task import', async ({ page }) => {
    await createProject(page, 'Meeting Import Project');
    await createMember(page, '寮犱笁');

    await openProjectDetail(page, 'Meeting Import Project');
    await addTaskFromProjectDetail(page, 'Open Task', { assigneeName: '寮犱笁' });
    await addTaskFromProjectDetail(page, 'Done Task', { assigneeName: '寮犱笁', status: 'completed' });

    await page.click('.project-detail-modal .close-btn');
    await page.click('.tab[data-view="meeting"]');
    await page.click('#importAttendeesBtn');
    await page.locator('.member-select-item', { hasText: '寮犱笁' }).locator('input').check();
    await page.click('.meeting-selector-modal .confirm-btn');

    await expect(page.locator('.meeting-attendee-cards')).toContainText('寮犱笁');

    await page.locator('.meeting-member-group', { hasText: '寮犱笁' }).locator('.import-task-btn').click();
    await expect(page.locator('.task-select-list')).toContainText('Open Task');
    await expect(page.locator('.task-select-list')).not.toContainText('Done Task');

    await page.locator('.task-select-item', { hasText: 'Open Task' }).locator('input').check();
    await page.click('.meeting-selector-modal .confirm-btn');

    await expect(page.locator('.meeting-tasks-list')).toContainText('Open Task');
    await expect(page.locator('.meeting-tasks-list')).not.toContainText('Done Task');
  });

  test('should save meeting progress updates back to the task and record notes', async ({ page }) => {
    await createProject(page, 'Progress Meeting Project');
    await createMember(page, '鏉庡洓');

    await openProjectDetail(page, 'Progress Meeting Project');
    await addTaskFromProjectDetail(page, 'Tracked Task', { assigneeName: '鏉庡洓', progress: 20 });

    await page.click('.project-detail-modal .close-btn');
    await page.click('.tab[data-view="meeting"]');
    await page.click('#importAttendeesBtn');
    await page.locator('.member-select-item', { hasText: '鏉庡洓' }).locator('input').check();
    await page.click('.meeting-selector-modal .confirm-btn');
    await page.locator('.meeting-member-group', { hasText: '鏉庡洓' }).locator('.import-task-btn').click();
    await page.locator('.task-select-item', { hasText: 'Tracked Task' }).locator('input').check();
    await page.click('.meeting-selector-modal .confirm-btn');

    await page.locator('.meeting-task-item .task-progress-input').fill('80');
    await page.fill('.meeting-task-item .task-work', 'Progress captured in meeting');
    await page.fill('#meetingNotes', 'Need to follow up tomorrow');
    await page.click('#saveMeetingBtn');
    await confirmModal(page);

    const state = await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('chip_todo_data') || '{}');
      const meetings = JSON.parse(localStorage.getItem('chip_todo_meetings') || '[]');
      return { data, meetings };
    });

    const trackedTask = state.data.tasks.find(task => task.name === 'Tracked Task');
    expect(trackedTask.progress).toBe(80);
    expect(state.meetings[0].notes).toBe('Need to follow up tomorrow');
    expect(Object.values(state.meetings[0].taskReports)[0].work).toBe('Progress captured in meeting');

    await page.click('.tab[data-view="board"]');
    await expect(page.locator('.gantt-task', { hasText: 'Tracked Task' })).toContainText('80%');

    await openManagement(page);
    await openProjectDetail(page, 'Progress Meeting Project');
    await expect(page.locator('.project-detail-modal .task-list')).toContainText('80%');
  });

  test('should create new meetings and query saved meetings by keyword', async ({ page }) => {
    await page.click('.tab[data-view="meeting"]');
    await page.fill('#meetingTitle', 'Weekly Sync');
    await page.click('#saveMeetingBtn');
    await confirmModal(page);

    await page.click('#newMeetingBtn');
    await expect(page.locator('#meetingTitle')).toHaveValue('\u5468\u4F1A');
    await page.fill('#meetingTitle', 'Issue Review');
    await page.fill('#meetingNotes', 'Focus on blockers');
    await page.click('#saveMeetingBtn');
    await confirmModal(page);

    await page.fill('#meetingSearchInput', 'Review');
    await page.click('#meetingSearchForm button[type="submit"]');

    await expect(page.locator('.meeting-history-list')).toContainText('Issue Review');
    await expect(page.locator('.meeting-history-list')).not.toContainText('Weekly Sync');

    await page.fill('#meetingSearchInput', '');
    await page.click('#meetingSearchForm button[type="submit"]');
    await expect(page.locator('.meeting-history-list')).toContainText('Weekly Sync');
    await expect(page.locator('.meeting-history-list')).toContainText('Issue Review');
  });

  test('should save the current meeting before creating a new one', async ({ page }) => {
    await page.click('.tab[data-view="meeting"]');
    await page.fill('#meetingTitle', 'Draft Meeting');
    await page.fill('#meetingNotes', 'Need save reminder');

    await page.click('#newMeetingBtn');
    await expect(page.locator('.confirm-modal')).toBeVisible();
    await confirmModal(page);

    await expect(page.locator('#meetingTitle')).toHaveValue('\u5468\u4f1a');
    await expect(page.locator('.meeting-history-list')).toContainText('Draft Meeting');

    const meetings = await page.evaluate(() => JSON.parse(localStorage.getItem('chip_todo_meetings') || '[]'));
    expect(meetings).toHaveLength(1);
    expect(meetings[0].title).toBe('Draft Meeting');
  });

  test('should delete a saved meeting from the history list', async ({ page }) => {
    await page.click('.tab[data-view="meeting"]');
    await page.fill('#meetingTitle', 'Disposable Meeting');
    await page.click('#saveMeetingBtn');
    await confirmModal(page);

    await expect(page.locator('.meeting-history-list')).toContainText('Disposable Meeting');

    await page.click('#deleteMeetingBtn');
    await page.waitForSelector('.confirm-modal');
    await page.click('.confirm-modal .btn-danger[data-action="confirm"]');

    await expect(page.locator('.meeting-history-list')).not.toContainText('Disposable Meeting');
    await expect(page.locator('#meetingTitle')).toHaveValue('\u5468\u4f1a');

    const meetings = await page.evaluate(() => JSON.parse(localStorage.getItem('chip_todo_meetings') || '[]'));
    expect(meetings).toHaveLength(0);
  });

  test('should filter meetings by created month', async ({ page }) => {
    await page.click('.tab[data-view="meeting"]');
    await page.fill('#meetingTitle', 'Early Meeting');
    await page.click('#saveMeetingBtn');
    await confirmModal(page);

    await page.click('#newMeetingBtn');
    await page.fill('#meetingTitle', 'Late Meeting');
    await page.click('#saveMeetingBtn');
    await confirmModal(page);

    await page.evaluate(() => {
      const meetings = JSON.parse(localStorage.getItem('chip_todo_meetings') || '[]');
      const earlyMeeting = meetings.find(meeting => meeting.title === 'Early Meeting');
      const lateMeeting = meetings.find(meeting => meeting.title === 'Late Meeting');
      earlyMeeting.createdAt = '2026-02-20T09:00:00.000Z';
      earlyMeeting.updatedAt = '2026-02-20T09:30:00.000Z';
      lateMeeting.createdAt = '2026-03-10T09:00:00.000Z';
      lateMeeting.updatedAt = '2026-03-10T09:30:00.000Z';
      localStorage.setItem('chip_todo_meetings', JSON.stringify(meetings));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.click('.tab[data-view="meeting"]');
    await page.fill('#meetingSearchMonth', '2026-03');
    await page.click('#meetingSearchForm button[type="submit"]');

    await expect(page.locator('.meeting-history-list')).toContainText('Late Meeting');
    await expect(page.locator('.meeting-history-list')).not.toContainText('Early Meeting');
  });

  test('should export the meeting content as an html report', async ({ page }) => {
    await page.click('.tab[data-view="meeting"]');
    await page.fill('#meetingTitle', 'HTML Export Meeting');
    await page.fill('#meetingNotes', 'Export this meeting to html');

    const downloadPromise = page.waitForEvent('download');
    await page.click('#exportMeetingHtmlBtn');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/HTML-Export-Meeting-.*\.html$/);
    const filePath = await download.path();
    const html = fs.readFileSync(filePath, 'utf8');
    expect(html).toContain('<html');
    expect(html).toContain('HTML Export Meeting');
    expect(html).toContain('Export this meeting to html');
  });

  test('should filter completed tasks on the board', async ({ page }) => {
    await createProject(page, 'Completed Project');
    await openProjectDetail(page, 'Completed Project');
    await addTaskFromProjectDetail(page, '瀹屾垚浠诲姟', { status: 'completed' });

    await page.click('.project-detail-modal .close-btn');
    await page.click('.tab[data-view="board"]');
    await page.click('.filter-tab[data-filter="completed"]');

    await expect(page.locator('.gantt-task')).toContainText('瀹屾垚浠诲姟');
    await expect(page.locator('#projectList')).toContainText('Completed Project');
  });
});
