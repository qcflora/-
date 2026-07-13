// ==========================================
// 公文整合助手 - AI 对话粘贴转换模块 v2
// 将智能体对话中的 Markdown 内容转为公文可用格式
// 升级：三线表渲染、表格标题自动识别、复杂Markdown支持
// ==========================================

const chatPaster = {
  convertedText: '',
  originalText: '',
  tables: [],

  // ========== 1. 渲染粘贴页面 ==========
  renderPage() {
    return `
      <div class="page-container">
        <div class="page-header">
          <h2>&#129302; 对话粘贴转换</h2>
          <div class="page-actions">
            <span class="badge badge-info">Markdown &rarr; 公文格式</span>
          </div>
        </div>

        <div class="chat-paste-layout">
          <!-- 左侧：输入区 -->
          <div class="chat-paste-input">
            <div class="card">
              <h3>&#9312; 粘贴 AI 对话内容</h3>
              <p class="hint-text">将从智能体（DeepSeek / ChatGPT / Claude / 文心一言等）对话中复制的 Markdown 内容粘贴到下方</p>
              <textarea
                id="chat-paste-textarea"
                class="chat-paste-textarea"
                placeholder="在此粘贴 Markdown 内容...

支持自动识别：
- 普通段落 &rarr; 公文段落（首行缩进）
- Markdown 表格 &rarr; 公文标准三线表
- 标题层级 &rarr; 章节标题
- 列表 &rarr; 分段文字
- 加粗/斜体 &rarr; 保留格式标记
- 代码块 &rarr; 等宽字体块"
                oninput="chatPaster.handleInput(this.value)"
              ></textarea>
              <div class="input-actions">
                <button class="btn btn-secondary" onclick="chatPaster.clear()">清空</button>
                <button class="btn btn-primary" onclick="chatPaster.convert()">转换格式</button>
              </div>
            </div>

            <!-- 转换统计 -->
            <div class="convert-stats" id="convert-stats" style="display:none">
              <div class="stat-item">
                <span class="stat-num" id="stat-paragraphs">0</span>
                <span class="stat-label">段落</span>
              </div>
              <div class="stat-item">
                <span class="stat-num" id="stat-tables">0</span>
                <span class="stat-label">表格</span>
              </div>
              <div class="stat-item">
                <span class="stat-num" id="stat-headings">0</span>
                <span class="stat-label">标题</span>
              </div>
            </div>
          </div>

          <!-- 右侧：预览与输出 -->
          <div class="chat-paste-output">
            <div class="card">
              <h3>&#9313; 转换结果预览</h3>
              <div class="output-tabs">
                <button class="output-tab active" onclick="chatPaster.switchTab('preview')">公文预览</button>
                <button class="output-tab" onclick="chatPaster.switchTab('source')">纯文本</button>
              </div>
              <div class="output-content" id="output-preview">
                <div class="empty-preview">粘贴内容后点击「转换格式」查看结果</div>
              </div>
              <div class="output-content" id="output-source" style="display:none">
                <pre class="source-code"></pre>
              </div>
            </div>

            <!-- 操作区 -->
            <div class="card action-card" id="action-card" style="display:none">
              <h3>&#9314; 后续操作</h3>
              <div class="action-buttons">
                <button class="btn btn-primary" onclick="chatPaster.toMaterial()">
                  <span class="btn-icon">&#128203;</span> 转为素材
                </button>
                <button class="btn btn-secondary" onclick="chatPaster.copyText()">
                  <span class="btn-icon">&#128203;</span> 复制文本
                </button>
                <button class="btn btn-secondary" onclick="chatPaster.downloadTxt()">
                  <span class="btn-icon">&#11015;</span> 下载 .txt
                </button>
              </div>
              <p class="action-hint">转为素材后，可直接进入「素材整合」流程进行格式对齐与合并</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ========== 2. 实时输入处理 ==========
  handleInput(value) {
    this.originalText = value;
  },

  clear() {
    document.getElementById('chat-paste-textarea').value = '';
    this.originalText = '';
    this.convertedText = '';
    this.tables = [];
    document.getElementById('output-preview').innerHTML = '<div class="empty-preview">粘贴内容后点击「转换格式」查看结果</div>';
    document.getElementById('output-source').querySelector('.source-code').textContent = '';
    document.getElementById('convert-stats').style.display = 'none';
    document.getElementById('action-card').style.display = 'none';
  },

  // ========== 3. 核心转换逻辑（v2增强） ==========
  convert() {
    const raw = this.originalText.trim();
    if (!raw) {
      alert('请先粘贴内容');
      return;
    }

    const result = this.parseMarkdown(raw);
    this.convertedText = result.text;
    this.tables = result.tables;

    // 更新统计
    document.getElementById('stat-paragraphs').textContent = result.paragraphCount;
    document.getElementById('stat-tables').textContent = result.tables.length;
    document.getElementById('stat-headings').textContent = result.headingCount;
    document.getElementById('convert-stats').style.display = 'flex';

    // 更新预览
    this.renderPreview(result);
    document.getElementById('output-source').querySelector('.source-code').textContent = this.convertedText;

    // 显示操作按钮
    document.getElementById('action-card').style.display = 'block';
    app.updateStatus('转换完成');
  },

  // Markdown 解析器（v2增强：支持更多元素）
  parseMarkdown(text) {
    const lines = text.split('\n');
    const blocks = [];
    let i = 0;
    let paragraphCount = 0;
    let headingCount = 0;
    const tables = [];

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 空行跳过
      if (trimmed === '') {
        i++;
        continue;
      }

      // Markdown 标题
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        blocks.push({ type: 'heading', level, text: title });
        headingCount++;
        i++;
        continue;
      }

      // 代码块 ```
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // 跳过结束 ```
        blocks.push({ type: 'code', lang, text: codeLines.join('\n') });
        paragraphCount++;
        continue;
      }

      // 引用块 >
      if (trimmed.startsWith('>')) {
        const quoteLines = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().slice(1).trim());
          i++;
        }
        blocks.push({ type: 'quote', text: quoteLines.join(' ') });
        paragraphCount++;
        continue;
      }

      // Markdown 表格
      if (trimmed.startsWith('|')) {
        // 检查上方是否有表格标题
        let tableTitle = null;
        if (blocks.length > 0) {
          const prev = blocks[blocks.length - 1];
          if (prev.type === 'paragraph' && prev.text.match(/^表\d*\s*[：:]\s*/)) {
            tableTitle = prev.text;
            blocks.pop(); // 从 blocks 中移除，将在表格中单独处理
            paragraphCount--;
          }
        }

        const tableResult = this.parseTable(lines, i);
        if (tableResult) {
          blocks.push({ type: 'table', ...tableResult, title: tableTitle });
          tables.push({ ...tableResult, title: tableTitle });
          i = tableResult.endIndex;
          continue;
        }
      }

      // 列表项
      const listMatch = trimmed.match(/^(\s*)([-*+]|\d+[.\)])\s+(.+)$/);
      if (listMatch) {
        const listItems = [];
        while (i < lines.length) {
          const li = lines[i].trim();
          if (li.match(/^(\s*)([-*+]|\d+[.\)])\s+/)) {
            listItems.push(li.replace(/^(\s*)([-*+]|\d+[.\)])\s+/, ''));
            i++;
          } else if (li === '' && i + 1 < lines.length && lines[i + 1].trim().match(/^(\s*)([-*+]|\d+[.\)])\s+/)) {
            i++;
          } else {
            break;
          }
        }
        blocks.push({ type: 'list', items: listItems });
        paragraphCount += listItems.length;
        continue;
      }

      // 分隔线 ---
      if (/^[-*]{3,}\s*$/.test(trimmed)) {
        blocks.push({ type: 'divider' });
        i++;
        continue;
      }

      // 普通段落（收集连续非空行，保留行内格式）
      const paraLines = [];
      while (i < lines.length && lines[i].trim() !== '') {
        const t = lines[i].trim();
        if (t.match(/^#{1,6}\s+/) || t.startsWith('|') || t.match(/^\s*[-*+\d][.\)]\s+/) ||
            t.startsWith('```') || t.startsWith('>') || /^[-*]{3,}\s*$/.test(t)) {
          break;
        }
        paraLines.push(lines[i].trim());
        i++;
      }
      if (paraLines.length > 0) {
        // 处理行内格式：加粗、斜体
        let text = paraLines.join(' ');
        text = this.processInlineMarkdown(text);
        blocks.push({ type: 'paragraph', text });
        paragraphCount++;
      }
      i++;
    }

    // 生成转换后的文本（公文格式）
    const outputLines = [];
    blocks.forEach((block, idx) => {
      if (block.type === 'heading') {
        outputLines.push(block.text);
        outputLines.push('');
      } else if (block.type === 'paragraph') {
        outputLines.push(block.text);
        outputLines.push('');
      } else if (block.type === 'list') {
        block.items.forEach(item => {
          outputLines.push(this.processInlineMarkdown(item));
        });
        outputLines.push('');
      } else if (block.type === 'table') {
        if (block.title) {
          outputLines.push(block.title);
        }
        outputLines.push(this.renderMarkdownTable(block));
        outputLines.push('');
      } else if (block.type === 'code') {
        outputLines.push('【代码片段' + (block.lang ? '：' + block.lang : '') + '】');
        outputLines.push(block.text);
        outputLines.push('');
      } else if (block.type === 'quote') {
        outputLines.push(block.text);
        outputLines.push('');
      } else if (block.type === 'divider') {
        outputLines.push('──────────');
        outputLines.push('');
      }
    });

    return {
      text: outputLines.join('\n').trim(),
      blocks,
      tables,
      paragraphCount,
      headingCount
    };
  },

  // 处理行内 Markdown（加粗、斜体、行内代码）
  processInlineMarkdown(text) {
    // 加粗 **text** 或 __text__
    text = text.replace(/\*\*(.+?)\*\*/g, '【$1】');
    text = text.replace(/__(.+?)__/g, '【$1】');
    // 斜体 *text* 或 _text_
    text = text.replace(/\*(.+?)\*/g, '$1');
    text = text.replace(/_(.+?)_/g, '$1');
    // 行内代码 `code`
    text = text.replace(/`(.+?)`/g, '「$1」');
    // 链接 [text](url)
    text = text.replace(/\[(.+?)\]\(.+?\)/g, '$1');
    return text;
  },

  // 解析 Markdown 表格（增强：检测对齐方式）
  parseTable(lines, startIndex) {
    const tableLines = [];
    let i = startIndex;

    while (i < lines.length) {
      const t = lines[i].trim();
      if (t.startsWith('|') && t.endsWith('|')) {
        tableLines.push(t);
        i++;
      } else {
        break;
      }
    }

    if (tableLines.length < 2) return null;

    // 检查第二行是否是分隔符 |---|---|
    const sepLine = tableLines[1];
    const isSeparator = /^\|[\s\-:|]+\|$/.test(sepLine);

    let headerLine, dataLines, alignments;
    if (isSeparator) {
      headerLine = tableLines[0];
      // 解析对齐方式
      alignments = this.parseAlignments(sepLine);
      dataLines = tableLines.slice(2);
    } else {
      headerLine = tableLines[0];
      alignments = [];
      dataLines = tableLines.slice(1);
    }

    const header = this.splitTableCells(headerLine);
    const rows = dataLines.map(l => this.splitTableCells(l));

    // 自动推断对齐方式（如果分隔行没有明确指定）
    if (alignments.length === 0) {
      alignments = this.inferAlignments(header, rows);
    }

    return {
      header,
      rows,
      alignments,
      endIndex: i,
      columnCount: header.length,
      rowCount: rows.length
    };
  },

  // 解析分隔行中的对齐方式
  parseAlignments(sepLine) {
    const inner = sepLine.slice(1, -1);
    return inner.split('|').map(c => {
      const trimmed = c.trim();
      if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
      if (trimmed.endsWith(':')) return 'right';
      if (trimmed.startsWith(':')) return 'left';
      return 'auto';
    });
  },

  // 自动推断列对齐方式
  inferAlignments(header, rows) {
    return header.map((h, ci) => {
      // 检查列名是否暗示数字
      if (/^(金额|数值|数量|比例|占比|完成率|增长率|排名|序号|编号|数量|人数|金额|收入|支出|预算|产值|产量)$/.test(h)) {
        return 'right';
      }
      // 检查该列大部分单元格是否是数字
      let numCount = 0;
      rows.forEach(row => {
        if (row[ci] && /^[\+\-]?[\d,\.]+\s*(%|亿|万|元|人|户|个|项|条)?$/.test(row[ci].trim())) {
          numCount++;
        }
      });
      if (rows.length > 0 && numCount / rows.length > 0.6) {
        return 'right';
      }
      return 'center';
    });
  },

  splitTableCells(line) {
    const inner = line.slice(1, -1);
    return inner.split('|').map(c => c.trim()).filter(c => c !== '');
  },

  // 渲染 Markdown 表格为公文表格格式
  renderMarkdownTable(table) {
    const header = table.header.map(h => `| ${h} `).join('') + '|';
    const separator = table.header.map(() => '| --- ').join('') + '|';
    const rows = table.rows.map(row => {
      return row.map(c => `| ${c} `).join('') + '|';
    });
    return [header, separator, ...rows].join('\n');
  },

  // ========== 4. 渲染预览（v2增强：三线表样式） ==========
  renderPreview(result) {
    const container = document.getElementById('output-preview');
    let html = '<div class="preview-page chat-paste-preview">';

    result.blocks.forEach(block => {
      if (block.type === 'heading') {
        const tag = `h${Math.min(block.level + 1, 6)}`;
        html += `<${tag} class="section-heading">${this.escapeHtml(block.text)}</${tag}>`;
      } else if (block.type === 'paragraph') {
        html += `<p class="doc-paragraph">${this.renderInlineHtml(block.text)}</p>`;
      } else if (block.type === 'list') {
        block.items.forEach(item => {
          html += `<p class="doc-paragraph">${this.renderInlineHtml(item)}</p>`;
        });
      } else if (block.type === 'table') {
        html += this.renderTableHtml(block);
      } else if (block.type === 'code') {
        html += `<div class="code-block"><div class="code-lang">${block.lang || '代码'}</div><pre>${this.escapeHtml(block.text)}</pre></div>`;
      } else if (block.type === 'quote') {
        html += `<div class="quote-block">${this.escapeHtml(block.text)}</div>`;
      } else if (block.type === 'divider') {
        html += '<hr class="doc-divider">';
      }
    });

    html += '</div>';
    container.innerHTML = html;
  },

  // 渲染行内格式为 HTML
  renderInlineHtml(text) {
    // 先将 HTML 特殊字符转义
    text = this.escapeHtml(text);
    // 恢复【加粗】标记为 strong
    text = text.replace(/【(.+?)】/g, '<strong>$1</strong>');
    // 恢复「行内代码」标记
    text = text.replace(/「(.+?)」/g, '<code>$1</code>');
    return text;
  },

  // 渲染表格为 HTML（三线表样式）
  renderTableHtml(table) {
    let html = '';

    // 表格标题
    if (table.title) {
      html += `<div class="table-caption">${this.escapeHtml(table.title)}</div>`;
    }

    // 表头
    const headerHtml = table.header.map((h, ci) => {
      const align = table.alignments[ci] || 'center';
      return `<th style="text-align:${align}">${this.escapeHtml(h)}</th>`;
    }).join('');

    // 数据行
    const rowsHtml = table.rows.map(row => {
      const cellsHtml = row.map((cell, ci) => {
        const align = table.alignments[ci] || 'center';
        return `<td style="text-align:${align}">${this.escapeHtml(cell)}</td>`;
      }).join('');
      return `<tr>${cellsHtml}</tr>`;
    }).join('');

    html += `<table class="doc-table three-line">
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;

    return html;
  },

  // ========== 5. 标签切换 ==========
  switchTab(tab) {
    document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    if (tab === 'preview') {
      document.getElementById('output-preview').style.display = 'block';
      document.getElementById('output-source').style.display = 'none';
    } else {
      document.getElementById('output-preview').style.display = 'none';
      document.getElementById('output-source').style.display = 'block';
    }
  },

  // ========== 6. 输出操作 ==========
  toMaterial() {
    if (!this.convertedText) {
      alert('请先转换内容');
      return;
    }

    const material = {
      id: 'chat-' + Date.now(),
      author: 'AI对话粘贴',
      filename: '对话转换_' + new Date().toLocaleDateString('zh-CN') + '.txt',
      text: this.convertedText,
      size: this.convertedText.length,
      uploadedAt: new Date().toISOString(),
      source: 'chat-paste'
    };

    // 添加到当前素材列表
    const existing = window.currentMaterials || [];
    existing.push(material);
    window.currentMaterials = existing;

    app.updateStatus('已转为素材，共 ' + existing.length + ' 份');

    // 询问是否跳转
    if (confirm('已成功转为素材！是否前往「素材整合」继续处理？')) {
      app.navigate('upload');
    }
  },

  copyText() {
    if (!this.convertedText) return;
    navigator.clipboard.writeText(this.convertedText).then(() => {
      app.updateStatus('已复制到剪贴板');
    });
  },

  downloadTxt() {
    if (!this.convertedText) return;
    const blob = new Blob([this.convertedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '对话转换_' + new Date().toLocaleDateString('zh-CN') + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
