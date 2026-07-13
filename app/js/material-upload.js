// ==========================================
// 公文整合助手 - 素材上传与解析模块
// 供最终整合者批量收集团队成员材料
// ==========================================

const materialUploader = {
  // 当前处理的素材列表
  materials: [],

  // 文种列表（与 shared/doc-types/ 对齐）
  docTypes: [
    { id: 'presentation', name: '汇报材料', icon: '&#128200;', category: '常见正式材料', desc: '向上级或有关方面汇报工作、反映情况' },
    { id: 'report', name: '报告', icon: '&#128196;', category: '法定公文', desc: '向上级汇报工作、反映情况、回复询问' },
    { id: 'request', name: '请示', icon: '&#128221;', category: '法定公文', desc: '向上级请求指示、批准' },
    { id: 'notice', name: '通知', icon: '&#128227;', category: '法定公文', desc: '发布、传达、转发事项或安排部署工作' },
    { id: 'letter', name: '函', icon: '&#9993;', category: '法定公文', desc: '平行机关或不相隶属机关之间商洽、询问、答复' },
    { id: 'minutes', name: '纪要', icon: '&#128203;', category: '法定公文', desc: '记载会议主要情况和议定事项' },
    { id: 'briefing', name: '简报', icon: '&#128240;', category: '常见正式材料', desc: '简要报送动态、会议情况、阶段成果' },
    { id: 'speech', name: '讲话稿', icon: '&#127908;', category: '常见正式材料', desc: '领导讲话、会议发言、动员部署' },
    { id: 'summary', name: '工作总结', icon: '&#128209;', category: '常见正式材料', desc: '阶段性复盘、年度总结、专项工作总结' },
    { id: 'work-plan', name: '工作方案', icon: '&#128296;', category: '常见正式材料', desc: '专项行动、阶段性工作、项目推进' }
  ],

  selectedDocType: null,

  // 渲染上传页面
  renderUploadPage() {
    const hasMaterials = this.materials.length > 0;
    const selected = this.docTypes.find(d => d.id === this.selectedDocType);

    return `
      <div class="page-container">
        <div class="page-header">
          <h2>素材整合</h2>
        </div>

        <!-- 第一步：选择公文格式 -->
        <div class="card step-card">
          <div class="step-header">
            <div class="step-number">1</div>
            <div class="step-info">
              <h3>选择公文格式</h3>
              <p>选择目标文种，系统将按该格式的结构组织素材</p>
            </div>
            ${selected ? `<span class="badge badge-success">已选择：${selected.name}</span>` : '<span class="badge badge-warn">请选择</span>'}
          </div>
          <div class="doctype-grid">
            ${this.docTypes.map(dt => `
              <div class="doctype-card ${this.selectedDocType === dt.id ? 'selected' : ''}"
                   onclick="materialUploader.selectDocType('${dt.id}')">
                <div class="dt-icon">${dt.icon}</div>
                <div class="dt-name">${dt.name}</div>
                <div class="dt-category">${dt.category}</div>
              </div>
            `).join('')}
          </div>
          ${selected ? `
            <div class="template-preview">
              <div class="tp-header">
                <span class="tp-label">「${selected.name}」章节结构</span>
                <span class="tp-desc">${selected.desc}</span>
              </div>
              <div class="tp-sections">
                ${this.getTemplateSections(selected.id).map((sec, i) => `
                  <div class="tp-section ${sec.required ? 'required' : 'optional'}">
                    <span class="tp-sec-num">${i + 1}</span>
                    <span class="tp-sec-title">${sec.title}</span>
                    ${sec.required ? '<span class="tp-req">必填</span>' : '<span class="tp-opt">选填</span>'}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- 第二步：上传素材 -->
        <div class="card step-card ${!this.selectedDocType ? 'disabled' : ''}">
          <div class="step-header">
            <div class="step-number">2</div>
            <div class="step-info">
              <h3>上传团队素材</h3>
              <p>上传各成员的文字材料，支持 .txt、.md、.docx 格式</p>
            </div>
            ${!this.selectedDocType ? '<span class="badge badge-warn">请先选择公文格式</span>' : ''}
          </div>

          ${this.selectedDocType ? `
            <div class="upload-zone" id="upload-zone"
                 ondragover="materialUploader.handleDragOver(event)"
                 ondragleave="materialUploader.handleDragLeave(event)"
                 ondrop="materialUploader.handleDrop(event)"
                 onclick="document.getElementById('file-input').click()">
              <div class="upload-icon">&#128449;</div>
              <div class="upload-text">
                <strong>点击或拖拽上传素材</strong>
                <p>支持 .txt、.md、.docx（自动提取纯文本）格式</p>
                <p class="upload-hint">.docx 文件会自动提取文字内容，保留段落格式</p>
                <p class="upload-hint">每份素材建议文件名包含作者姓名，如：01-张三-改革进展.txt</p>
              </div>
              <input type="file" id="file-input" multiple accept=".txt,.md,.docx"
                     onchange="materialUploader.handleFileSelect(event)" hidden>
            </div>
          ` : `
            <div class="upload-zone disabled">
              <div class="upload-icon">&#128274;</div>
              <div class="upload-text">
                <strong>请先在上方选择公文格式</strong>
                <p>选择后即可上传素材</p>
              </div>
            </div>
          `}

          ${hasMaterials ? `
            <div class="materials-section">
              <h3>已收集素材 (${this.materials.length}份) — 将按「${selected.name}」格式处理</h3>
              <div class="materials-list">
                ${this.materials.map((m, i) => this.renderMaterialCard(m, i)).join('')}
              </div>
              <div class="materials-actions">
                <button class="btn btn-danger" onclick="materialUploader.clearAll()">
                  <span class="btn-icon">&#128465;</span> 清空全部
                </button>
                <button class="btn btn-primary" onclick="materialUploader.goToAlign()">
                  <span class="btn-icon">&#128295;</span> 开始格式对齐
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  // 获取模板章节
  getTemplateSections(docTypeId) {
    const sections = {
      presentation: [
        { id: 'background', title: '背景', required: true },
        { id: 'practices', title: '主要做法', required: true },
        { id: 'achievements', title: '工作成效', required: true },
        { id: 'problems', title: '存在问题', required: false },
        { id: 'plans', title: '下一步打算', required: false }
      ],
      report: [
        { id: 'background', title: '报告缘由', required: true },
        { id: 'practices', title: '主要做法', required: true },
        { id: 'achievements', title: '工作成效', required: true },
        { id: 'problems', title: '存在问题', required: true },
        { id: 'plans', title: '下一步打算', required: true }
      ],
      request: [
        { id: 'purpose', title: '请示缘由', required: true },
        { id: 'content', title: '请示事项', required: true },
        { id: 'requirements', title: '审批要求', required: true }
      ],
      notice: [
        { id: 'purpose', title: '通知事由', required: true },
        { id: 'content', title: '通知内容', required: true },
        { id: 'requirements', title: '执行要求', required: true }
      ],
      letter: [
        { id: 'purpose', title: '函询事由', required: true },
        { id: 'content', title: '函询内容', required: true },
        { id: 'requirements', title: '回复要求', required: false }
      ],
      minutes: [
        { id: 'basic', title: '会议基本情况', required: true },
        { id: 'content', title: '会议议定事项', required: true },
        { id: 'requirements', title: '贯彻落实要求', required: true }
      ],
      briefing: [
        { id: 'overview', title: '情况概述', required: true },
        { id: 'practices', title: '主要做法', required: true },
        { id: 'achievements', title: '工作成效', required: true },
        { id: 'problems', title: '存在问题', required: false },
        { id: 'plans', title: '下一步打算', required: false }
      ],
      speech: [
        { id: 'opening', title: '开场白', required: true },
        { id: 'content', title: '主要讲话内容', required: true },
        { id: 'closing', title: '结语', required: true }
      ],
      summary: [
        { id: 'overview', title: '总体情况', required: true },
        { id: 'practices', title: '主要做法', required: true },
        { id: 'achievements', title: '工作成效', required: true },
        { id: 'problems', title: '存在问题', required: true },
        { id: 'plans', title: '下一步打算', required: true }
      ],
      'work-plan': [
        { id: 'background', title: '工作背景与目标', required: true },
        { id: 'tasks', title: '主要任务', required: true },
        { id: 'measures', title: '保障措施', required: true },
        { id: 'schedule', title: '进度安排', required: false }
      ]
    };
    return sections[docTypeId] || sections.presentation;
  },

  // 选择文种
  selectDocType(docTypeId) {
    this.selectedDocType = docTypeId;
    window.selectedDocType = docTypeId;
    this.refreshPage();
  },

  // 渲染单个素材卡片
  renderMaterialCard(material, index) {
    const stats = this.analyzeMaterial(material);
    return `
      <div class="material-card" data-index="${index}">
        <div class="material-header">
          <div class="material-info">
            <span class="material-num">#${index + 1}</span>
            <span class="material-author">${material.author || '未识别作者'}</span>
            <span class="material-filename">${material.filename}</span>
          </div>
          <div class="material-stats">
            <span class="stat">${stats.wordCount} 字</span>
            <span class="stat">${stats.paragraphCount} 段</span>
            ${stats.hasTable ? '<span class="stat badge-table">含表格</span>' : ''}
          </div>
          <button class="btn-icon-only danger" onclick="materialUploader.removeMaterial(${index})" title="移除">&#128465;</button>
        </div>
        <div class="material-preview">
          <details>
            <summary>查看原文预览（前300字）</summary>
            <pre class="material-text">${material.text.substring(0, 300)}${material.text.length > 300 ? '...' : ''}</pre>
          </details>
        </div>
      </div>
    `;
  },

  // 拖拽处理
  handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  },
  handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  },
  handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    this.processFiles(files);
  },

  // 文件选择处理
  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.processFiles(files);
  },

  // 处理文件列表（支持 .txt/.md 和 .docx）
  async processFiles(files) {
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      let text;

      if (ext === 'docx') {
        try {
          text = await this.extractDocxText(file);
        } catch (err) {
          app.updateStatus(`解析 ${file.name} 失败: ${err.message}`);
          text = `[无法解析文件 ${file.name}，请转换为 .txt 格式后重试]`;
        }
      } else {
        text = await this.readFileAsText(file);
      }

      const material = this.parseMaterial(file.name, text);
      this.materials.push(material);
    }

    app.updateStatus(`已上传 ${this.materials.length} 份素材`);
    this.refreshPage();
  },

  // 读取文件为文本（Promise 封装）
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'UTF-8');
    });
  },

  // 提取 .docx 文件中的纯文本
  async extractDocxText(file) {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip 库未加载，无法解析 .docx 文件');
    }

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 读取 word/document.xml
    const docXml = await zip.file('word/document.xml')?.async('string');
    if (!docXml) {
      throw new Error('无法找到 word/document.xml');
    }

    // 解析 XML 提取文本
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXml, 'application/xml');

    // docx 的文本在 <w:t> 标签中
    const textNodes = xmlDoc.getElementsByTagName('w:t');
    let paragraphs = [];
    let currentPara = '';

    // 需要同时检查 <w:p> 段落标记来确定换行
    const allNodes = xmlDoc.getElementsByTagName('*');
    for (let i = 0; i < allNodes.length; i++) {
      const node = allNodes[i];
      if (node.tagName === 'w:p') {
        // 段落结束，收集该段落的文本
        const tNodes = node.getElementsByTagName('w:t');
        let paraText = '';
        for (let t of tNodes) {
          paraText += t.textContent;
        }
        if (paraText.trim()) {
          paragraphs.push(paraText.trim());
        }
      }
    }

    return paragraphs.join('\n\n');
  },

  // 解析单份素材
  parseMaterial(filename, text) {
    // 尝试从文件名提取作者
    const authorMatch = filename.match(/(?:\d+[-_])?(.+?)(?:[-_].+)?\.(txt|md|docx)$/i);
    const author = authorMatch ? authorMatch[1].trim() : filename.replace(/\.[^.]+$/, '');

    return {
      id: 'mat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      filename: filename,
      author: author,
      text: text,
      uploadedAt: new Date().toISOString(),
      aligned: false,
      alignedText: null,
      keyPoints: null
    };
  },

  // 分析素材统计
  analyzeMaterial(material) {
    const text = material.text;
    return {
      wordCount: text.replace(/\s/g, '').length,
      paragraphCount: text.split(/\n{2,}/).filter(p => p.trim()).length,
      hasTable: /\|.*\|/.test(text) || /^表\d+/.test(text),
      hasNumbers: /\d+\.?\d*/.test(text),
      hasPolicyRef: /(国发|国办发|中发|中办发|〔\d{4}〕|第\d+号)/.test(text)
    };
  },

  // 移除单个素材
  removeMaterial(index) {
    this.materials.splice(index, 1);
    this.refreshPage();
  },

  // 清空全部
  clearAll() {
    if (confirm('确定清空所有已上传素材吗？')) {
      this.materials = [];
      this.refreshPage();
    }
  },

  // 刷新页面
  refreshPage() {
    const container = document.getElementById('app-container');
    container.innerHTML = this.renderUploadPage();
  },

  // 进入格式对齐页面
  goToAlign() {
    if (this.materials.length === 0) {
      alert('请先上传素材');
      return;
    }
    if (!this.selectedDocType) {
      alert('请先选择公文格式');
      return;
    }
    // 存储到全局，供对齐页面使用
    window.currentMaterials = [...this.materials];
    window.selectedDocType = this.selectedDocType;
    app.navigate('align');
  }
};
