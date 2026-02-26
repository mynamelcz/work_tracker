// 测试数据生成器
// 在浏览器控制台执行此文件，或在 index.html 中临时引入

// 等待页面加载完成后再执行
window.addEventListener('load', function() {
  setTimeout(function() {
    if (!window.store || !window.Utils) {
      console.error('请确保 store 和 Utils 已加载');
      return;
    }

    const store = window.store;

    // 如果已有数据，先提示
    if (store.data.members.length > 0) {
      if (!confirm('已有数据存在，继续将添加更多测试数据。是否继续？')) {
        return;
      }
    }

    // 添加测试成员
    const memberIds = [];
    const members = [
      { name: '张三', role: '测试工程师', color: '#3B82F6' },
      { name: '李四', role: '硬件工程师', color: '#10B981' },
      { name: '王五', role: '软件工程师', color: '#F59E0B' },
      { name: '赵六', role: '测试主管', color: '#EF4444' }
    ];

    members.forEach(m => memberIds.push(store.addMember(m)));

    // 添加测试项目
    const projectIds = [];
    const projects = [
      { name: 'A1芯片测试', description: '新一代A1芯片功能验证' },
      { name: 'B2芯片测试', description: 'B2芯片性能测试' },
      { name: 'C3芯片测试', description: 'C3芯片兼容性测试' }
    ];

    projects.forEach(p => projectIds.push(store.addProject(p)));

    // 添加测试任务
    const tasks = [
      { name: '功耗测试', projectId: projectIds[0], assignee: memberIds[0], progress: 100, priority: 'high' },
      { name: '温度测试', projectId: projectIds[0], assignee: memberIds[0], progress: 75, priority: 'high' },
      { name: '信号完整性测试', projectId: projectIds[0], assignee: memberIds[1], progress: 50, priority: 'medium' },
      { name: '时钟测试', projectId: projectIds[1], assignee: memberIds[1], progress: 30, priority: 'medium' },
      { name: '电源管理测试', projectId: projectIds[1], assignee: memberIds[2], progress: 10, priority: 'low' },
      { name: 'IO接口测试', projectId: projectIds[2], assignee: memberIds[2], progress: 0, priority: 'low' },
      { name: 'EMC测试', projectId: projectIds[2], assignee: memberIds[3], progress: 0, priority: 'high' },
      { name: '老化测试', projectId: projectIds[0], assignee: memberIds[0], progress: 100, priority: 'medium' }
    ];

    tasks.forEach(t => store.addTask(t));

    console.log('测试数据已生成: ' + store.data.members.length + '成员, ' + store.data.projects.length + '项目, ' + store.data.tasks.length + '任务');

    // 刷新页面显示
    location.reload();
  }, 500);
});
