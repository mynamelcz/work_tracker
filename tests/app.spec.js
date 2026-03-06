const { test, expect } = require('@playwright/test');

test.describe('Chip Todo App', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', error => console.log(`[Browser Error]: ${error}`));
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
});
