// ==========================================
// 公文整合助手 - 版本对比
// ==========================================

const versionCompare = {

  // 当前对比的项目 ID（运行时状态）
  _projectId: null,
  _originalData: null,
  _currentData: null,
  _diffResult: null,

  // 注入配套 CSS 样式
  _injectStyles() {
    if (document.getElementById('version-compare-styles')) return;
    const style = document.createElement('style');
    style.id = 'version-compare-styles';
    style.textContent = `
      /* 版本对比 - 操作区 */
      .compare-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .compare-actions select {
        padding: 6px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        font-family: inherit;
        font-size: 14px;
        background: var(--bg-card);
        color: var(--text-primary);
        cursor: pointer;
      }
      .compare-actions select:focus {
        outline: none;
        border-color: var(--primary-light);
      }

      /* 版本对比 - 双栏容器 */
      .compare-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        min-height: 400px;
      }
      @media (max-width: 768px) {
        .compare-container {
          grid-template-columns: 1fr;
        }
      }

      /* 版本对比 - 面板 */
      .compare-panel {
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 16px;
        background: var(--bg-card);
        overflow-y: auto;
        max-height: calc(100vh - var(--navbar-height) - var(--statusbar-height) - 180px);
      }
      .compare-panel h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border);
      }

      /* 版本对比 - 章节对比块 */
      .diff-section-block {
        margin-bottom: 16px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
      }
      .diff-section-heading {
        padding: 8px 12px;
        background: var(--bg-body);
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        border-bottom: 1px solid var(--border);
      }
      .diff-section-content {
        padding: 8px 12px;
      }

      /* 版本对比 - 差异行 */
      .diff-equal {
        padding: 2px 4px;
        color: var(--text-primary);
      }
      .diff-added {
        background: #d4edda;
        padding: 2px 4px;
        color: #155724;
      }
      .diff-deleted {
        background: #f8d7da;
        text-decoration: line-through;
        padding: 2px 4px;
        color: #721c24;
      }
      .diff-modified {
        background: #fff3cd;
        padding: 2px 4px;
        color: #856404;
      }
      .diff-line {
        font-size: 14px;
        line-height: 1.6;
        font-family: var(--font-base);
        white-space: pre-wrap;
        word-break: break-word;
      }
      .diff-empty-section {
        padding: 20px;
        text-align: center;
        color: var(--text-muted);
        font-size: 13px;
      }
      .diff-label {
        display: inline-block;
        font-size: 11px;
        font-weight: 600;
        padding: 0 4px;
        margin-right: 6px;
        border-radius: 2px;
      }
      .diff-label.added { background: #27ae60; color: #fff; }
      .diff-label.deleted { background: #c0392b; color: #fff; }
      .diff-label.modified { background: #f39c12; color: #fff; }

      /* 版本对比 - 统计摘要 */
      .diff-summary {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .diff-stat {
        font-size: 13px;
        color: var(--text-secondary);
      }
      .diff-stat .count {
        font-weight: 600;
        margin-left: 4px;
      }
      .diff-stat.added-stat .count { color: var(--success); }
      .diff-stat.deleted-stat .count { color: var(--danger); }
      .diff-stat.modified-stat .count { color: var(--warning); }
      .diff-stat.equal-stat .count { color: var(--text-muted); }
    `;
    document.head.appendChild(style);
  },

  // ------------------------------------------
  // 差异算法
  // ------------------------------------------

  // 执行整体对比
  compare(original, current) {
    if (!original || !current) {
      throw new Error('缺少对比数据');
    }

    const result = {
      sections: [],
      summary: { added: 0, deleted: 0, modified: 0, equal: 0 }
    };

    const origSections = original.sections || [];
    const currSections = current.sections || [];
    const maxLen = Math.max(origSections.length, currSections.length);

    for (let i = 0; i < maxLen; i++) {
      const origSec = origSections[i];
      const currSec = currSections[i];

      if (origSec && currSec) {
        // 两边都有该章节 —— 逐段对比内容
        const contentDiff = this.diffParagraphs(
          origSec.content || '',
          currSec.content || ''
        );

        // 标题是否变化
        const headingChanged = origSec.heading !== currSec.heading;

        // 统计差异
        const sectionChanges = {
          headingChanged: headingChanged,
          origHeading: origSec.heading || '',
          currHeading: currSec.heading || '',
          paragraphs: contentDiff
        };

        // 判断章节整体状态
        const hasContentChanges = contentDiff.some(d => d.type !== 'equal');
        if (headingChanged || hasContentChanges) {
          sectionChanges.status = 'modified';
          result.summary.modified++;
        } else {
          sectionChanges.status = 'equal';
          result.summary.equal++;
        }

        // 累计段落级统计
        contentDiff.forEach(d => {
          if (d.type === 'added') result.summary.added++;
          else if (d.type === 'deleted') result.summary.deleted++;
          else if (d.type === 'modified') result.summary.modified++;
          else result.summary.equal++;
        });

        result.sections.push(sectionChanges);
      } else if (origSec && !currSec) {
        // 当前版本删除了该章节
        result.sections.push({
          status: 'deleted',
          origHeading: origSec.heading || '',
          currHeading: '',
          paragraphs: [{ type: 'deleted', text: origSec.content || '' }]
        });
        result.summary.deleted++;
      } else {
        // 当前版本新增了该章节
        result.sections.push({
          status: 'added',
          origHeading: '',
          currHeading: currSec.heading || '',
          paragraphs: [{ type: 'added', text: currSec.content || '' }]
        });
        result.summary.added++;
      }
    }

    return result;
  },

  // 简单的文本差异算法（逐段落对比）
  diffParagraphs(originalText, currentText) {
    const origParagraphs = originalText.split('\n').filter(p => p.trim());
    const currParagraphs = currentText.split('\n').filter(p => p.trim());

    const diff = [];
    const maxLen = Math.max(origParagraphs.length, currParagraphs.length);

    for (let i = 0; i < maxLen; i++) {
      const orig = origParagraphs[i];
      const curr = currParagraphs[i];

      if (orig === curr) {
        diff.push({ type: 'equal', text: orig });
      } else if (orig && curr) {
        diff.push({ type: 'modified', original: orig, current: curr });
      } else if (orig && !curr) {
        diff.push({ type: 'deleted', text: orig });
      } else {
        diff.push({ type: 'added', text: curr });
      }
    }

    return diff;
  },

  // ------------------------------------------
  // 渲染
  // ------------------------------------------

  // 渲染对比页面
  renderCompare(projectId) {
    this._injectStyles();

    const project = projectManager.getProject(projectId);
    if (!project) {
      return '<div class="page-error">项目不存在</div>';
    }

    if (!project.originalData) {
      return '<div class="page-error">该项目没有原始版本数据，无法进行对比。</div>';
    }

    this._projectId = projectId;
    this._originalData = project.originalData;
    this._currentData = project.data;

    try {
      this._diffResult = this.compare(this._originalData, this._currentData);
    } catch (err) {
      return '<div class="page-error">对比失败：' + this._escapeHtml(err.message) + '</div>';
    }

    // 构建章节选项
    const origSections = this._originalData.sections || [];
    const currSections = this._currentData.sections || [];
    const allSectionTitles = [];
    const maxLen = Math.max(origSections.length, currSections.length);
    for (let i = 0; i < maxLen; i++) {
      const title = (currSections[i] || origSections[i] || {}).heading || ('章节 ' + (i + 1));
      allSectionTitles.push({ index: i, title: title });
    }

    let sectionOptions = '<option value="-1">全部章节</option>';
    allSectionTitles.forEach(s => {
      sectionOptions += `<option value="${s.index}">${s.index + 1}. ${this._escapeHtml(s.title)}</option>`;
    });

    const summary = this._diffResult.summary;

    return `
      <div class="page-container">
        <div class="page-header">
          <h2>版本对比</h2>
          <div class="compare-actions">
            <select id="compare-section" onchange="versionCompare.showSection(this.value)">
              ${sectionOptions}
            </select>
            <button class="btn btn-danger" onclick="versionCompare.restoreOriginal('${projectId}')">
              撤销到原始版本
            </button>
          </div>
        </div>

        <!-- 统计摘要 -->
        <div class="diff-summary">
          <span class="diff-stat added-stat">新增<span class="count">${summary.added}</span></span>
          <span class="diff-stat deleted-stat">删除<span class="count">${summary.deleted}</span></span>
          <span class="diff-stat modified-stat">修改<span class="count">${summary.modified}</span></span>
          <span class="diff-stat equal-stat">未变<span class="count">${summary.equal}</span></span>
        </div>

        <!-- 对比区域 -->
        <div class="compare-container">
          <div class="compare-panel compare-original">
            <h4>原始版本</h4>
            <div id="compare-original-content"></div>
          </div>
          <div class="compare-panel compare-current">
            <h4>当前版本</h4>
            <div id="compare-current-content"></div>
          </div>
        </div>
      </div>
    `;
  },

  // 渲染后初始化内容（需要在 DOM 就绪后调用）
  initCompareContent() {
    if (!this._diffResult) return;
    this.showSection('-1');
  },

  // 按章节切换显示
  showSection(sectionValue) {
    if (!this._diffResult) return;

    const origContainer = document.getElementById('compare-original-content');
    const currContainer = document.getElementById('compare-current-content');
    if (!origContainer || !currContainer) return;

    const sectionIndex = parseInt(sectionValue, 10);

    if (sectionIndex === -1) {
      // 显示全部章节
      origContainer.innerHTML = this._renderAllSectionsHtml(this._diffResult, 'original');
      currContainer.innerHTML = this._renderAllSectionsHtml(this._diffResult, 'current');
    } else {
      // 显示单个章节
      const sectionDiff = this._diffResult.sections[sectionIndex];
      if (!sectionDiff) {
        origContainer.innerHTML = '<div class="diff-empty-section">无内容</div>';
        currContainer.innerHTML = '<div class="diff-empty-section">无内容</div>';
        return;
      }
      const origHtml = this.renderSectionDiff(sectionDiff, 'original');
      const currHtml = this.renderSectionDiff(sectionDiff, 'current');
      origContainer.innerHTML = origHtml;
      currContainer.innerHTML = currHtml;
    }
  },

  // 渲染所有章节的 HTML
  _renderAllSectionsHtml(diffResult, side) {
    if (diffResult.sections.length === 0) {
      return '<div class="diff-empty-section">无章节内容</div>';
    }

    let html = '';
    diffResult.sections.forEach((sectionDiff, i) => {
      const statusIcon = sectionDiff.status === 'added' ? '<span class="diff-label added">新增</span>' :
                         sectionDiff.status === 'deleted' ? '<span class="diff-label deleted">删除</span>' :
                         sectionDiff.status === 'modified' ? '<span class="diff-label modified">修改</span>' : '';

      const heading = side === 'original' ? sectionDiff.origHeading : sectionDiff.currHeading;

      html += `
        <div class="diff-section-block">
          <div class="diff-section-heading">
            ${statusIcon}${i + 1}. ${this._escapeHtml(heading || '(无标题)')}
          </div>
          <div class="diff-section-content">
            ${this.renderSectionDiff(sectionDiff, side)}
          </div>
        </div>
      `;
    });

    return html;
  },

  // 渲染单章节对比（原始侧 / 当前侧）
  renderSectionDiff(sectionDiff, side) {
    if (!sectionDiff || !sectionDiff.paragraphs) {
      return '';
    }

    let html = '';

    // 如果标题发生变化，在顶部显示
    if (sectionDiff.headingChanged) {
      if (side === 'original') {
        html += `<div class="diff-line diff-deleted">${this._escapeHtml(sectionDiff.origHeading)}</div>`;
      } else {
        html += `<div class="diff-line diff-added">${this._escapeHtml(sectionDiff.currHeading)}</div>`;
      }
    }

    // 逐段渲染
    sectionDiff.paragraphs.forEach(p => {
      switch (p.type) {
        case 'equal':
          html += `<div class="diff-line diff-equal">${this._escapeHtml(p.text)}</div>`;
          break;
        case 'added':
          if (side === 'current') {
            html += `<div class="diff-line diff-added">${this._escapeHtml(p.text)}</div>`;
          }
          // 原始侧不显示新增内容
          break;
        case 'deleted':
          if (side === 'original') {
            html += `<div class="diff-line diff-deleted">${this._escapeHtml(p.text)}</div>`;
          }
          // 当前侧不显示删除内容
          break;
        case 'modified':
          if (side === 'original') {
            html += `<div class="diff-line diff-modified">${this._escapeHtml(p.original)}</div>`;
          } else {
            html += `<div class="diff-line diff-modified">${this._escapeHtml(p.current)}</div>`;
          }
          break;
      }
    });

    // 章节整体为新增或删除时
    if (sectionDiff.status === 'added' && side === 'original') {
      html = '<div class="diff-empty-section">（该章节为新增）</div>';
    }
    if (sectionDiff.status === 'deleted' && side === 'current') {
      html = '<div class="diff-empty-section">（该章节已被删除）</div>';
    }

    return html || '<div class="diff-empty-section">（空）</div>';
  },

  // ------------------------------------------
  // 撤销操作
  // ------------------------------------------

  // 撤销到原始版本
  restoreOriginal(projectId) {
    if (!projectId) {
      alert('缺少项目 ID');
      return;
    }

    const project = projectManager.getProject(projectId);
    if (!project) {
      alert('项目不存在');
      return;
    }

    if (!project.originalData) {
      alert('该项目没有原始版本数据，无法撤销。');
      return;
    }

    const msg = '确定要将文档恢复到原始版本吗？当前所有编辑内容将被覆盖，此操作不可撤销。';

    if (!confirm(msg)) {
      return;
    }

    try {
      projectManager.updateProject(projectId, {
        data: JSON.parse(JSON.stringify(project.originalData))
      });
      app.updateStatus('已恢复到原始版本');

      // 返回编辑器
      app.navigate('editor', { projectId: projectId });
    } catch (err) {
      alert('恢复失败：' + err.message);
    }
  },

  // ------------------------------------------
  // 工具方法
  // ------------------------------------------

  // HTML 转义
  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
