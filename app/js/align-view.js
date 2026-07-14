// ==========================================
// 公文整合助手 - 格式对齐与合并预览视图
// ==========================================

const alignView = {
  alignedMaterials: [],

  // ========== 格式对齐页面 ==========
  renderAlignPage() {
    const materials = window.currentMaterials || [];
    const docType = window.selectedDocType || materialUploader.selectedDocType || 'presentation';
    const selected = materialUploader.docTypes.find(d => d.id === docType);

    if (materials.length === 0) {
      return '<div class="page-container"><div class="page-error">请先上传素材</div></div>';
    }

    // 执行格式对齐、关键点检测、内容重组
    this.alignedMaterials = materials.map(m => {
      const alignedText = mergeEngine.alignMaterial(m);
      const keyPoints = mergeEngine.detectKeyPoints(alignedText, m.author);
      const restructured = mergeEngine.restructureMaterial({ ...m, alignedText }, docType);
      return {
        ...m,
        alignedText,
        keyPoints,
        restructured,
        aligned: true
      };
    });

    // 更新全局
    window.currentMaterials = this.alignedMaterials;

    let html = `
      <div class="page-container">
        <div class="page-header">
          <h2>格式对齐与关键提示</h2>
          <div class="page-actions">
            <span class="badge badge-info">文种：${selected ? selected.name : '未选择'}</span>
            <button class="btn btn-secondary" onclick="app.navigate('upload')">
              <span class="btn-icon">&#8592;</span> 返回上传
            </button>
            <button class="btn btn-primary" onclick="alignView.goToMerge()">
              <span class="btn-icon">&#128208;</span> 合并预览
            </button>
          </div>
        </div>

        <div class="align-summary">
          <div class="summary-card">
            <div class="summary-num">${this.alignedMaterials.length}</div>
            <div class="summary-label">已对齐素材</div>
          </div>
          <div class="summary-card">
            <div class="summary-num">${this.totalKeyPoints()}</div>
            <div class="summary-label">关键提示</div>
          </div>
          <div class="summary-card">
            <div class="summary-num">${this.totalWarnings()}</div>
            <div class="summary-label">待关注</div>
          </div>
        </div>

        <div class="align-notice">
          <strong>&#10003; 格式对齐完成</strong> — 所有素材已按「${selected ? selected.name : '汇报材料'}」结构智能重组。
          <span class="align-notice-sub">原文措辞完整保留，系统根据内容特征自动归类到对应章节。</span>
        </div>

        <div class="aligned-materials">
          ${this.alignedMaterials.map((m, i) => this.renderAlignedCard(m, i, docType)).join('')}
        </div>
      </div>
    `;

    return html;
  },

  renderAlignedCard(material, index, docType) {
    const kp = material.keyPoints;
    const warningCount = kp ? kp.points.filter(p => p.severity === 'warning').length : 0;
    const infoCount = kp ? kp.points.filter(p => p.severity === 'info').length : 0;
    const keyPointsHtml = kp ? this.renderKeyPointsByType(kp.byType) : '';

    // 重组分布
    const restructureHtml = material.restructured ? this.renderRestructure(material.restructured, docType) : '';

    // 带章节标注的原文
    const annotatedText = this.renderAnnotatedText(material);

    return `
      <div class="aligned-card">
        <div class="aligned-header">
          <div class="aligned-title">
            <span class="aligned-num">#${index + 1}</span>
            <span class="aligned-author">${material.author}</span>
            <span class="aligned-file">${material.filename}</span>
          </div>
          <div class="aligned-badges">
            ${warningCount > 0 ? `<span class="badge badge-warn">${warningCount} 项待关注</span>` : ''}
            ${infoCount > 0 ? `<span class="badge badge-info">${infoCount} 项提示</span>` : ''}
            <span class="badge badge-success">已重组</span>
          </div>
        </div>

        <div class="aligned-body">
          ${restructureHtml}

          <div class="aligned-preview">
            <details open>
              <summary>查看格式对齐后的原文（已标注所属栏目）</summary>
              <div class="aligned-text-actions">
                <button class="btn btn-sm btn-secondary" onclick="alignView.downloadAlignedText(${index})">
                  <span class="btn-icon">&#11015;</span> 下载标注原文
                </button>
              </div>
              <pre class="aligned-text annotated">${this.escapeHtml(annotatedText)}</pre>
            </details>
          </div>

          ${keyPointsHtml ? `
            <div class="keypoints-section">
              <h4>关键提示</h4>
              ${keyPointsHtml}
            </div>
          ` : ''}
        </details>

        <!-- 格式检测报告 -->
        ${this.renderComplianceReport(material, index)}
      </div>
    `;
  },

  renderComplianceReport(material, materialIndex) {
    const kp = material.keyPoints;
    if (!kp || kp.total === 0) return '';

    const warnings = kp.points.filter(p => p.severity === 'warning');
    const infos = kp.points.filter(p => p.severity === 'info');

    // 最多展示前5条
    const displayPoints = kp.points.slice(0, 5);
    const remaining = kp.points.length - 5;

    return `
      <div class="compliance-report">
        <div class="report-header" onclick="this.parentElement.classList.toggle('expanded')">
          <span class="report-icon">&#9888;</span>
          <span class="report-title">格式检测</span>
          <span class="report-count">${kp.total} 项提示</span>
          ${warnings.length > 0 ? `<span class="report-badge report-warning">${warnings.length} 处需关注</span>` : ''}
          <span class="report-toggle">&#9662;</span>
        </div>
        <div class="report-body">
          ${displayPoints.map((p, pi) => {
            const fixable = this.isFixable(p);
            return `
            <div class="report-item ${p.severity} ${fixable ? 'fixable' : ''}">
              <span class="report-severity ${p.severity}">${p.severity === 'warning' ? '注意' : '提示'}</span>
              <span class="report-message">${p.message}</span>
              ${fixable ? `<button class="btn btn-xs btn-success fix-btn" onclick="alignView.applyFix(${materialIndex}, ${pi})" title="一键修复此问题">&#10003; 一键修复</button>` : ''}
            </div>
          `}).join('')}
          ${remaining > 0 ? `<div class="report-more">还有 ${remaining} 项提示，可展开查看更多</div>` : ''}
        </div>
      </div>
    `;
  },

  isFixable(point) {
    // 可自动修复的检测项
    if (point.type === 'format') return true; // 标点前后空格
    if (point.type === 'oral') return true;   // 口语化表达
    if (point.type === 'verify') return true; // 待核实标记
    return false;
  },

  applyFix(materialIndex, pointIndex) {
    const material = this.alignedMaterials[materialIndex];
    if (!material || !material.keyPoints) return;

    const point = material.keyPoints.points[pointIndex];
    if (!point) return;

    let fixedText = material.alignedText;
    let fixed = false;

    if (point.type === 'format') {
      // 格式问题：移除标点前后的空格
      if (point.category === '标点前置空格') {
        fixedText = fixedText.replace(/\s+([，。、；：！？""''（）])/g, '$1');
        fixed = true;
      } else if (point.category === '标点后置空格') {
        fixedText = fixedText.replace(/([，。、；：！？""''（）])\s+/g, '$1');
        fixed = true;
      }
    } else if (point.type === 'oral') {
      // 口语化表达：替换为正式的公文用语
      const msg = point.message;
      // 从消息中提取建议项，如"建议改为"开展""推进""落实"" → 取第一个"开展"
      const suggestionMatch = msg.match(/建议改为[""「」](.+?)[""」]/);
      if (suggestionMatch) {
        const formal = suggestionMatch[1].split('"').filter(s => s.trim())[0];
        if (formal) {
          fixedText = fixedText.replace(new RegExp(this.escapeRegex(point.text), 'g'), formal);
          fixed = true;
        }
      }
    } else if (point.type === 'verify') {
      // 待核实标记：移除标记文字
      fixedText = fixedText.replace(new RegExp(this.escapeRegex(point.text), 'g'), '');
      fixed = true;
    }

    if (fixed) {
      material.alignedText = fixedText;
      // 重新检测关键点和重组
      const newKeyPoints = mergeEngine.detectKeyPoints(fixedText, material.author);
      material.keyPoints = newKeyPoints;
      const docType = window.selectedDocType || materialUploader.selectedDocType || 'presentation';
      material.restructured = mergeEngine.restructureMaterial({ ...material, alignedText: fixedText }, docType);
      // 更新全局
      window.currentMaterials = this.alignedMaterials;
      this.refreshPage();
      app.updateStatus('已修复 1 项格式问题');
    }
  },

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  refreshPage() {
    const container = document.getElementById('app-container');
    container.innerHTML = this.renderAlignPage();
  },

  // 生成带章节标注的原文（每段前加 [栏目名]）
  renderAnnotatedText(material) {
    if (!material.restructured || !material.restructured.classified) {
      return material.alignedText || '';
    }
    const lines = [];
    material.restructured.classified.forEach((item, i) => {
      const sectionTitle = item.assignedTitle || '其他';
      lines.push(`[${sectionTitle}] ${item.text}`);
    });
    return lines.join('\n\n');
  },

  // 下载带标注的对齐原文
  downloadAlignedText(index) {
    const material = this.alignedMaterials[index];
    if (!material) return;
    const text = this.renderAnnotatedText(material);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${material.author}_对齐标注.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // 渲染重组分布
  renderRestructure(restructured, docType) {
    const template = mergeEngine.getTemplate(docType);
    if (!template) return '';

    let html = '<div class="restructure-section">';
    html += '<h4>&#128260; 内容重组分布</h4>';
    html += '<p class="restructure-hint">系统根据内容特征，将原文段落自动归类到目标文种的对应章节</p>';
    html += '<div class="restructure-grid">';

    template.structure.sections.forEach(sec => {
      const secData = restructured.bySection[sec.id];
      const count = secData ? secData.paragraphs.length : 0;
      const hasContent = count > 0;

      html += `
        <div class="restructure-item ${hasContent ? 'has-content' : 'empty'}">
          <div class="rs-sec-header">
            <span class="rs-sec-title">${sec.title}</span>
            <span class="rs-sec-count">${count} 段</span>
          </div>
          ${hasContent ? `
            <div class="rs-paragraphs">
              ${secData.paragraphs.map((p, pi) => `
                <div class="rs-para" title="匹配度: ${Math.min(p.score * 100, 100).toFixed(0)}%">
                  <span class="rs-para-num">${pi + 1}</span>
                  <span class="rs-para-text">${p.text.substring(0, 60)}${p.text.length > 60 ? '...' : ''}</span>
                  <span class="rs-para-score">${Math.min(p.score * 100, 100).toFixed(0)}%</span>
                </div>
              `).join('')}
            </div>
          ` : '<div class="rs-empty">本素材未覆盖此章节</div>'}
        </div>
      `;
    });

    // 未分类内容
    const uncategorized = restructured.bySection['uncategorized'];
    if (uncategorized && uncategorized.paragraphs.length > 0) {
      html += `
        <div class="restructure-item uncategorized">
          <div class="rs-sec-header">
            <span class="rs-sec-title">其他内容</span>
            <span class="rs-sec-count">${uncategorized.paragraphs.length} 段</span>
          </div>
          <div class="rs-paragraphs">
            ${uncategorized.paragraphs.map((p, pi) => `
              <div class="rs-para">
                <span class="rs-para-num">${pi + 1}</span>
                <span class="rs-para-text">${p.text.substring(0, 60)}${p.text.length > 60 ? '...' : ''}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    html += '</div></div>';
    return html;
  },

  renderKeyPointsByType(groups) {
    const typeLabels = {
      data: { icon: '&#128202;', label: '数据点', class: 'kp-data' },
      policy: { icon: '&#128220;', label: '政策依据', class: 'kp-policy' },
      entity: { icon: '&#127970;', label: '机构/会议', class: 'kp-entity' },
      oral: { icon: '&#128483;', label: '口语化表达', class: 'kp-oral' },
      verify: { icon: '&#10067;', label: '待核实', class: 'kp-verify' }
    };

    let html = '';
    for (const [type, points] of Object.entries(groups)) {
      const meta = typeLabels[type] || { icon: '&#8226;', label: type, class: '' };
      html += `
        <div class="kp-group ${meta.class}">
          <div class="kp-group-title">
            <span class="kp-icon">${meta.icon}</span>
            <span>${meta.label}</span>
            <span class="kp-count">${points.length}</span>
          </div>
          <div class="kp-list">
            ${points.map(p => `
              <div class="kp-item ${p.severity}">
                <span class="kp-text">"${p.text}"</span>
                <span class="kp-msg">${p.message}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    return html;
  },

  totalKeyPoints() {
    return this.alignedMaterials.reduce((sum, m) => sum + (m.keyPoints?.total || 0), 0);
  },

  totalWarnings() {
    return this.alignedMaterials.reduce((sum, m) => {
      return sum + (m.keyPoints?.points.filter(p => p.severity === 'warning').length || 0);
    }, 0);
  },

  goToMerge() {
    app.navigate('merge');
  },

  // ========== 合并预览页面 ==========
  renderMergePage() {
    const materials = this.alignedMaterials.length > 0 ? this.alignedMaterials : (window.currentMaterials || []);
    const docType = window.selectedDocType || materialUploader.selectedDocType || 'presentation';
    const selected = materialUploader.docTypes.find(d => d.id === docType);

    if (materials.length === 0) {
      return '<div class="page-container"><div class="page-error">请先完成格式对齐</div></div>';
    }

    // 生成覆盖矩阵
    const matrix = mergeEngine.generateCoverageMatrix(materials, docType);

    // 执行合并
    const mergedDoc = mergeEngine.mergeMaterials(materials, docType);
    window.mergedDocument = mergedDoc;

    let html = `
      <div class="page-container">
        <div class="page-header">
          <h2>合并预览</h2>
          <div class="page-actions">
            <span class="badge badge-info">文种：${selected ? selected.name : '未选择'}</span>
            <button class="btn btn-secondary" onclick="app.navigate('align')">
              <span class="btn-icon">&#8592;</span> 返回对齐
            </button>
            <button class="btn btn-success" onclick="app.saveMergeAsProject()">
              <span class="btn-icon">&#128190;</span> 保存到项目
            </button>
            <button class="btn btn-primary" onclick="alignView.saveAndExport()">
              <span class="btn-icon">&#128190;</span> 导出文件
            </button>
          </div>
        </div>

        <!-- 覆盖矩阵 -->
        <div class="card">
          <h3>素材覆盖矩阵</h3>
          <p class="matrix-hint">（&#10003; = 该素材覆盖此章节，&#9744; = 未覆盖）</p>
          <div class="matrix-table-wrap">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th>章节</th>
                  ${materials.map(m => `<th>${m.author}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${matrix.map(row => `
                  <tr>
                    <td class="matrix-section">${row.section}</td>
                    ${row.coverage.map(c => `
                      <td class="matrix-cell ${c.hasContent ? 'covered' : 'empty'}">
                        ${c.hasContent ? '&#10003;' : '&#9744;'}
                      </td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 跨素材问题检测 -->
        ${this.renderCrossMaterialIssues(materials)}

        <!-- 合并预览 -->
        <div class="card">
          <h3>合并结果预览</h3>
          <div class="merge-meta">
            <div class="merge-field">
              <label>标题</label>
              <input type="text" id="merge-title" value="${mergedDoc.title}" onchange="alignView.updateTitle(this.value)">
            </div>
            <div class="merge-field">
              <label>发文单位</label>
              <input type="text" id="merge-sender" value="${mergedDoc.sender}" onchange="alignView.updateSender(this.value)">
            </div>
            <div class="merge-field">
              <label>日期</label>
              <input type="text" id="merge-date" value="${mergedDoc.date}" onchange="alignView.updateDate(this.value)">
            </div>
          </div>

          <div class="preview-page merge-preview" id="merge-preview">
            ${editor.renderDocumentPreview(mergedDoc)}
          </div>
        </div>
      </div>
    `;

    return html;
  },

  changeDocType(docType) {
    this.selectedDocType = docType;
    // 重新渲染
    const container = document.getElementById('app-container');
    container.innerHTML = this.renderMergePage();
  },

  updateTitle(val) { if (window.mergedDocument) window.mergedDocument.title = val; },
  updateSender(val) { if (window.mergedDocument) window.mergedDocument.sender = val; },
  updateDate(val) { if (window.mergedDocument) window.mergedDocument.date = val; },

  saveAndExport() {
    if (!window.mergedDocument) {
      alert('没有可保存的文档');
      return;
    }

    // 保存为项目
    const project = projectManager.createProject({
      title: window.mergedDocument.title,
      docType: window.mergedDocument.docType,
      docTypeName: window.mergedDocument.docTypeName,
      document: window.mergedDocument
    });

    app.updateStatus('合并文档已保存');
    app.navigate('editor', { projectId: project.id });
  },

  renderCrossMaterialIssues(materials) {
    const duplicates = mergeEngine.detectDuplicates(materials);
    const inconsistencies = mergeEngine.detectDataInconsistencies(materials);

    if (duplicates.length === 0 && inconsistencies.length === 0) {
      return '';
    }

    let html = '<div class="cross-material-issues">';

    if (duplicates.length > 0) {
      html += `
        <div class="issues-card">
          <h4>&#9888; 素材间重复/相似内容检测</h4>
          ${duplicates.map(d => `
            <div class="issue-item ${d.type}">
              <span class="issue-badge ${d.type}">${d.type === 'duplicate' ? '重复' : '相似'} ${d.similarity}%</span>
              <div class="issue-content">
                <div>${d.sourceA.text}</div>
                <div class="issue-authors">${d.sourceA.author} vs ${d.sourceB.author}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (inconsistencies.length > 0) {
      html += `
        <div class="issues-card">
          <h4>&#128269; 数据一致性检查</h4>
          ${inconsistencies.map(inc => `
            <div class="issue-item inconsistent">
              <span class="issue-badge inconsistent">数据冲突</span>
              <div class="issue-content">
                <div>同一数据出现不同数值：${inc.values.join(' vs ')}</div>
                <div class="issue-authors">涉及：${inc.sources.map(s => s.author).join('、')}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    html += '</div>';
    return html;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
