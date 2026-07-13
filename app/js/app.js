// ==========================================
// 公文整合助手 - 应用主逻辑
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

  // 渲染设置页面
  renderSettings() {
    const feishuConfig = feishuAdapter.config;
    return `
      <div class="page-container">
        <h2>设置</h2>
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
