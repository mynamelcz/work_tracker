const Utils = {
  $(selector, context = document) {
    return context.querySelector(selector);
  },

  $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  },

  createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') {
        el.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('on')) {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    }
    
    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    });
    
    return el;
  },

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  getWeekRange(week, year) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const startWeek = simple;
    if (dow <= 4) {
      startWeek.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      startWeek.setDate(simple.getDate() + 8 - simple.getDay());
    }
    const endWeek = new Date(startWeek);
    endWeek.setDate(startWeek.getDate() + 6);
    
    const formatDate = (d) => {
      const month = d.getMonth() + 1;
      const day = d.getDate();
      return `${month}月${day}日`;
    };
    
    return `${formatDate(startWeek)} - ${formatDate(endWeek)}`;
  },

  getWeeksInYear(year) {
    const d = new Date(year, 11, 28);
    const dow = d.getDay();
    const daysToMonday = dow <= 4 ? dow : dow - 7;
    d.setDate(d.getDate() - daysToMonday);
    const week1 = new Date(d.getFullYear(), 0, 4);
    const days = (d - week1) / 86400000;
    return Math.ceil((days + week1.getDay() + 1) / 7);
  },

  getISOWeek(date = new Date()) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { week: weekNo, year: d.getFullYear() };
  },

  getStatusText(status) {
    const map = {
      'pending': '待处理',
      'in_progress': '进行中',
      'paused': '已暂停',
      'completed': '已完成'
    };
    return map[status] || status;
  },

  getStatusClass(status) {
    const map = {
      'pending': 'status-pending',
      'in_progress': 'status-in-progress',
      'paused': 'status-paused',
      'completed': 'status-completed'
    };
    return map[status] || '';
  },

  getPriorityText(priority) {
    const map = {
      'low': '低',
      'medium': '中',
      'high': '高'
    };
    return map[priority] || priority;
  },

  getPriorityClass(priority) {
    const map = {
      'low': 'priority-low',
      'medium': 'priority-medium',
      'high': 'priority-high'
    };
    return map[priority] || '';
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  showModal(content) {
    const overlay = Utils.createElement('div', { class: 'modal-overlay' });
    const modal = Utils.createElement('div', { class: 'modal' });
    modal.appendChild(content);
    overlay.appendChild(modal);
    
    const closeModal = () => {
      document.removeEventListener('keydown', handleEsc);
      overlay.remove();
    };
    
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
    
    document.addEventListener('keydown', handleEsc);
    document.body.appendChild(overlay);
    return overlay;
  },

  confirm(message) {
    return new Promise((resolve) => {
      const overlay = Utils.createElement('div', { class: 'modal-overlay' });
      const modal = Utils.createElement('div', { class: 'modal confirm-modal' });
      modal.innerHTML = `
        <p>${message}</p>
        <div class="confirm-buttons">
          <button class="btn btn-secondary" data-action="cancel">取消</button>
          <button class="btn btn-danger" data-action="confirm">确认</button>
        </div>
      `;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      const cleanup = () => {
        document.removeEventListener('keydown', handleEsc);
        overlay.remove();
      };
      
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
        }
      };
      
      document.addEventListener('keydown', handleEsc);
      
      modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
      modal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
        cleanup();
        resolve(true);
      });
    });
  },

  downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
};

window.Utils = Utils;
