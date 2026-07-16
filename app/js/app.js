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
      case 'ai-demo':
        container.innerHTML = this.renderAiDemo();
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

  // ===== AI 试用页面 =====
  renderAiDemo() {
    return `
      <div class="page-container">
        <div class="page-header">
          <h2>&#129302; AI 试用</h2>
          <p class="page-subtitle">无需上传素材，直接体验核心 AI 能力</p>
        </div>

        <div class="card ai-demo-card">
          <div class="demo-tabs">
            <button class="demo-tab active" data-tab="classify" onclick="app.switchDemoTab('classify')">
              <span>&#128269;</span> 智能分类
            </button>
            <button class="demo-tab" data-tab="format" onclick="app.switchDemoTab('format')">
              <span>&#10003;</span> 格式修复
            </button>
          </div>

          <!-- 智能分类面板 -->
          <div class="demo-panel active" id="demo-panel-classify">
            <div class="demo-intro">
              <p>粘贴一段公文内容，AI 自动识别背景、做法、成效、问题、计划等章节归属。</p>
            </div>
            <textarea class="demo-textarea" id="demo-classify-input"
              placeholder="示例：\n\n根据《关于深化国有企业改革的指导意见》精神，为贯彻落实上级部署要求，我公司自2024年启动了三项制度改革工作。\n\n一是建立了市场化选人用人机制，完善了考核评价体系。\n\n全年实现营收增长12.5%，利润突破3亿元。\n\n但是也存在部分干部思想不够解放、改革推进不平衡的问题。\n\n下一步将继续深化各项改革举措，力争在年底前全面完成改革任务。">根据《关于深化国有企业改革的指导意见》精神，为贯彻落实上级部署要求，我公司自2024年启动了三项制度改革工作。

一是建立了市场化选人用人机制，完善了考核评价体系，出台了《员工竞聘上岗管理办法》。

全年实现营收增长12.5%，利润突破3亿元，员工满意度达到92%。

但是也存在部分干部思想不够解放、改革推进不平衡、部分地区落实不到位的问题。

下一步将继续深化各项改革举措，着力提升管理水平，力争在年底前全面完成改革任务。</textarea>
            <button class="btn btn-primary" onclick="app.runDemoClassify()">
              <span>&#128269;</span> 识别分类
            </button>
            <div class="demo-output" id="demo-classify-output" style="display:none;"></div>
          </div>

          <!-- 格式修复面板 -->
          <div class="demo-panel" id="demo-panel-format">
            <div class="demo-intro">
              <p>粘贴含格式问题的文本，一键修复标点空格、口语化表达等常见问题。</p>
            </div>
            <textarea class="demo-textarea" id="demo-format-input"
              placeholder="示例：\n\n工作做得不错 ，但是还存在一些问题。咱们要继续努力，把事情搞好 。">近年来，我公司积极落实改革部署 ，取得了显著成效 。但是也存在一些问题 ，比如改革推进 不够深入，部分制度 还没有落实到位。咱们要继续努力，把事情搞好 ，确保完成年度目标 。</textarea>
            <button class="btn btn-primary" onclick="app.runDemoFormat()">
              <span>&#10003;</span> 一键修复
            </button>
            <div class="demo-output" id="demo-format-output" style="display:none;"></div>
          </div>
        </div>
      </div>
    `;
  },

  switchDemoTab(tabId) {
    document.querySelectorAll('.demo-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    document.querySelectorAll('.demo-panel').forEach(p => p.classList.toggle('active', p.id === 'demo-panel-' + tabId));
  },

  runDemoClassify() {
    const text = document.getElementById('demo-classify-input').value.trim();
    if (!text) return;

    const paras = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);

    const sectionLabels = {
      background: { name: '背景', cls: 'tag-bg' },
      practices: { name: '主要做法', cls: 'tag-practice' },
      achievements: { name: '工作成效', cls: 'tag-result' },
      problems: { name: '存在问题', cls: 'tag-problem' },
      plans: { name: '下一步打算', cls: 'tag-plan' }
    };

    const bgPatterns = [/根据[《\u300a]/, /为贯彻落实/, /按照.*要求/, /为.*工作/, /依据.*规定/, /在.*领导下/, /^(近年来|202\d年|今年)/];
    const practicePatterns = [/一是|二是|三是/, /建立了|完善了|推进了|出台了|制定了|印发了/, /机制|体系|制度|办法/];
    const achievementPatterns = [/增长|提高|降低|减少|完成|突破|累计|同比增长/, /\d+\.?\d*%/, /[万亿千万]元/];
    const problemPatterns = [/但是|然而|不过|尽管/, /问题|不足|困难|挑战|短板|不到位|不够|不深|不实/];
    const planPatterns = [/下一步|今后|拟|接下来|未来/, /继续|持续|深化|加强|力争|确保/];

    const results = paras.map(para => {
      const scores = {
        background: bgPatterns.reduce((s, p) => s + (p.test(para) ? 1 : 0), 0) + (para.length < 100 ? 0.5 : 0),
        practices: practicePatterns.reduce((s, p) => s + (p.test(para) ? 1 : 0), 0),
        achievements: achievementPatterns.reduce((s, p) => s + (p.test(para) ? 1 : 0), 0),
        problems: problemPatterns.reduce((s, p) => s + (p.test(para) ? 1 : 0), 0),
        plans: planPatterns.reduce((s, p) => s + (p.test(para) ? 1 : 0), 0)
      };
      const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
      const label = sectionLabels[best[0]] || { name: '其他', cls: 'tag-other' };
      return { text: para, section: label, score: best[1] };
    });

    const output = document.getElementById('demo-classify-output');
    output.style.display = 'block';
    output.innerHTML = results.map(r =>
      `<div class="demo-result-item">
        <div class="demo-result-meta">
          <span class="demo-tag ${r.section.cls}">${r.section.name}</span>
          <span class="demo-confidence">置信度 ${Math.min(r.score * 25, 100)}%</span>
        </div>
        <div class="demo-result-text">${r.text}</div>
      </div>`
    ).join('');

    this.updateStatus('智能分类完成');
  },

  runDemoFormat() {
    let text = document.getElementById('demo-format-input').value.trim();
    if (!text) return;

    const fixes = [];

    const afterPunct = text.match(/([，。、；：！？""''（）])\s+/g);
    if (afterPunct) afterPunct.forEach(f => fixes.push(`移除标点后空格 "${f}"`));
    text = text.replace(/([，。、；：！？""''（）])\s+/g, '$1');

    const beforePunct = text.match(/\s+([，。、；：！？""''（）])/g);
    if (beforePunct) beforePunct.forEach(f => fixes.push(`移除标点前空格 "${f}"`));
    text = text.replace(/\s+([，。、；：！？""''（）])/g, '$1');

    const oralMap = { '咱们': '我公司', '做得不错': '取得一定成效', '搞': '推进', '弄': '处理' };
    for (const [oral, formal] of Object.entries(oralMap)) {
      if (text.includes(oral)) {
        text = text.replace(new RegExp(oral, 'g'), formal);
        fixes.push(`"${oral}" → "${formal}"`);
      }
    }

    const output = document.getElementById('demo-format-output');
    output.style.display = 'block';

    if (fixes.length > 0) {
      output.innerHTML = `
        <div class="demo-fix-summary">&#10003; 已修复 ${fixes.length} 项</div>
        <div class="demo-fix-list">${fixes.map(f => `<div>&#8226; ${f}</div>`).join('')}</div>
        <div class="demo-fix-result"><strong>修复后：</strong><br>${text}</div>`;
    } else {
      output.innerHTML = '<div class="demo-fix-empty">未检测到格式问题。</div>';
    }

    this.updateStatus('格式修复完成');
  },

  updateStatus(text) {
    const el = document.getElementById('status-text');
    if (el) el.textContent = text;
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => app.init());
