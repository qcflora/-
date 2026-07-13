// ==========================================
// 公文整合助手 - 自定义模板系统
// ==========================================

const CUSTOM_TEMPLATE_STORAGE_KEY = 'custom-templates';

const customTemplate = {

  // 注入配套 CSS 样式
  _injectStyles() {
    if (document.getElementById('custom-template-styles')) return;
    const style = document.createElement('style');
    style.id = 'custom-template-styles';
    style.textContent = `
      /* 自定义模板编辑器 - 表单行布局 */
      .form-row {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
      }
      .form-row .form-group {
        flex: 1;
        margin-bottom: 0;
      }

      /* 自定义模板编辑器 - 选择框 */
      .form-group select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        font-family: inherit;
        font-size: 14px;
        background: var(--bg-card);
        color: var(--text-primary);
        transition: border-color 0.2s ease;
        cursor: pointer;
      }
      .form-group select:focus {
        outline: none;
        border-color: var(--primary-light);
        box-shadow: 0 0 0 3px rgba(26, 82, 118, 0.08);
      }

      /* 自定义模板编辑器 - 文本域 */
      .form-group textarea {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        font-family: inherit;
        font-size: 14px;
        min-height: 80px;
        resize: vertical;
        transition: border-color 0.2s ease;
      }
      .form-group textarea:focus {
        outline: none;
        border-color: var(--primary-light);
        box-shadow: 0 0 0 3px rgba(26, 82, 118, 0.08);
      }

      /* 自定义模板编辑器 - 复选框标签 */
      .checkbox-label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        color: var(--text-primary);
        cursor: pointer;
        user-select: none;
        margin-right: 20px;
        margin-bottom: 16px;
      }
      .checkbox-label input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      /* 自定义模板编辑器 - 章节构建器 */
      .section-builder {
        margin-bottom: 20px;
      }
      .section-builder h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        border-bottom: 1px solid var(--border);
        padding-bottom: 10px;
      }

      /* 自定义模板编辑器 - 章节行 */
      .ct-section-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: var(--bg-body);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        margin-bottom: 8px;
        flex-wrap: wrap;
      }
      .ct-section-row .section-title {
        flex: 2;
        min-width: 120px;
        padding: 6px 10px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        font-family: inherit;
        font-size: 14px;
      }
      .ct-section-row .section-title:focus {
        outline: none;
        border-color: var(--primary-light);
      }
      .ct-section-row .section-tip {
        flex: 3;
        min-width: 120px;
        padding: 6px 10px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        font-family: inherit;
        font-size: 14px;
      }
      .ct-section-row .section-tip:focus {
        outline: none;
        border-color: var(--primary-light);
      }
      .ct-section-row .section-number {
        font-size: 13px;
        color: var(--text-muted);
        font-weight: 500;
        min-width: 30px;
        text-align: center;
      }

      /* 自定义模板编辑器 - 操作按钮区 */
      .form-actions {
        display: flex;
        gap: 10px;
        padding-top: 16px;
        border-top: 1px solid var(--border);
        margin-top: 20px;
      }

      /* 自定义模板 - 标签标识 */
      .template-tag {
        display: inline-block;
        font-size: 11px;
        padding: 1px 8px;
        border-radius: 10px;
        font-weight: 500;
        margin-left: 6px;
      }
      .template-tag.builtin {
        background: rgba(52, 152, 219, 0.1);
        color: var(--info);
      }
      .template-tag.custom {
        background: rgba(39, 174, 96, 0.1);
        color: var(--success);
      }

      /* 自定义模板 - 管理按钮组 */
      .template-custom-actions {
        display: flex;
        gap: 6px;
        margin-top: 8px;
        justify-content: center;
      }
      .template-custom-actions .btn {
        font-size: 12px;
        padding: 4px 10px;
      }
    `;
    document.head.appendChild(style);
  },

  // ------------------------------------------
  // 数据 CRUD
  // ------------------------------------------

  // 获取所有自定义模板
  getAll() {
    const data = localStorage.getItem(CUSTOM_TEMPLATE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // 保存全部自定义模板到 localStorage
  _saveAll(templates) {
    localStorage.setItem(CUSTOM_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  },

  // 根据 ID 获取单个自定义模板
  getById(id) {
    return this.getAll().find(t => t.id === id) || null;
  },

  // 创建自定义模板
  create(definition) {
    if (!definition || !definition.name || !definition.name.trim()) {
      throw new Error('模板名称不能为空');
    }

    const templates = this.getAll();
    const id = 'custom-' + Date.now();
    const template = {
      id: id,
      name: definition.name.trim(),
      aliases: Array.isArray(definition.aliases) ? definition.aliases : [],
      category: 'custom',
      fontProfile: definition.fontProfile || 'internal-readable',
      layoutProfile: definition.layoutProfile || 'internal-readable',
      description: (definition.description || '').trim(),
      structure: {
        sections: (definition.sections || []).map((sec, i) => ({
          id: sec.id || 'sec-' + (i + 1),
          title: sec.title || '',
          required: sec.required !== undefined ? sec.required : true,
          writingTip: sec.writingTip || ''
        })),
        ending: definition.ending || '',
        hasRecipient: definition.hasRecipient !== undefined ? definition.hasRecipient : false,
        hasAttachments: definition.hasAttachments !== undefined ? definition.hasAttachments : false,
        hasNotes: definition.hasNotes !== undefined ? definition.hasNotes : false,
        subTypes: []
      },
      writingTips: (definition.writingTips || '').trim(),
      complianceRules: Array.isArray(definition.complianceRules) ? definition.complianceRules : [],
      isCustom: true
    };

    templates.push(template);
    this._saveAll(templates);
    return template;
  },

  // 更新自定义模板
  update(id, updates) {
    const templates = this.getAll();
    const idx = templates.findIndex(t => t.id === id);
    if (idx === -1) {
      throw new Error('未找到模板：' + id);
    }

    const existing = templates[idx];

    // 更新基本字段
    if (updates.name !== undefined) existing.name = updates.name.trim();
    if (updates.description !== undefined) existing.description = updates.description.trim();
    if (updates.aliases !== undefined) existing.aliases = updates.aliases;
    if (updates.fontProfile !== undefined) existing.fontProfile = updates.fontProfile;
    if (updates.layoutProfile !== undefined) existing.layoutProfile = updates.layoutProfile;
    if (updates.writingTips !== undefined) existing.writingTips = updates.writingTips.trim();
    if (updates.complianceRules !== undefined) existing.complianceRules = updates.complianceRules;

    // 更新结构
    if (updates.structure) {
      if (updates.structure.sections) {
        existing.structure.sections = updates.structure.sections.map((sec, i) => ({
          id: sec.id || 'sec-' + (i + 1),
          title: sec.title || '',
          required: sec.required !== undefined ? sec.required : true,
          writingTip: sec.writingTip || ''
        }));
      }
      if (updates.structure.ending !== undefined) existing.structure.ending = updates.structure.ending;
      if (updates.structure.hasRecipient !== undefined) existing.structure.hasRecipient = updates.structure.hasRecipient;
      if (updates.structure.hasAttachments !== undefined) existing.structure.hasAttachments = updates.structure.hasAttachments;
      if (updates.structure.hasNotes !== undefined) existing.structure.hasNotes = updates.structure.hasNotes;
    }

    templates[idx] = existing;
    this._saveAll(templates);
    return existing;
  },

  // 删除自定义模板
  delete(id) {
    const templates = this.getAll();
    const filtered = templates.filter(t => t.id !== id);
    if (filtered.length === templates.length) {
      throw new Error('未找到模板：' + id);
    }
    this._saveAll(filtered);
  },

  // ------------------------------------------
  // 导入 / 导出
  // ------------------------------------------

  // 导出为 JSON 文件（触发浏览器下载）
  exportToFile(id) {
    const template = this.getById(id);
    if (!template) {
      alert('未找到该模板，导出失败。');
      return;
    }

    const jsonStr = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = (template.name || '自定义模板') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    app.updateStatus('模板已导出');
  },

  // 从文件导入
  importFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('未选择文件'));
        return;
      }

      if (!file.name.endsWith('.json')) {
        reject(new Error('仅支持 .json 格式文件'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);

          // 基本格式校验
          if (!data.name || typeof data.name !== 'string') {
            reject(new Error('无效的模板文件：缺少模板名称'));
            return;
          }
          if (!data.structure || !Array.isArray(data.structure.sections)) {
            reject(new Error('无效的模板文件：缺少章节结构'));
            return;
          }

          // 分配新 ID 避免冲突
          data.id = 'custom-' + Date.now();
          data.category = 'custom';
          data.isCustom = true;

          // 确保结构字段完整
          data.structure.ending = data.structure.ending || '';
          data.structure.hasRecipient = data.structure.hasRecipient !== undefined ? data.structure.hasRecipient : false;
          data.structure.hasAttachments = data.structure.hasAttachments !== undefined ? data.structure.hasAttachments : false;
          data.structure.hasNotes = data.structure.hasNotes !== undefined ? data.structure.hasNotes : false;
          data.structure.subTypes = data.structure.subTypes || [];

          const templates = this.getAll();
          templates.push(data);
          this._saveAll(templates);

          resolve(data);
        } catch (err) {
          reject(new Error('文件解析失败：' + err.message));
        }
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };

      reader.readAsText(file);
    });
  },

  // ------------------------------------------
  // 渲染模板编辑器（创建/编辑页面）
  // ------------------------------------------

  // 渲染编辑器 HTML
  renderEditor(templateId) {
    this._injectStyles();

    const isEdit = !!templateId;
    const template = isEdit ? this.getById(templateId) : null;
    const pageTitle = isEdit ? '编辑自定义模板' : '创建自定义模板';

    if (isEdit && !template) {
      return '<div class="page-error">未找到该模板</div>';
    }

    const sections = template ? template.structure.sections : [{ id: 'sec-1', title: '', required: true, writingTip: '' }];

    let sectionsHtml = '';
    sections.forEach((sec, i) => {
      sectionsHtml += this._renderSectionRow(sec, i);
    });

    return `
      <div class="page-container">
        <div class="page-header">
          <h2>${pageTitle}</h2>
        </div>
        <div class="card">
          <!-- 隐藏字段：编辑时保存模板 ID -->
          ${isEdit ? '<input type="hidden" id="ct-edit-id" value="' + template.id + '">' : ''}

          <!-- 基本信息 -->
          <div class="form-group">
            <label>模板名称</label>
            <input type="text" id="ct-name" value="${isEdit ? this._escapeHtml(template.name) : ''}" placeholder="如：工作汇报模板">
          </div>
          <div class="form-group">
            <label>模板描述</label>
            <textarea id="ct-desc" placeholder="简要描述模板用途">${isEdit ? this._escapeHtml(template.description) : ''}</textarea>
          </div>

          <!-- 字体/版式方案选择 -->
          <div class="form-row">
            <div class="form-group">
              <label>字体方案</label>
              <select id="ct-font-profile">
                <option value="official-standard" ${isEdit && template.fontProfile === 'official-standard' ? 'selected' : ''}>法定公文标准</option>
                <option value="internal-readable" ${(!isEdit || template.fontProfile === 'internal-readable') ? 'selected' : ''}>内部材料</option>
                <option value="speech-readable" ${isEdit && template.fontProfile === 'speech-readable' ? 'selected' : ''}>讲话稿</option>
              </select>
            </div>
            <div class="form-group">
              <label>版式方案</label>
              <select id="ct-layout-profile">
                <option value="official-standard" ${isEdit && template.layoutProfile === 'official-standard' ? 'selected' : ''}>法定公文标准</option>
                <option value="internal-readable" ${(!isEdit || template.layoutProfile === 'internal-readable') ? 'selected' : ''}>内部材料</option>
                <option value="speech-readable" ${isEdit && template.layoutProfile === 'speech-readable' ? 'selected' : ''}>讲话稿</option>
              </select>
            </div>
          </div>

          <!-- 特殊元素开关 -->
          <div style="margin-bottom: 16px;">
            <label class="checkbox-label">
              <input type="checkbox" id="ct-has-recipient" ${isEdit && template.structure.hasRecipient ? 'checked' : ''}> 包含主送单位
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="ct-has-attachments" ${isEdit && template.structure.hasAttachments ? 'checked' : ''}> 包含附件
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="ct-has-notes" ${isEdit && template.structure.hasNotes ? 'checked' : ''}> 包含附注
            </label>
          </div>

          <!-- 章节结构 -->
          <div class="section-builder">
            <h3>章节结构</h3>
            <div id="ct-sections">
              ${sectionsHtml}
            </div>
            <button class="btn btn-secondary" onclick="customTemplate.addSection()">
              + 添加章节
            </button>
          </div>

          <!-- 结尾用语 -->
          <div class="form-group">
            <label>结尾用语</label>
            <input type="text" id="ct-ending" value="${isEdit ? this._escapeHtml(template.structure.ending || '') : ''}" placeholder="如：特此通知。（留空则无固定结尾）">
          </div>

          <!-- 写作提示 -->
          <div class="form-group">
            <label>整体写作提示</label>
            <textarea id="ct-tips" placeholder="为使用此模板的人提供写作指导">${isEdit ? this._escapeHtml(template.writingTips || '') : ''}</textarea>
          </div>

          <!-- 操作按钮 -->
          <div class="form-actions">
            <button class="btn btn-primary" onclick="customTemplate.saveTemplate()">保存模板</button>
            <button class="btn btn-secondary" onclick="app.navigate('templates')">取消</button>
          </div>
        </div>
      </div>
    `;
  },

  // 渲染单个章节行
  _renderSectionRow(section, index) {
    return `
      <div class="ct-section-row" data-index="${index}">
        <span class="section-number">${index + 1}</span>
        <input type="text" class="section-title" placeholder="章节标题" value="${this._escapeHtml(section.title || '')}">
        <label class="checkbox-label">
          <input type="checkbox" class="section-required" ${section.required ? 'checked' : ''}> 必填
        </label>
        <input type="text" class="section-tip" placeholder="写作提示（可选）" value="${this._escapeHtml(section.writingTip || '')}">
        <button class="btn-icon-only danger" onclick="customTemplate.removeSection(${index})" title="删除">&#10005;</button>
      </div>
    `;
  },

  // 动态添加章节
  addSection() {
    const container = document.getElementById('ct-sections');
    if (!container) return;

    const rows = container.querySelectorAll('.ct-section-row');
    const newIndex = rows.length;

    const newSection = {
      id: 'sec-' + (newIndex + 1),
      title: '',
      required: true,
      writingTip: ''
    };

    const div = document.createElement('div');
    div.innerHTML = this._renderSectionRow(newSection, newIndex);
    container.appendChild(div.firstElementChild);
  },

  // 动态移除章节
  removeSection(index) {
    const container = document.getElementById('ct-sections');
    if (!container) return;

    const rows = container.querySelectorAll('.ct-section-row');
    if (rows.length <= 1) {
      alert('至少需要保留一个章节');
      return;
    }

    const targetRow = container.querySelector(`.ct-section-row[data-index="${index}"]`);
    if (targetRow) {
      targetRow.remove();
      // 重新编号
      this._reindexSections();
    }
  },

  // 重新编号章节行
  _reindexSections() {
    const container = document.getElementById('ct-sections');
    if (!container) return;

    const rows = container.querySelectorAll('.ct-section-row');
    rows.forEach((row, i) => {
      row.setAttribute('data-index', i);
      row.querySelector('.section-number').textContent = i + 1;
      const removeBtn = row.querySelector('.btn-icon-only.danger');
      if (removeBtn) {
        removeBtn.setAttribute('onclick', `customTemplate.removeSection(${i})`);
      }
    });
  },

  // 从表单收集数据
  collectFromForm() {
    const editIdEl = document.getElementById('ct-edit-id');
    const isEdit = editIdEl && editIdEl.value;

    const name = (document.getElementById('ct-name').value || '').trim();
    if (!name) {
      throw new Error('请输入模板名称');
    }

    const description = (document.getElementById('ct-desc').value || '').trim();
    const fontProfile = (document.getElementById('ct-font-profile').value || 'internal-readable');
    const layoutProfile = (document.getElementById('ct-layout-profile').value || 'internal-readable');
    const hasRecipient = document.getElementById('ct-has-recipient').checked;
    const hasAttachments = document.getElementById('ct-has-attachments').checked;
    const hasNotes = document.getElementById('ct-has-notes').checked;
    const ending = (document.getElementById('ct-ending').value || '').trim();
    const writingTips = (document.getElementById('ct-tips').value || '').trim();

    // 收集章节
    const sectionRows = document.querySelectorAll('#ct-sections .ct-section-row');
    const sections = [];
    sectionRows.forEach((row, i) => {
      const title = (row.querySelector('.section-title').value || '').trim();
      const required = row.querySelector('.section-required').checked;
      const writingTip = (row.querySelector('.section-tip').value || '').trim();
      sections.push({
        id: 'sec-' + (i + 1),
        title: title,
        required: required,
        writingTip: writingTip
      });
    });

    // 校验：至少有一个章节有标题
    const hasValidSection = sections.some(s => s.title.length > 0);
    if (!hasValidSection) {
      throw new Error('请至少填写一个章节标题');
    }

    return {
      id: isEdit ? editIdEl.value : undefined,
      name: name,
      description: description,
      fontProfile: fontProfile,
      layoutProfile: layoutProfile,
      sections: sections,
      ending: ending,
      hasRecipient: hasRecipient,
      hasAttachments: hasAttachments,
      hasNotes: hasNotes,
      writingTips: writingTips
    };
  },

  // 保存模板（创建或更新）
  saveTemplate() {
    try {
      const formData = this.collectFromForm();

      if (formData.id) {
        // 更新
        this.update(formData.id, {
          name: formData.name,
          description: formData.description,
          fontProfile: formData.fontProfile,
          layoutProfile: formData.layoutProfile,
          structure: {
            sections: formData.sections,
            ending: formData.ending,
            hasRecipient: formData.hasRecipient,
            hasAttachments: formData.hasAttachments,
            hasNotes: formData.hasNotes
          },
          writingTips: formData.writingTips
        });
        app.updateStatus('模板已更新');
      } else {
        // 创建
        this.create(formData);
        app.updateStatus('模板已创建');
      }

      app.navigate('templates');
    } catch (err) {
      alert(err.message);
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
