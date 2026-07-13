// ==========================================
// 公文整合助手 - 模板库
// ==========================================

const templateLibrary = {
  // 加载所有模板
  async loadTemplates() {
    // 内置模板从 shared/doc-types 加载
    const builtin = await this.loadBuiltinTemplates();
    // 自定义模板从 localStorage 加载
    const custom = this.loadCustomTemplates();
    return [...builtin, ...custom];
  },

  async loadBuiltinTemplates() {
    // 通过 fetch 加载 shared/doc-types 下的 JSON 文件
    const docTypes = ['notice', 'report', 'letter', 'summary', 'speech', 'minutes',
                      'request', 'work-plan', 'briefing', 'presentation'];
    const templates = [];
    for (const id of docTypes) {
      try {
        const resp = await fetch(`../shared/doc-types/${id}.json`);
        if (resp.ok) templates.push(await resp.json());
      } catch (e) {
        console.warn(`加载模板 ${id} 失败`, e);
      }
    }
    return templates;
  },

  loadCustomTemplates() {
    const data = localStorage.getItem('custom-templates');
    return data ? JSON.parse(data) : [];
  },

  // 渲染模板库
  async renderTemplateLibrary(filter = 'all') {
    const templates = await this.loadTemplates();
    const categories = {
      official: { label: '法定公文', icon: '&#9878;' },
      material: { label: '常见材料', icon: '&#128221;' },
      custom: { label: '自定义', icon: '&#9998;' }
    };

    let html = `
      <div class="page-container">
        <div class="page-header">
          <h2>模板库</h2>
          <div class="filter-tabs">
            <button class="filter-tab ${filter === 'all' ? 'active' : ''}" onclick="templateLibrary.filter('all')">全部</button>
            <button class="filter-tab ${filter === 'official' ? 'active' : ''}" onclick="templateLibrary.filter('official')">法定公文</button>
            <button class="filter-tab ${filter === 'material' ? 'active' : ''}" onclick="templateLibrary.filter('material')">常见材料</button>
          </div>
        </div>
        <div class="template-grid">
    `;

    const filtered = filter === 'all' ? templates : templates.filter(t => t.category === filter);

    filtered.forEach(t => {
      const cat = categories[t.category] || categories.material;
      html += `
        <div class="template-card">
          <div class="template-icon">${cat.icon}</div>
          <div class="template-info">
            <h3>${t.name}</h3>
            <p class="template-desc">${t.description || ''}</p>
            <span class="template-category">${cat.label}</span>
          </div>
          <div class="template-actions">
            <button class="btn btn-primary" onclick="templateLibrary.createDocument('${t.id}')">创建文档</button>
            <button class="btn btn-secondary" onclick="templateLibrary.downloadBlank('${t.id}')">下载空白模板</button>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    return html;
  },

  filter(category) {
    const container = document.getElementById('app-container');
    this.renderTemplateLibrary(category).then(html => container.innerHTML = html);
  },

  // 从模板创建文档
  async createDocument(templateId) {
    const templates = await this.loadTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // 构建空白文档
    const document = {
      version: '1.0',
      docType: template.id,
      docTypeName: template.name,
      title: `关于[事项]的${template.name}`,
      sender: '[发文单位]',
      recipient: template.structure && template.structure.hasRecipient ? '[主送单位]' : '',
      date: new Date().toLocaleDateString('zh-CN', {year:'numeric', month:'long', day:'numeric'}).replace(/\//g, '年').replace(/\//g, '月') + '日',
      sections: template.structure && template.structure.sections
        ? template.structure.sections.map(sec => ({
            heading: sec.title,
            level: 1,
            content: `[${sec.title}内容]`,
            sourceMaterials: []
          }))
        : [],
      attachments: [],
      notes: template.structure && template.structure.hasNotes ? '联系人：[姓名]，联系电话：[电话]' : '',
      complianceChecks: [],
      customTemplate: null,
      exportedAt: new Date().toISOString()
    };

    const project = projectManager.createProject({
      title: document.title,
      docType: template.id,
      docTypeName: template.name,
      document: document
    });

    app.navigate('editor', { projectId: project.id });
  },

  // 下载空白模板
  async downloadBlank(templateId) {
    await exporter.downloadBlankTemplate(templateId);
  }
};
