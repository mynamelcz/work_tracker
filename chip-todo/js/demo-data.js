// 测试数据生成器
// 在浏览器控制台执行此文件，或在 index.html 中临时引入

window.addEventListener('load', () => {
  setTimeout(() => {
    if (!window.store) {
      console.error('请确保 store 已加载');
      return;
    }

    const demoData = {
      version: 2,
      data: {
        members: [
          { id: 'm_101', name: '张颖', role: '测试主管', color: '#2563EB', createdAt: '2026-03-01T09:00:00.000Z' },
          { id: 'm_102', name: '李晨', role: '芯片验证工程师', color: '#0F766E', createdAt: '2026-03-01T09:05:00.000Z' },
          { id: 'm_103', name: '王卓', role: 'ATE工程师', color: '#D97706', createdAt: '2026-03-01T09:10:00.000Z' },
          { id: 'm_104', name: '陈思', role: '可靠性工程师', color: '#DC2626', createdAt: '2026-03-01T09:15:00.000Z' },
          { id: 'm_105', name: '赵敏', role: '自动化测试工程师', color: '#7C3AED', createdAt: '2026-03-01T09:20:00.000Z' },
          { id: 'm_106', name: '周楠', role: '失效分析工程师', color: '#0891B2', createdAt: '2026-03-01T09:25:00.000Z' }
        ],
        projects: [
          {
            id: 'p_201',
            name: 'Orion-A1 EVT',
            description: 'A1 主控芯片 EVT 阶段功能与边界验证。',
            members: ['m_101', 'm_102', 'm_105'],
            status: 'in_progress',
            weekKey: '2026-W10',
            createdAt: '2026-03-02T08:00:00.000Z'
          },
          {
            id: 'p_202',
            name: 'Phoenix-B2 DVT',
            description: 'B2 芯片 DVT 阶段性能、时钟与功耗回归。',
            members: ['m_102', 'm_103', 'm_104'],
            status: 'paused',
            weekKey: '2026-W10',
            createdAt: '2026-03-02T08:20:00.000Z'
          },
          {
            id: 'p_203',
            name: 'Mercury-C3 SI',
            description: 'C3 高速接口信号完整性专项验证。',
            members: ['m_103', 'm_106'],
            status: 'completed',
            weekKey: '2026-W10',
            createdAt: '2026-03-02T08:40:00.000Z'
          },
          {
            id: 'p_204',
            name: 'Atlas-D1 Reliability',
            description: 'D1 芯片高低温循环与老化寿命测试。',
            members: ['m_104', 'm_106'],
            status: 'in_progress',
            weekKey: '2026-W10',
            createdAt: '2026-03-02T09:00:00.000Z'
          },
          {
            id: 'p_205',
            name: 'Nova-E5 Automation',
            description: 'E5 平台自动化回归脚本与报表整合。',
            members: ['m_101', 'm_105'],
            status: 'in_progress',
            weekKey: '2026-W10',
            createdAt: '2026-03-02T09:20:00.000Z'
          }
        ],
        tasks: [
          { id: 't_301', projectId: 'p_201', name: '待机功耗曲线复测', description: '补测 0.75V/0.80V 两档电压下待机功耗并更新趋势图。', assignee: 'm_102', status: 'in_progress', priority: 'high', progress: 72, weekKey: '2026-W10', createdAt: '2026-03-03T09:00:00.000Z', completedAt: null },
          { id: 't_302', projectId: 'p_201', name: 'GPIO 异常唤醒定位', description: '分析睡眠状态下 GPIO 抖动导致误唤醒的问题。', assignee: 'm_105', status: 'paused', priority: 'high', progress: 48, weekKey: '2026-W10', createdAt: '2026-03-03T09:20:00.000Z', completedAt: null, pausedAt: '2026-03-05T15:00:00.000Z' },
          { id: 't_303', projectId: 'p_201', name: '低温启动边界测试', description: '验证 -20C 冷启动稳定性与首次上电时序。', assignee: 'm_101', status: 'in_progress', priority: 'medium', progress: 1, weekKey: '2026-W10', createdAt: '2026-03-03T09:40:00.000Z', completedAt: null },
          { id: 't_304', projectId: 'p_201', name: '功能回归日报模板整理', description: '统一 EVT 阶段日报表结构并补充截图规范。', assignee: 'm_105', status: 'completed', priority: 'low', progress: 100, weekKey: '2026-W10', createdAt: '2026-03-03T10:00:00.000Z', completedAt: '2026-03-04T18:20:00.000Z' },
          { id: 't_305', projectId: 'p_202', name: '主频 1.8GHz 稳定性压力测试', description: '在高温箱环境下连续跑 12 小时稳定性测试。', assignee: 'm_103', status: 'in_progress', priority: 'high', progress: 66, weekKey: '2026-W10', createdAt: '2026-03-03T10:20:00.000Z', completedAt: null },
          { id: 't_306', projectId: 'p_202', name: 'PLL 锁相异常复现', description: '对 3 颗问题样片复现 PLL 不锁定场景并抓日志。', assignee: 'm_102', status: 'paused', priority: 'high', progress: 39, weekKey: '2026-W10', createdAt: '2026-03-03T10:40:00.000Z', completedAt: null, pausedAt: '2026-03-06T10:30:00.000Z' },
          { id: 't_307', projectId: 'p_202', name: '动态电压切换脚本补齐', description: '增加 ATE 动态压降场景，补充异常日志导出。', assignee: 'm_105', status: 'in_progress', priority: 'medium', progress: 1, weekKey: '2026-W10', createdAt: '2026-03-03T11:00:00.000Z', completedAt: null },
          { id: 't_308', projectId: 'p_203', name: 'PCIe Gen4 眼图采样', description: '搭建测试治具并完成首轮 Tx/Rx 眼图采样。', assignee: 'm_106', status: 'completed', priority: 'high', progress: 100, weekKey: '2026-W10', createdAt: '2026-03-03T11:20:00.000Z', completedAt: '2026-03-05T16:30:00.000Z' },
          { id: 't_309', projectId: 'p_203', name: 'SerDes 抖动预算评估', description: '整理板级与芯片侧的抖动来源，输出预算表。', assignee: 'm_103', status: 'completed', priority: 'medium', progress: 100, weekKey: '2026-W10', createdAt: '2026-03-03T11:40:00.000Z', completedAt: '2026-03-05T18:10:00.000Z' },
          { id: 't_310', projectId: 'p_204', name: '125C 老化 96h 样品巡检', description: '记录样品表面状态、电流波动与异常中断次数。', assignee: 'm_104', status: 'in_progress', priority: 'high', progress: 84, weekKey: '2026-W10', createdAt: '2026-03-03T13:00:00.000Z', completedAt: null },
          { id: 't_311', projectId: 'p_204', name: '冷热冲击日志归档', description: '对 40 组温变日志按批次归档并生成摘要。', assignee: 'm_106', status: 'completed', priority: 'medium', progress: 100, weekKey: '2026-W10', createdAt: '2026-03-03T13:20:00.000Z', completedAt: '2026-03-05T17:45:00.000Z' },
          { id: 't_312', projectId: 'p_204', name: '失效样片开盖分析排期', description: '确认 FA 室窗口并准备截面分析样品。', assignee: 'm_106', status: 'paused', priority: 'medium', progress: 22, weekKey: '2026-W10', createdAt: '2026-03-03T13:40:00.000Z', completedAt: null, pausedAt: '2026-03-06T09:20:00.000Z' },
          { id: 't_313', projectId: 'p_205', name: '周报自动汇总脚本', description: '从 JSON 数据生成团队周报 markdown 模板。', assignee: 'm_105', status: 'in_progress', priority: 'high', progress: 58, weekKey: '2026-W10', createdAt: '2026-03-03T14:00:00.000Z', completedAt: null },
          { id: 't_314', projectId: 'p_205', name: '导入覆盖提示优化', description: '导入前显示覆盖范围与备份建议。', assignee: 'm_101', status: 'in_progress', priority: 'medium', progress: 1, weekKey: '2026-W10', createdAt: '2026-03-03T14:20:00.000Z', completedAt: null },
          { id: 't_315', projectId: 'p_205', name: '任务弹窗交互回归检查', description: '检查项目切换、历史任务编辑、进度联动状态。', assignee: 'm_102', status: 'completed', priority: 'low', progress: 100, weekKey: '2026-W10', createdAt: '2026-03-03T14:40:00.000Z', completedAt: '2026-03-04T12:00:00.000Z' },
          { id: 't_316', projectId: 'p_202', name: '上周 DVT 风险项复盘', description: '整理上周遗留问题并更新风险矩阵。', assignee: 'm_101', status: 'completed', priority: 'medium', progress: 100, weekKey: '2026-W09', createdAt: '2026-02-26T10:00:00.000Z', completedAt: '2026-02-28T18:00:00.000Z' }
        ],
        currentWeek: 10,
        currentYear: 2026
      },
      history: [],
      meetings: [
        {
          weekKey: '2026-W10',
          week: 10,
          year: 2026,
          date: '2026-03-06',
          attendees: ['m_101', 'm_102', 'm_103', 'm_104', 'm_105'],
          notes: '本周重点关注 A1 功耗趋势、B2 PLL 锁相异常和 D1 老化样片失效分析窗口。',
          taskReports: {
            t_301: {
              work: '完成两档电压的 8 组样品功耗复测，趋势图已更新。',
              issues: '一块开发板在低温箱中电流采样不稳定。',
              updatedAt: '2026-03-06T10:00:00.000Z'
            },
            t_305: {
              work: '高温压力已连续运行 8 小时，当前未见新的 hang 机。',
              issues: 'ATE 日志导出格式不统一，复盘效率偏低。',
              updatedAt: '2026-03-06T10:10:00.000Z'
            },
            t_310: {
              work: '完成 96 小时节点巡检，记录 2 颗样品轻微电流抖动。',
              issues: '',
              updatedAt: '2026-03-06T10:20:00.000Z'
            },
            t_313: {
              work: '完成报告骨架与成员任务聚合逻辑。',
              issues: '剪贴板权限在部分浏览器环境表现不一致。',
              updatedAt: '2026-03-06T10:30:00.000Z'
            }
          },
          createdAt: '2026-03-06T09:30:00.000Z',
          updatedAt: '2026-03-06T10:30:00.000Z'
        },
        {
          weekKey: '2026-W09',
          week: 9,
          year: 2026,
          date: '2026-02-27',
          attendees: ['m_101', 'm_102', 'm_105'],
          notes: '上周已完成 B2 风险项复盘，当前进入本周回归执行。',
          taskReports: {
            t_316: {
              work: '完成上周 DVT 风险回顾与负责人分配。',
              issues: '',
              updatedAt: '2026-02-27T15:00:00.000Z'
            }
          },
          createdAt: '2026-02-27T14:30:00.000Z',
          updatedAt: '2026-02-27T15:00:00.000Z'
        }
      ],
      exportedAt: '2026-03-06T10:30:00.000Z'
    };

    const hasData = window.store.data.members.length > 0
      || window.store.data.projects.length > 0
      || window.store.data.tasks.length > 0;

    if (hasData && !window.confirm('当前已有数据，是否覆盖为演示数据？')) {
      return;
    }

    window.store.importData(JSON.stringify(demoData));
    window.location.reload();
  }, 300);
});
