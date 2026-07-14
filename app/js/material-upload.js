// ==========================================
// 公文整合助手 - 素材上传与解析模块 v2
// 升级：接入数据持久化、会话恢复、素材搜索、批量操作
// ==========================================

const materialUploader = {
  // 文种列表
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

  // 从持久化恢复会话
  init() {
    const session = dataStore.getSession();
    this.materials = session.materials || [];
    this.selectedDocType = session.selectedDocType || null;
    this.searchQuery = '';
    this.selectedMaterials = new Set();
    this.currentCarouselIndex = 0;
  },

  // 保存会话
  persist() {
    const session = dataStore.getSession();
    session.materials = this.materials;
    session.selectedDocType = this.selectedDocType;
    dataStore.saveSession(session);
  },

  // 渲染上传页面
  renderUploadPage() {
    const hasMaterials = this.materials.length > 0;
    const selected = this.docTypes.find(d => d.id === this.selectedDocType);
    const filteredMaterials = this.getFilteredMaterials();

    return `
      <div class="page-container">
        <div class="page-header">
          <h2>素材整合</h2>
          ${hasMaterials ? `<span class="badge badge-info">已收集 ${this.materials.length} 份素材</span>` : ''}
        </div>

        <!-- 会话状态提示 -->
        ${this.materials.length > 0 ? `
          <div class="session-bar">
            <span>&#128214; 当前会话已保存，刷新页面不会丢失</span>
            <button class="btn btn-sm btn-secondary" onclick="materialUploader.clearSession()">清空会话</button>
          </div>
        ` : ''}

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
              <p>支持 .txt、.md、.docx 格式，支持拖拽上传</p>
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
                <p class="upload-hint">建议文件名包含作者姓名，如：01-张三-改革进展.txt</p>
              </div>
              <input type="file" id="file-input" multiple accept=".txt,.md,.docx"
                     onchange="materialUploader.handleFileSelect(event)" hidden>
            </div>

            <!-- 加载指示器 -->
            <div class="loading-indicator" id="upload-loading" style="display:none;">
              <div class="spinner"></div>
              <span>正在解析文件...</span>
            </div>
          ` : ''}

          ${hasMaterials ? this.renderMaterialsSection(filteredMaterials, selected) : ''}
        </div>
      </div>
    `;
  },

  renderMaterialsSection(materials, selected) {
    const hasSelection = this.selectedMaterials.size > 0;
    const total = materials.length;
    // 限制当前索引不越界
    if (this.currentCarouselIndex >= total) this.currentCarouselIndex = Math.max(0, total - 1);
    const currentIndex = this.currentCarouselIndex;

    return `
      <div class="materials-section">
        <div class="materials-toolbar">
          <h3>已收集素材 (${materials.length}/${this.materials.length}份)</h3>
          <div class="toolbar-right">
            <!-- 搜索框 -->
            <div class="search-box">
              <input type="text"
                     placeholder="搜索素材内容..."
                     value="${this.searchQuery}"
                     oninput="materialUploader.handleSearch(this.value)"
                     onkeydown="if(event.key==='Enter') materialUploader.handleSearch(this.value)">
              <span class="search-icon">&#128269;</span>
            </div>
            ${hasSelection ? `
              <button class="btn btn-sm btn-danger" onclick="materialUploader.batchDelete()">
                删除选中 (${this.selectedMaterials.size})
              </button>
            ` : ''}
            <button class="btn btn-sm btn-danger" onclick="materialUploader.clearAll()">
              <span class="btn-icon">&#128465;</span> 清空全部
            </button>
          </div>
        </div>

        ${this.searchQuery && materials.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">&#128270;</div>
            <p>未找到包含「${this.escapeHtml(this.searchQuery)}」的素材</p>
          </div>
        ` : `
          ${total > 1 ? this.renderMaterialCarousel(materials, currentIndex) : ''}
          <div class="materials-list">
            ${total > 1
              ? this.renderMaterialCard(materials[currentIndex], this.materials.indexOf(materials[currentIndex]))
              : materials.map((m, i) => this.renderMaterialCard(m, i)).join('')
            }
          </div>
        `}

        <div class="materials-actions">
          <button class="btn btn-primary" onclick="materialUploader.goToAlign()" ${materials.length === 0 ? 'disabled' : ''}>
            <span class="btn-icon">&#128295;</span> 开始格式对齐
          </button>
        </div>
      </div>
    `;
  },

  renderMaterialCarousel(materials, currentIndex) {
    const actualIndex = this.materials.indexOf(materials[currentIndex]);
    const total = materials.length;
    return `
      <div class="material-carousel">
        <div class="carousel-controls">
          <button class="carousel-btn" onclick="materialUploader.navigateCarousel(-1)"
                  ${currentIndex <= 0 ? 'disabled' : ''} title="上一个素材">&#9664;</button>
          <div class="carousel-counter">
            <span class="carousel-current">${currentIndex + 1}</span>
            <span class="carousel-sep">/</span>
            <span class="carousel-total">${total}</span>
          </div>
          <button class="carousel-btn" onclick="materialUploader.navigateCarousel(1)"
                  ${currentIndex >= total - 1 ? 'disabled' : ''} title="下一个素材">&#9654;</button>
          <div class="carousel-slider-wrap">
            <input type="range" class="carousel-slider" min="1" max="${total}" value="${currentIndex + 1}"
                   oninput="materialUploader.jumpToMaterial(parseInt(this.value) - 1)">
          </div>
          <span class="carousel-label">素材 ${currentIndex + 1} / ${total}，共 ${this.materials.length} 份</span>
        </div>
      </div>
    `;
  },

  navigateCarousel(direction) {
    const filtered = this.getFilteredMaterials();
    this.currentCarouselIndex = Math.max(0, Math.min(filtered.length - 1, this.currentCarouselIndex + direction));
    this.refreshPage();
  },

  jumpToMaterial(index) {
    this.currentCarouselIndex = index;
    this.refreshPage();
  },

  getFilteredMaterials() {
    if (!this.searchQuery) return this.materials;
    const q = this.searchQuery.toLowerCase();
    return this.materials.filter(m =>
      m.text.toLowerCase().includes(q) ||
      m.author.toLowerCase().includes(q) ||
      m.filename.toLowerCase().includes(q)
    );
  },

  handleSearch(query) {
    this.searchQuery = query;
    this.refreshPage();
  },

  // 渲染单个素材卡片（v2 增强：选中状态）
  renderMaterialCard(material, index) {
    const stats = this.analyzeMaterial(material);
    const isSelected = this.selectedMaterials.has(index);
    const searchHighlight = this.searchQuery
      ? this.highlightSearch(material.text.substring(0, 200), this.searchQuery)
      : material.text.substring(0, 200);

    return `
      <div class="material-card ${isSelected ? 'selected' : ''}" data-index="${index}">
        <div class="material-header">
          <label class="material-checkbox">
            <input type="checkbox" ${isSelected ? 'checked' : ''}
                   onchange="materialUploader.toggleSelect(${index})">
          </label>
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
            <summary>查看原文预览（${stats.wordCount} 字）</summary>
            <pre class="material-text">${searchHighlight}${material.text.length > 200 ? '...' : ''}</pre>
          </details>
        </div>
      </div>
    `;
  },

  highlightSearch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },

  toggleSelect(index) {
    if (this.selectedMaterials.has(index)) {
      this.selectedMaterials.delete(index);
    } else {
      this.selectedMaterials.add(index);
    }
    this.refreshPage();
  },

  batchDelete() {
    if (!confirm(`确定删除选中的 ${this.selectedMaterials.size} 份素材吗？`)) return;
    const indices = Array.from(this.selectedMaterials).sort((a, b) => b - a);
    indices.forEach(idx => this.materials.splice(idx, 1));
    this.selectedMaterials.clear();
    this.persist();
    this.refreshPage();
  },

  // 清空会话
  clearSession() {
    if (!confirm('确定清空当前会话的所有素材吗？此操作不可撤销。')) return;
    this.materials = [];
    this.selectedDocType = null;
    this.searchQuery = '';
    this.selectedMaterials.clear();
    dataStore.clearSession();
    this.refreshPage();
  },

  // 其余方法保持不变...（selectDocType, processFiles, extractDocxText 等）

  selectDocType(docTypeId) {
    this.selectedDocType = docTypeId;
    window.selectedDocType = docTypeId;
    this.persist();
    this.refreshPage();
  },

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

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.processFiles(files);
  },

  async processFiles(files) {
    const loader = document.getElementById('upload-loading');
    if (loader) loader.style.display = 'flex';

    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      let text;

      try {
        if (ext === 'docx') {
          text = await this.extractDocxText(file);
        } else {
          text = await this.readFileAsText(file);
        }

        const material = this.parseMaterial(file.name, text);
        this.materials.push(material);
        app.updateStatus(`已解析 ${file.name}`);
      } catch (err) {
        console.error('解析失败:', err);
        app.updateStatus(`解析 ${file.name} 失败`);
      }
    }

    if (loader) loader.style.display = 'none';
    this.persist();
    this.refreshPage();
    app.updateStatus(`已上传 ${this.materials.length} 份素材`);
  },

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'UTF-8');
    });
  },

  async extractDocxText(file) {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip 库未加载，无法解析 .docx 文件');
    }
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXml = await zip.file('word/document.xml')?.async('string');
    if (!docXml) throw new Error('无法找到 word/document.xml');

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXml, 'application/xml');
    const paragraphs = [];
    const allNodes = xmlDoc.getElementsByTagName('*');

    for (let i = 0; i < allNodes.length; i++) {
      const node = allNodes[i];
      if (node.tagName === 'w:p') {
        const tNodes = node.getElementsByTagName('w:t');
        let paraText = '';
        for (let t of tNodes) paraText += t.textContent;
        if (paraText.trim()) paragraphs.push(paraText.trim());
      }
    }
    return paragraphs.join('\n\n');
  },

  parseMaterial(filename, text) {
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

  removeMaterial(index) {
    this.materials.splice(index, 1);
    this.selectedMaterials.delete(index);
    // 重新索引选中状态
    const newSelected = new Set();
    this.selectedMaterials.forEach(idx => {
      if (idx < index) newSelected.add(idx);
      else if (idx > index) newSelected.add(idx - 1);
    });
    this.selectedMaterials = newSelected;
    this.persist();
    this.refreshPage();
  },

  clearAll() {
    if (confirm('确定清空所有已上传素材吗？')) {
      this.materials = [];
      this.selectedMaterials.clear();
      this.persist();
      this.refreshPage();
    }
  },

  refreshPage() {
    const container = document.getElementById('app-container');
    container.innerHTML = this.renderUploadPage();
  },

  goToAlign() {
    if (this.materials.length === 0) {
      alert('请先上传素材');
      return;
    }
    if (!this.selectedDocType) {
      alert('请先选择公文格式');
      return;
    }
    window.currentMaterials = [...this.materials];
    window.selectedDocType = this.selectedDocType;
    app.navigate('align');
  },

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

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// 页面加载时恢复会话
materialUploader.init();
