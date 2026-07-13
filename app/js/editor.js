// ==========================================
// 公文整合助手 - 编辑器
// ==========================================

const editor = {
  currentProject: null,
  editMode: false,

  // 渲染编辑器
  renderEditor(projectId) {
    this.currentProject = projectManager.getProject(projectId);
    if (!this.currentProject) {
      return '<div class="page-error">项目不存在</div>';
    }

    const doc = this.currentProject.data;

    let html = `
      <div class="editor-layout">
        <!-- 左侧边栏 -->
        <aside class="editor-sidebar">
          <div class="sidebar-section">
            <h4>文种信息</h4>
            <div class="doc-meta">
              <div class="meta-item">
                <label>文种</label>
                <span>${doc.docTypeName || ''}</span>
              </div>
              <div class="meta-item">
                <label>标题</label>
                <input type="text" value="${doc.title || ''}" onchange="editor.updateTitle(this.value)">
              </div>
              <div class="meta-item">
                <label>发文单位</label>
                <input type="text" value="${doc.sender || ''}" onchange="editor.updateSender(this.value)">
              </div>
              <div class="meta-item">
                <label>日期</label>
                <input type="text" value="${doc.date || ''}" onchange="editor.updateDate(this.value)">
              </div>
            </div>
          </div>

          <div class="sidebar-section">
            <h4>章节导航</h4>
            <nav class="section-nav">
              ${(doc.sections || []).map((sec, i) => `
                <a href="#section-${i}" class="section-link" onclick="editor.scrollToSection(${i}); return false;">${sec.heading}</a>
              `).join('')}
            </nav>
          </div>

          ${doc.complianceChecks && doc.complianceChecks.length > 0 ? `
            <div class="sidebar-section">
              <h4>合规提示 (${doc.complianceChecks.length})</h4>
              <div class="compliance-list">
                ${doc.complianceChecks.map(c => `
                  <div class="compliance-item ${c.severity}">
                    <span class="compliance-location">${c.location}</span>
                    <span class="compliance-message">${c.message}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </aside>

        <!-- 主编辑区 -->
        <div class="editor-main">
          <div class="editor-toolbar">
            <button class="btn btn-secondary" onclick="editor.toggleEditMode()">
              ${this.editMode ? '完成编辑' : '编辑'}
            </button>
            <button class="btn btn-primary" onclick="exporter.exportProject('${projectId}', 'docx')">导出 Word</button>
            <button class="btn btn-primary" onclick="exporter.exportProject('${projectId}', 'pdf')">导出 PDF</button>
            <button class="btn btn-secondary" onclick="exporter.exportProjectPptx('${projectId}', 'business')">导出PPT (商务)</button>
            <button class="btn btn-secondary" onclick="exporter.exportProjectPptx('${projectId}', 'party')">导出PPT (党建)</button>
          </div>

          <div class="preview-wrapper">
            <div class="preview-page" id="preview-page">
              ${this.renderDocumentPreview(doc)}
            </div>
          </div>
        </div>
      </div>
    `;

    return html;
  },

  // 渲染文档预览
  renderDocumentPreview(doc) {
    let html = `<div class="doc-title">${doc.title || ''}</div>`;

    if (doc.recipient) {
      html += `<div class="doc-recipient">${doc.recipient}：</div>`;
    }

    (doc.sections || []).forEach((sec, i) => {
      html += `<div class="section-block" id="section-${i}" data-index="${i + 1}">`;
      html += `<h${(sec.level || 1) + 1} class="section-heading">${sec.heading}</h${(sec.level || 1) + 1}>`;
      html += `<div class="section-content ${this.editMode ? 'editable' : ''}" onclick="editor.enterEdit(${i})">${this.formatContent(sec.content)}</div>`;
      html += `</div>`;
    });

    if (doc.notes) {
      html += `<div class="doc-notes">（${doc.notes}）</div>`;
    }

    html += `<div class="doc-signature">`;
    html += `<div>${doc.sender || ''}</div>`;
    html += `<div>${doc.date || ''}</div>`;
    html += `</div>`;

    return html;
  },

  // 格式化内容（换行转段落，支持 Markdown 表格）
  formatContent(text) {
    if (!text) return '<p class="doc-paragraph">&nbsp;</p>';

    const lines = text.split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 表格标题（表1：xxx）
      if (trimmed.match(/^表\d+\s*[：:]\s*/)) {
        blocks.push({ type: 'table-caption', text: trimmed });
        i++;
        continue;
      }

      // Markdown 表格
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          if (!lines[i].trim().match(/^\|[\s\-:]+\|/)) {
            tableLines.push(lines[i].trim());
          }
          i++;
        }

        if (tableLines.length >= 2) {
          const header = tableLines[0].slice(1, -1).split('|').map(c => c.trim());
          const rows = tableLines.slice(1).map(l =>
            l.slice(1, -1).split('|').map(c => c.trim())
          );
          blocks.push({ type: 'table', header, rows });
        }

        // 表格备注
        if (i < lines.length && lines[i].trim().match(/^(注[：:]?|备注[：:]?)/)) {
          blocks.push({ type: 'table-footer', text: lines[i].trim() });
          i++;
        }
        continue;
      }

      // 普通段落
      if (trimmed) {
        blocks.push({ type: 'paragraph', text: trimmed });
      }
      i++;
    }

    // 渲染为 HTML
    return blocks.map(block => {
      if (block.type === 'table-caption') {
        return `<div class="table-caption">${block.text}</div>`;
      }
      if (block.type === 'table') {
        const headerHtml = block.header.map(h => `<th>${h}</th>`).join('');
        const rowsHtml = block.rows.map(row => {
          const cellsHtml = row.map((cell, ci) => {
            const isNumber = /^[\+\-]?[\d,\.]+\s*(%|亿|万|元)?$/.test(cell.trim());
            const align = isNumber ? 'right' : 'center';
            return `<td style="text-align:${align}">${cell}</td>`;
          }).join('');
          return `<tr>${cellsHtml}</tr>`;
        }).join('');
        return `<table class="doc-table">
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>`;
      }
      if (block.type === 'table-footer') {
        return `<div class="table-footer">${block.text}</div>`;
      }
      return `<p class="doc-paragraph">${block.text}</p>`;
    }).join('');
  },

  // 进入编辑模式
  enterEdit(sectionIndex) {
    if (!this.editMode) return;
    const block = document.querySelector(`#section-${sectionIndex} .section-content`);
    if (!block) return;
    const currentText = this.currentProject.data.sections[sectionIndex].content;
    block.innerHTML = `<textarea class="edit-textarea" onblur="editor.saveEdit(${sectionIndex}, this.value)">${currentText}</textarea>`;
    const textarea = block.querySelector('textarea');
    if (textarea) {
      textarea.focus();
      // 自动调整高度
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  },

  // 保存编辑
  saveEdit(sectionIndex, newContent) {
    if (!this.currentProject) return;
    this.currentProject.data.sections[sectionIndex].content = newContent;
    this.currentProject.updatedAt = new Date().toISOString();
    projectManager.updateProject(this.currentProject.id, {
      data: this.currentProject.data,
      updatedAt: this.currentProject.updatedAt
    });
    app.updateStatus('已保存');

    // 重新渲染预览
    const preview = document.getElementById('preview-page');
    if (preview) {
      preview.innerHTML = this.renderDocumentPreview(this.currentProject.data);
    }
  },

  // 切换编辑模式
  toggleEditMode() {
    this.editMode = !this.editMode;
    const btn = document.querySelector('.editor-toolbar button');
    if (btn) btn.textContent = this.editMode ? '完成编辑' : '编辑';

    const blocks = document.querySelectorAll('.section-content');
    blocks.forEach(b => {
      b.classList.toggle('editable', this.editMode);
    });
  },

  // 更新元信息
  updateTitle(val) { if (this.currentProject) { this.currentProject.data.title = val; this.save(); } },
  updateSender(val) { if (this.currentProject) { this.currentProject.data.sender = val; this.save(); } },
  updateDate(val) { if (this.currentProject) { this.currentProject.data.date = val; this.save(); } },

  save() {
    if (!this.currentProject) return;
    projectManager.updateProject(this.currentProject.id, { data: this.currentProject.data });
    app.updateStatus('已保存');
    // 刷新预览中的标题
    const preview = document.getElementById('preview-page');
    if (preview) {
      preview.innerHTML = this.renderDocumentPreview(this.currentProject.data);
    }
  },

  scrollToSection(index) {
    const el = document.getElementById(`section-${index}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};
