// ==========================================
// 公文整合助手 - 应用主逻辑 v2
// 升级：工作流连贯性、保存到项目、自动会话恢复
// ==========================================

const app = {
  currentPage: 'projects',
  currentProject: null,

  // 初始化
  init() {
    this.navigate('projects');
    this.updateStatus('就绪');
  },

  // 页面路由
  navigate(page, params = {}) {
    this.currentPage = page;
    const container = document.getElementById('app-container');

    // 更新导航标签状态
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.page === page);
    });

    switch (page) {
      case 'projects':
        container.innerHTML = projectManager.renderProjectList();
        break;
      case 'templates':
        templateLibrary.renderTemplateLibrary().then(html => {
          container.innerHTML = html;
        });
        return; // 异步渲染，提前返回
      case 'editor':
        container.innerHTML = editor.renderEditor(params.projectId);
        break;
      case 'upload':
        container.innerHTML = materialUploader.renderUploadPage();
        break;
      case 'align':
        container.innerHTML = alignView.renderAlignPage();
        break;
      case 'merge':
        container.innerHTML = alignView.renderMergePage();
        break;
      case 'chatpaste':
        container.innerHTML = chatPaster.renderPage();
        break;
      case 'settings':
        container.innerHTML = this.renderSettings();
        break;
      default:
        container.innerHTML = '<div class="page-error">页面不存在</div>';
    }
  },

  // ===== 保存合并结果为项目 =====
  saveMergeAsProject() {
    const merged = window.mergedResult;
    if (!merged) {
      alert('没有可保存的合并结果');
      return;
    }

    const title = prompt('请输入项目标题：', merged.title || '新公文项目');
    if (!title) return;

    const project = {
      id: 'proj-' + Date.now(),
      title: title,
      docType: merged.docType,
      docTypeName: merged.docTypeName,
      content: merged,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft'
    };

    dataStore.saveProject(project);
    dataStore.addRecent(project.id);

    // 清空会话，标记已保存
    dataStore.clearSession();

    alert(`项目「${title}」已保存！

现在可以：
- 在「项目列表」中继续编辑
- 直接导出 Word / PDF`);

    this.navigate('projects');
  },

  // ===== 渲染设置页面（增强：数据备份/恢复） =====
  renderSettings() {
    const feishuConfig = feishuAdapter.config;
    const recentCount = dataStore.getRecent().length;
    const projectCount = dataStore.getProjects().length;
    return `
      <div class="page-container">
        <h2>设置</h2>

        <div class="card">
          <h3>数据管理</h3>
          <div class="setting-stats">
            <div class="st-item">
              <span class="st-num">${projectCount}</span>
              <span class="st-label">已保存项目</span>
            </div>
            <div class="st-item">
              <span class="st-num">${recentCount}</span>
              <span class="st-label">最近使用</span>
            </div>
          </div>
          <div class="setting-actions">
            <button class="btn btn-secondary" onclick="dataStore.downloadBackup()">
              <span class="btn-icon">&#11015;</span> 导出全量备份
            </button>
            <button class="btn btn-secondary" onclick="app.importBackup()">
              <span class="btn-icon">&#11014;</span> 导入备份
            </button>
            <button class="btn btn-danger" onclick="app.clearAllData()">
              <span class="btn-icon">&#128465;</span> 清空所有数据
            </button>
          </div>
          <input type="file" id="backup-import-input" accept=".json" hidden
                 onchange="app.handleBackupImport(event)">
        </div>

        <div class="card">
          <h3>飞书集成（预留）</h3>
          <div class="form-group">
            <label>Webhook URL</label>
            <input type="text" id="feishu-webhook" value="${feishuConfig.webhookUrl || ''}" placeholder="https://open.feishu.cn/...">
          </div>
          <div class="form-group">
            <label>App ID</label>
            <input type="text" id="feishu-app-id" value="${feishuConfig.appId || ''}">
          </div>
          <div class="form-group">
            <label>App Secret</label>
            <input type="password" id="feishu-app-secret" value="${feishuConfig.appSecret || ''}">
          </div>
          <button class="btn btn-primary" onclick="app.saveFeishuConfig()">保存配置</button>
        </div>
      </div>
    `;
  },

  importBackup() {
    document.getElementById('backup-import-input').click();
  },

  handleBackupImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (dataStore.importAll(ev.target.result)) {
        alert('备份导入成功！');
        this.navigate('projects');
      } else {
        alert('备份导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  },

  clearAllData() {
    if (!confirm('确定清空所有项目、素材和设置吗？此操作不可撤销！')) return;
    localStorage.clear();
    alert('所有数据已清空');
    this.navigate('projects');
  },

  saveFeishuConfig() {
    feishuAdapter.config.webhookUrl = document.getElementById('feishu-webhook').value;
    feishuAdapter.config.appId = document.getElementById('feishu-app-id').value;
    feishuAdapter.config.appSecret = document.getElementById('feishu-app-secret').value;
    feishuAdapter.saveConfig();
    alert('配置已保存');
  },

  updateStatus(text) {
    document.getElementById('status-text').textContent = text;
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => app.init());
