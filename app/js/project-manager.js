// ==========================================
// 公文整合助手 - 项目管理
// ==========================================

const STORAGE_KEY = 'official-doc-assembler-projects';

const projectManager = {
  // 获取所有项目
  getProjects() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // 创建项目
  createProject(data) {
    const projects = this.getProjects();
    const project = {
      id: 'proj-' + Date.now(),
      title: data.title || '未命名',
      docType: data.docType,
      docTypeName: data.docTypeName,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: data.document || {},
      originalData: data.originalDocument || null
    };
    projects.push(project);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return project;
  },

  // 获取单个项目
  getProject(id) {
    return this.getProjects().find(p => p.id === id);
  },

  // 更新项目
  updateProject(id, updates) {
    const projects = this.getProjects();
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    projects[idx] = { ...projects[idx], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return projects[idx];
  },

  // 删除项目
  deleteProject(id) {
    const projects = this.getProjects().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  },

  // 渲染项目列表
  renderProjectList() {
    const projects = this.getProjects();
    const statusLabels = { draft: '草稿', reviewing: '审阅中', finalized: '已定稿' };
    const statusClasses = { draft: 'status-draft', reviewing: 'status-reviewing', finalized: 'status-finalized' };

    let html = `
      <div class="page-container">
        <div class="page-header">
          <h2>项目列表</h2>
          <button class="btn btn-primary" onclick="app.navigate('templates')">
            <span class="btn-icon">+</span> 新建文档
          </button>
        </div>
        <div class="project-list">
    `;

    if (projects.length === 0) {
      html += `<div class="empty-state">
        <div class="empty-icon">&#128196;</div>
        <p>暂无项目，从模板库创建或导入 JSON 数据包</p>
        <button class="btn btn-secondary" onclick="app.navigate('templates')">去模板库</button>
      </div>`;
    } else {
      html += `<div class="project-grid">`;
      projects.forEach(p => {
        html += `
          <div class="project-card" onclick="app.navigate('editor', {projectId: '${p.id}'})">
            <div class="project-header">
              <span class="project-type">${p.docTypeName}</span>
              <span class="project-status ${statusClasses[p.status]}">${statusLabels[p.status]}</span>
            </div>
            <h3 class="project-title">${p.title}</h3>
            <div class="project-meta">
              <span>${new Date(p.updatedAt).toLocaleDateString('zh-CN')}</span>
            </div>
            <div class="project-actions">
              <button class="btn-icon-only" onclick="event.stopPropagation(); exporter.exportProject('${p.id}', 'docx')" title="导出Word">&#128190;</button>
              <button class="btn-icon-only" onclick="event.stopPropagation(); exporter.exportProject('${p.id}', 'pdf')" title="导出PDF">&#128196;</button>
              <button class="btn-icon-only" onclick="event.stopPropagation(); exporter.exportProjectPptx('${p.id}', 'business')" title="导出PPT">&#128393;</button>
              <button class="btn-icon-only danger" onclick="event.stopPropagation(); projectManager.confirmDelete('${p.id}')" title="删除">&#128465;</button>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `</div></div>`;
    return html;
  },

  confirmDelete(id) {
    if (confirm('确定删除此项目吗？此操作不可撤销。')) {
      this.deleteProject(id);
      app.navigate('projects');
    }
  }
};
