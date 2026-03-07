const { test, expect } = require('@playwright/test');

test.describe('Chip Todo App', () => {
  async function openManagement(page) {
    await page.click('.tab[data-view="management"]');
  }

  async function createProject(page, name, status = 'not_started') {
    await openManagement(page);
    await page.click('#newProjectBtn');
    await page.fill('input[name="name"]', name);
    await page.selectOption('select[name="status"]', status);
    await page.click('button[type="submit"]');
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
    if (options.status) {
      await page.selectOption('select[name="status"]', options.status);
    }
    if (options.progress !== undefined) {
      await page.locator('#progressSlider').fill(String(options.progress));
    }
    await page.click('#taskForm button[type="submit"]');
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
    await expect(page).toHaveTitle('🔬 芯片测试工作看板');
  });

  test('should display all tabs', async ({ page }) => {
    await expect(page.locator('.tab').filter({ hasText: '看板' })).toBeVisible();
    await expect(page.locator('.tab').filter({ hasText: '管理' })).toBeVisible();
    await expect(page.locator('.tab').filter({ hasText: '会议' })).toBeVisible();
  });

  test('should show board view by default', async ({ page }) => {
    await expect(page.locator('#boardView')).toBeVisible();
    await expect(page.locator('#managementView')).toHaveClass(/hidden/);
    await expect(page.locator('#meetingView')).toHaveClass(/hidden/);
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
    await expect(page.locator('h2').filter({ hasText: '项目管理' })).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: '人员管理' })).toBeVisible();
  });

  test('should have add project and member buttons', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await expect(page.locator('#newProjectBtn')).toBeVisible();
    await expect(page.locator('#newMemberBtn')).toBeVisible();
  });

  test('should add new project', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await page.click('#newProjectBtn');
    
    await expect(page.locator('h2').filter({ hasText: '新建项目' })).toBeVisible();
    
    await page.fill('input[name="name"]', 'Test Project');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.project-card')).toContainText('Test Project');
  });

  test('should add new member', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await page.click('#newMemberBtn');
    
    await expect(page.locator('h2').filter({ hasText: '添加成员' })).toBeVisible();
    
    await page.fill('input[name="name"]', '张三');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    await expect(page.locator('.member-cards .member-card')).toContainText('张三');
  });

  test('should delete member', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await page.click('#newMemberBtn');
    await page.fill('input[name="name"]', '测试成员');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    const memberCard = page.locator('.member-cards .member-card');
    await expect(memberCard).toContainText('测试成员');
    
    await memberCard.locator('.delete-btn').click();
    await page.waitForSelector('.confirm-modal');
    await page.click('.confirm-modal .btn-danger[data-action="confirm"]');
    await page.waitForTimeout(500);
    
    await expect(page.locator('.management-section').nth(1)).toContainText('暂无成员');
  });

  test('should show empty state for projects', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await expect(page.locator('.management-section').first()).toContainText('暂无项目');
  });

  test('should show empty state for members', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    const sections = page.locator('.management-section');
    await expect(sections.nth(1)).toContainText('暂无成员');
  });

  test('should show project detail modal', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await page.click('#newProjectBtn');
    await page.fill('input[name="name"]', '测试项目');
    await page.click('button[type="submit"]');
    
    await page.click('.project-card .view-btn');
    await expect(page.locator('.project-detail-modal')).toBeVisible();
    await expect(page.locator('.project-detail-modal h2')).toContainText('测试项目');
  });

  test('should close modal on X button', async ({ page }) => {
    await page.click('.tab[data-view="management"]');
    await page.click('#newProjectBtn');
    await page.fill('input[name="name"]', '测试项目');
    await page.click('button[type="submit"]');
    
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
    await expect(page.locator('#stats')).toContainText('任务完成');
  });

  test('should prevent completing a project with unfinished tasks', async ({ page }) => {
    await createProject(page, 'Alpha Project');
    await openProjectDetail(page, 'Alpha Project');
    await addTaskFromProjectDetail(page, '未完成任务');

    await page.selectOption('#projectStatusSelect', 'completed');

    await expect(page.locator('#projectStatusSelect')).toHaveValue('not_started');
    await expect(page.locator('#addTaskToProject')).toBeEnabled();
  });

  test('should return to the new project detail after moving a task', async ({ page }) => {
    await createProject(page, 'Project A');
    await createProject(page, 'Project B');

    await openProjectDetail(page, 'Project A');
    await addTaskFromProjectDetail(page, '迁移任务');

    await page.locator('.task-item').filter({ hasText: '迁移任务' }).click();
    await expect(page.locator('h2').filter({ hasText: '编辑任务' })).toBeVisible();
    await page.selectOption('select[name="projectId"]', { label: 'Project B' });
    await page.click('#taskForm button[type="submit"]');

    await expect(page.locator('.project-detail-modal h2')).toContainText('Project B');
    await expect(page.locator('.project-detail-modal .task-list')).toContainText('迁移任务');
  });

  test('should clear stored meeting reports when task notes are emptied', async ({ page }) => {
    await createProject(page, 'Meeting Project');
    await openProjectDetail(page, 'Meeting Project');
    await addTaskFromProjectDetail(page, '会议任务');

    await page.click('.project-detail-modal .close-btn');
    await page.click('.tab[data-view="meeting"]');
    await page.fill('.meeting-task-item .task-work', '本周完成验证');
    await page.click('#saveMeetingBtn');

    await page.fill('.meeting-task-item .task-work', '');
    await page.click('#saveMeetingBtn');

    const meetings = await page.evaluate(() => JSON.parse(localStorage.getItem('chip_todo_meetings') || '[]'));
    expect(meetings).toHaveLength(1);
    expect(Object.keys(meetings[0].taskReports || {})).toHaveLength(0);
  });

  test('should filter completed tasks on the board', async ({ page }) => {
    await createProject(page, 'Completed Project');
    await openProjectDetail(page, 'Completed Project');
    await addTaskFromProjectDetail(page, '完成任务', { status: 'completed' });

    await page.click('.project-detail-modal .close-btn');
    await page.click('.tab[data-view="board"]');
    await page.click('.filter-tab[data-filter="completed"]');

    await expect(page.locator('.gantt-task')).toContainText('完成任务');
    await expect(page.locator('#projectList')).toContainText('Completed Project');
  });
});
