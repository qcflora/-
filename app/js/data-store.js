// ==========================================
// 公文整合助手 - 统一数据持久化层
// 管理所有 localStorage 读写，支持导入导出
// ==========================================

const dataStore = {
  // 存储键名
  keys: {
    projects: 'oda-projects',
    materials: 'oda-materials',
    sessions: 'oda-sessions',
    settings: 'oda-settings',
    recent: 'oda-recent',
    templates: 'oda-custom-templates'
  },

  // ===== 通用读写 =====
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('dataStore.get error:', e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('dataStore.set error:', e);
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  // ===== 项目 =====
  getProjects() {
    return this.get(this.keys.projects) || [];
  },

  saveProject(project) {
    const projects = this.getProjects();
    const idx = projects.findIndex(p => p.id === project.id);
    if (idx >= 0) {
      projects[idx] = { ...project, updatedAt: new Date().toISOString() };
    } else {
      projects.push(project);
    }
    this.set(this.keys.projects, projects);
    return project;
  },

  deleteProject(id) {
    const projects = this.getProjects().filter(p => p.id !== id);
    this.set(this.keys.projects, projects);
  },

  getProject(id) {
    return this.getProjects().find(p => p.id === id);
  },

  // ===== 素材会话 =====
  getSession() {
    return this.get(this.keys.sessions) || {
      materials: [],
      selectedDocType: null,
      alignedMaterials: [],
      mergedResult: null,
      lastUpdated: null
    };
  },

  saveSession(session) {
    session.lastUpdated = new Date().toISOString();
    this.set(this.keys.sessions, session);
  },

  clearSession() {
    this.remove(this.keys.sessions);
  },

  // ===== 最近使用 =====
  addRecent(projectId) {
    const recent = this.get(this.keys.recent) || [];
    const filtered = recent.filter(id => id !== projectId);
    filtered.unshift(projectId);
    this.set(this.keys.recent, filtered.slice(0, 10));
  },

  getRecent() {
    const recentIds = this.get(this.keys.recent) || [];
    const projects = this.getProjects();
    return recentIds.map(id => projects.find(p => p.id === id)).filter(Boolean);
  },

  // ===== 设置 =====
  getSettings() {
    return this.get(this.keys.settings) || {
      autoSave: true,
      defaultDocType: 'presentation',
      fontSize: '16px',
      theme: 'light'
    };
  },

  saveSettings(settings) {
    this.set(this.keys.settings, { ...this.getSettings(), ...settings });
  },

  // ===== 全量导入导出 =====
  exportAll() {
    const data = {};
    Object.values(this.keys).forEach(key => {
      data[key] = this.get(key);
    });
    return JSON.stringify(data, null, 2);
  },

  importAll(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          this.set(key, value);
        }
      });
      return true;
    } catch (e) {
      console.error('导入失败:', e);
      return false;
    }
  },

  // 下载全量备份
  downloadBackup() {
    const blob = new Blob([this.exportAll()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `公文整合助手备份_${new Date().toLocaleDateString('zh-CN')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
