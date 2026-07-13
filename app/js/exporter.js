// ==========================================
// 公文整合助手 - 导出器
// ==========================================

const exporter = {
  // 导出项目
  async exportProject(projectId, format) {
    const project = projectManager.getProject(projectId);
    if (!project) return;

    app.updateStatus(`正在导出 ${format.toUpperCase()}...`);

    try {
      if (format === 'docx') {
        await this.exportToDocx(project.data);
      } else if (format === 'pdf') {
        await this.exportToPdf(project.data);
      }
      app.updateStatus('导出完成');
    } catch (err) {
      console.error('导出失败', err);
      app.updateStatus('导出失败: ' + err.message);
    }
  },

  // 导出 Word
  async exportToDocx(documentData) {
    if (typeof docx === 'undefined') {
      throw new Error('docx 库未加载，请检查网络连接');
    }
    const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = docx;

    // mm 转 twips 辅助函数
    const mmToTwip = (mm) => Math.round((mm / 25.4) * 1440);

    // 标准表格边框（外框粗 1.5pt = 24 half-points，内框细 0.5pt = 8 half-points）
    const tableBorderStyle = {
      top: { style: BorderStyle.SINGLE, size: 24, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 24, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 24, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 24, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
      insideVertical: { style: BorderStyle.SINGLE, size: 8, color: '000000' }
    };

    // 构建内容
    const children = [];

    // 标题
    children.push(new Paragraph({
      children: [new TextRun({
        text: documentData.title || '',
        font: { name: 'SimSun', eastAsia: 'SimSun' },
        size: 44,
        bold: true
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }));

    // 主送单位
    if (documentData.recipient) {
      children.push(new Paragraph({
        children: [new TextRun({
          text: documentData.recipient + '：',
          font: { name: 'FangSong', eastAsia: 'FangSong' },
          size: 32
        })],
        spacing: { after: 200 }
      }));
    }

    // 正文章节
    (documentData.sections || []).forEach(sec => {
      // 章节标题
      children.push(new Paragraph({
        children: [new TextRun({
          text: sec.heading || '',
          font: { name: 'SimHei', eastAsia: 'SimHei' },
          size: 32,
          bold: true
        })],
        spacing: { before: 300, after: 200 }
      }));

      // 正文内容（支持表格）
      const content = sec.content || '';
      const blocks = this._parseContentBlocks(content);

      blocks.forEach(block => {
        if (block.type === 'paragraph') {
          if (block.text.trim()) {
            children.push(new Paragraph({
              children: [new TextRun({
                text: block.text,
                font: { name: 'FangSong', eastAsia: 'FangSong' },
                size: 32
              })],
              indent: { firstLine: 480 },
              spacing: { after: 120, line: 360 }
            }));
          }
        } else if (block.type === 'table-caption') {
          // 表格标题（楷体，居中）
          children.push(new Paragraph({
            children: [new TextRun({
              text: block.text,
              font: { name: 'KaiTi', eastAsia: 'KaiTi' },
              size: 24
            })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 60 }
          }));
        } else if (block.type === 'table') {
          // 表格
          const tableRows = [];

          // 表头行
          tableRows.push(new TableRow({
            children: block.header.map(cellText => new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: cellText,
                  font: { name: 'SimHei', eastAsia: 'SimHei' },
                  size: 24,
                  bold: true
                })],
                alignment: AlignmentType.CENTER
              })],
              verticalAlign: docx.VerticalAlign.CENTER,
              shading: { fill: 'F2F2F2' },
              borders: tableBorderStyle
            }))
          }));

          // 数据行
          block.rows.forEach(row => {
            tableRows.push(new TableRow({
              children: row.map((cellText, ci) => {
                // 自动判断对齐方式（数字右对齐，文字左对齐）
                const isNumber = /^[\+\-]?[\d,\.]+\s*(%|亿|万|元)?$/.test(cellText.trim());
                const align = isNumber ? AlignmentType.RIGHT : AlignmentType.CENTER;
                return new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: cellText,
                      font: { name: 'FangSong', eastAsia: 'FangSong' },
                      size: 24
                    })],
                    alignment: align
                  })],
                  verticalAlign: docx.VerticalAlign.CENTER,
                  borders: tableBorderStyle
                });
              })
            }));
          });

          children.push(new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorderStyle
          }));
        } else if (block.type === 'table-footer') {
          // 表格末尾备注（仿宋，前空一行）
          children.push(new Paragraph({
            children: [new TextRun({
              text: block.text,
              font: { name: 'FangSong', eastAsia: 'FangSong' },
              size: 24
            })],
            spacing: { before: 60, after: 120 }
          }));
        }
      });
    });

    // 备注
    if (documentData.notes) {
      children.push(new Paragraph({ text: '', spacing: { before: 200 } }));
      children.push(new Paragraph({
        children: [new TextRun({
          text: '（' + documentData.notes + '）',
          font: { name: 'FangSong', eastAsia: 'FangSong' },
          size: 24
        })],
        spacing: { after: 200 }
      }));
    }

    // 落款
    children.push(new Paragraph({ text: '', spacing: { before: 400 } }));
    children.push(new Paragraph({
      children: [new TextRun({
        text: documentData.sender || '',
        font: { name: 'FangSong', eastAsia: 'FangSong' },
        size: 32
      })],
      alignment: AlignmentType.RIGHT
    }));
    children.push(new Paragraph({
      children: [new TextRun({
        text: documentData.date || '',
        font: { name: 'FangSong', eastAsia: 'FangSong' },
        size: 32
      })],
      alignment: AlignmentType.RIGHT
    }));

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: mmToTwip(37),
              bottom: mmToTwip(35),
              left: mmToTwip(28),
              right: mmToTwip(26)
            }
          }
        },
        children: children
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${(documentData.title || '文档')}.docx`);
  },

  /**
   * 将正文内容解析为段落/表格/表格标题/表格备注等块
   */
  _parseContentBlocks(content) {
    const lines = content.split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 识别表格标题（表1：xxx）
      if (trimmed.match(/^表\d+\s*[：:]\s*/)) {
        blocks.push({ type: 'table-caption', text: trimmed });
        i++;
        continue;
      }

      // 识别 Markdown 表格
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          // 跳过分隔行
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

        // 检查下方是否有表格备注
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

    return blocks;
  },

  // 导出 PDF
  async exportToPdf(documentData) {
    const element = document.getElementById('preview-page');
    if (!element) throw new Error('预览区不存在');

    const opt = {
      margin: 0,
      filename: `${(documentData.title || '文档')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf().set(opt).from(element).save();
  },

  // 下载空白模板
  async downloadBlankTemplate(docType) {
    // 加载模板定义
    let template;
    try {
      const resp = await fetch(`../shared/doc-types/${docType}.json`);
      template = await resp.json();
    } catch (e) {
      console.error('加载模板失败', e);
      return;
    }

    // 构建空白文档
    const blankDoc = {
      title: `[${template.name || '文档'}标题]`,
      sender: '[发文单位]',
      recipient: template.structure && template.structure.hasRecipient ? '[主送单位]' : '',
      date: new Date().toLocaleDateString('zh-CN', {year:'numeric', month:'long', day:'numeric'}),
      sections: template.structure && template.structure.sections
        ? template.structure.sections.map(sec => ({
            heading: sec.title || '',
            level: 1,
            content: `[${sec.title || '章节'}内容]`
          }))
        : []
    };

    await this.exportToDocx(blankDoc);
  }
};
