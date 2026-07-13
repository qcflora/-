// ==========================================
// 公文整合助手 - PPT 导出器
// ==========================================

const pptExporter = {
  /**
   * 从项目数据生成 PPT
   * @param {Object} documentData - 文档 JSON 对象
   * @param {string} style - 'business' | 'party'
   */
  async exportToPptx(documentData, style = 'business') {
    if (typeof PptxGenJS === 'undefined') {
      throw new Error('PptxGenJS 库未加载，请检查网络连接');
    }

    const ppt = new PptxGenJS();
    ppt.layout = 'LAYOUT_16x9';
    ppt.author = '公文整合助手';
    ppt.subject = documentData.title || '公文演示文稿';
    ppt.title = documentData.title || '公文演示文稿';

    if (style === 'party') {
      this.createPartyPresentation(documentData, ppt);
    } else {
      this.createBusinessPresentation(documentData, ppt);
    }

    const styleLabel = style === 'party' ? '党建风格' : '商务风格';
    const fileName = `${documentData.title || '演示文稿'}_${styleLabel}.pptx`;
    await ppt.writeFile({ fileName });
  },

  /**
   * 导出项目的 PPT
   * @param {string} projectId
   * @param {string} style
   */
  async exportProject(projectId, style = 'business') {
    const project = projectManager.getProject(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }

    if (app && app.updateStatus) {
      app.updateStatus('正在生成 PPT...');
    }

    try {
      await this.exportToPptx(project.data, style);
      if (app && app.updateStatus) {
        app.updateStatus('PPT 导出完成');
      }
    } catch (err) {
      console.error('PPT 导出失败', err);
      if (app && app.updateStatus) {
        app.updateStatus('PPT 导出失败: ' + err.message);
      }
      throw err;
    }
  },

  /**
   * 生成商务风格 PPT
   */
  createBusinessPresentation(doc, ppt) {
    // 配色方案
    const colors = {
      primary: '1A5276',
      secondary: '2980B9',
      accent: '85C1E9',
      text: '2C3E50',
      textLight: 'FFFFFF',
      bg: 'F4F6F8'
    };

    const sections = doc.sections || [];
    const FONT = 'Microsoft YaHei';

    // ---- 1. 标题页 ----
    let slide = ppt.addSlide();
    slide.background = { fill: colors.primary };

    // 顶部装饰线
    slide.addShape(ppt.ShapeType.rect, {
      x: '15%', y: '30%', w: '70%', h: '0.08cm',
      fill: { color: colors.accent }
    });

    slide.addText(doc.title || '未命名文档', {
      x: '10%', y: '32%', w: '80%', h: '28%',
      fontSize: 36, fontFace: FONT,
      color: colors.textLight, align: 'center', bold: true
    });

    // 底部装饰线
    slide.addShape(ppt.ShapeType.rect, {
      x: '15%', y: '63%', w: '70%', h: '0.08cm',
      fill: { color: colors.accent }
    });

    slide.addText(`${doc.sender || ''}  ${doc.date || ''}`, {
      x: '10%', y: '68%', w: '80%', h: '10%',
      fontSize: 14, fontFace: FONT,
      color: colors.accent, align: 'center'
    });

    // ---- 2. 目录页 ----
    if (sections.length > 0) {
      slide = ppt.addSlide();
      slide.background = { fill: colors.textLight };

      // 目录标题栏
      slide.addShape(ppt.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: '15%',
        fill: { color: colors.primary }
      });
      slide.addText('目  录', {
        x: '10%', y: '2%', w: '80%', h: '11%',
        fontSize: 28, fontFace: FONT,
        color: colors.textLight, bold: true, align: 'center'
      });

      // 目录条目
      const tocItems = [];
      sections.forEach((sec, i) => {
        tocItems.push({
          text: `${i + 1}.  ${sec.heading || '未命名章节'}`,
          options: {
            x: '12%', y: `${20 + i * 8}%`, w: '76%', h: '7%',
            fontSize: 18, fontFace: FONT,
            color: colors.text,
            lineSpacingMultiple: 1.2
          }
        };
      });
      slide.addText(tocItems);
    }

    // ---- 3. 内容页（每个章节一页或多页） ----
    sections.forEach((sec, secIdx) => {
      const bullets = this.extractBulletPoints(sec.content || '');
      const totalSlides = sections.length;

      // 如果要点过多，拆分为多页
      const pages = this._splitBulletsToPages(bullets, 6);

      pages.forEach((pageBullets, pageIdx) => {
        slide = ppt.addSlide();
        slide.background = { fill: colors.textLight };

        // 页面标题栏（蓝色条）
        slide.addShape(ppt.ShapeType.rect, {
          x: 0, y: 0, w: '100%', h: '12%',
          fill: { color: colors.primary }
        });
        slide.addText(sec.heading || '', {
          x: '5%', y: '1%', w: '90%', h: '10%',
          fontSize: 24, fontFace: FONT,
          color: colors.textLight, bold: true
        });

        // 左侧装饰竖条
        slide.addShape(ppt.ShapeType.rect, {
          x: '6%', y: '16%', w: '0.15cm', h: '72%',
          fill: { color: colors.secondary }
        });

        // 内容要点
        if (pageBullets.length > 0) {
          const bulletTexts = pageBullets.map((b, idx) => ({
            text: b,
            options: {
              bullet: { type: 'bullet', code: '2022' },
              x: '8%', y: `${16 + idx * 11}%`, w: '84%', h: '10%',
              fontSize: 16, fontFace: FONT,
              color: colors.text,
              lineSpacingMultiple: 1.5
            }
          }));
          slide.addText(bulletTexts);
        } else {
          // 没有要点时直接显示原文（截取前 300 字）
          const rawText = (sec.content || '').substring(0, 300);
          const displayText = rawText.length < (sec.content || '').length
            ? rawText + '...'
            : rawText;
          slide.addText(displayText, {
            x: '8%', y: '18%', w: '84%', h: '60%',
            fontSize: 16, fontFace: FONT,
            color: colors.text,
            lineSpacingMultiple: 1.5
          });
        }

        // 页码
        const pageNum = pages.length > 1
          ? `${totalSlides + 1 + secIdx + pageIdx}`
          : `${totalSlides + 1 + secIdx}`;
        slide.addText(`${pageNum}`, {
          x: '85%', y: '92%', w: '10%', h: '5%',
          fontSize: 10, color: colors.secondary, align: 'right'
        });

        // 底部细线
        slide.addShape(ppt.ShapeType.rect, {
          x: '5%', y: '95%', w: '90%', h: '0.02cm',
          fill: { color: colors.accent }
        });
      });
    });

    // ---- 4. 结尾页 ----
    slide = ppt.addSlide();
    slide.background = { fill: colors.primary };

    // 装饰线
    slide.addShape(ppt.ShapeType.rect, {
      x: '20%', y: '38%', w: '60%', h: '0.08cm',
      fill: { color: colors.accent }
    });

    slide.addText('谢谢', {
      x: '10%', y: '40%', w: '80%', h: '20%',
      fontSize: 44, fontFace: FONT,
      color: colors.textLight, align: 'center', bold: true
    });

    slide.addShape(ppt.ShapeType.rect, {
      x: '20%', y: '63%', w: '60%', h: '0.08cm',
      fill: { color: colors.accent }
    });

    slide.addText(doc.sender || '', {
      x: '10%', y: '68%', w: '80%', h: '10%',
      fontSize: 16, fontFace: FONT,
      color: colors.accent, align: 'center'
    });
  },

  /**
   * 生成党建风格 PPT
   */
  createPartyPresentation(doc, ppt) {
    // 配色方案
    const colors = {
      primary: 'C0392B',
      primaryDark: '922B21',
      accent: 'F5B041',
      text: '2C3E50',
      textLight: 'FFFFFF',
      bg: 'FFF8F0'
    };

    const sections = doc.sections || [];
    const FONT = 'Microsoft YaHei';

    // ---- 1. 标题页 ----
    let slide = ppt.addSlide();
    slide.background = { fill: colors.primary };

    // 顶部金色装饰线
    slide.addShape(ppt.ShapeType.rect, {
      x: '10%', y: '22%', w: '80%', h: '0.1cm',
      fill: { color: colors.accent }
    });

    // 副标题区域
    slide.addText(doc.title || '未命名文档', {
      x: '10%', y: '26%', w: '80%', h: '28%',
      fontSize: 36, fontFace: FONT,
      color: colors.textLight, align: 'center', bold: true
    });

    // 底部金色装饰线
    slide.addShape(ppt.ShapeType.rect, {
      x: '10%', y: '58%', w: '80%', h: '0.1cm',
      fill: { color: colors.accent }
    });

    slide.addText(`${doc.sender || ''}  ${doc.date || ''}`, {
      x: '10%', y: '63%', w: '80%', h: '10%',
      fontSize: 14, fontFace: FONT,
      color: colors.accent, align: 'center'
    });

    // 底部标语
    slide.addText('不忘初心  牢记使命', {
      x: '10%', y: '85%', w: '80%', h: '8%',
      fontSize: 12, fontFace: FONT,
      color: 'E8D5B7', align: 'center'
    });

    // ---- 2. 目录页 ----
    if (sections.length > 0) {
      slide = ppt.addSlide();
      slide.background = { fill: colors.textLight };

      // 目录标题栏
      slide.addShape(ppt.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: '15%',
        fill: { color: colors.primary }
      });

      // 金色细线
      slide.addShape(ppt.ShapeType.rect, {
        x: '30%', y: '14%', w: '40%', h: '0.08cm',
        fill: { color: colors.accent }
      });

      slide.addText('目  录', {
        x: '10%', y: '2%', w: '80%', h: '11%',
        fontSize: 28, fontFace: FONT,
        color: colors.textLight, bold: true, align: 'center'
      });

      // 目录条目
      const tocItems = [];
      sections.forEach((sec, i) => {
        // 序号用红色圆点装饰
        tocItems.push({
          text: [
            { text: `${i + 1}.  `, options: { bold: true, color: colors.primary, fontSize: 20 } },
            { text: sec.heading || '未命名章节', options: { color: colors.text, fontSize: 18 } }
          ],
          options: {
            x: '12%', y: `${20 + i * 8}%`, w: '76%', h: '7%',
            fontFace: FONT,
            lineSpacingMultiple: 1.2
          }
        };
      });
      slide.addText(tocItems);
    }

    // ---- 3. 内容页（每个章节一页或多页） ----
    sections.forEach((sec, secIdx) => {
      const bullets = this.extractBulletPoints(sec.content || '');
      const totalSlides = sections.length;

      const pages = this._splitBulletsToPages(bullets, 6);

      pages.forEach((pageBullets, pageIdx) => {
        slide = ppt.addSlide();
        slide.background = { fill: colors.textLight };

        // 页面标题栏（红色条）
        slide.addShape(ppt.ShapeType.rect, {
          x: 0, y: 0, w: '100%', h: '12%',
          fill: { color: colors.primary }
        });

        // 金色底部装饰线
        slide.addShape(ppt.ShapeType.rect, {
          x: 0, y: '11.5%', w: '100%', h: '0.08cm',
          fill: { color: colors.accent }
        });

        slide.addText(sec.heading || '', {
          x: '5%', y: '1%', w: '90%', h: '10%',
          fontSize: 24, fontFace: FONT,
          color: colors.textLight, bold: true
        });

        // 左侧装饰竖条（红色）
        slide.addShape(ppt.ShapeType.rect, {
          x: '6%', y: '16%', w: '0.15cm', h: '72%',
          fill: { color: colors.primary }
        });

        // 内容要点
        if (pageBullets.length > 0) {
          const bulletTexts = pageBullets.map((b, idx) => ({
            text: b,
            options: {
              bullet: { type: 'bullet', code: '2022' },
              x: '8%', y: `${16 + idx * 11}%`, w: '84%', h: '10%',
              fontSize: 16, fontFace: FONT,
              color: colors.text,
              lineSpacingMultiple: 1.5
            }
          }));
          slide.addText(bulletTexts);
        } else {
          const rawText = (sec.content || '').substring(0, 300);
          const displayText = rawText.length < (sec.content || '').length
            ? rawText + '...'
            : rawText;
          slide.addText(displayText, {
            x: '8%', y: '18%', w: '84%', h: '60%',
            fontSize: 16, fontFace: FONT,
            color: colors.text,
            lineSpacingMultiple: 1.5
          });
        }

        // 页码
        const pageNum = pages.length > 1
          ? `${totalSlides + 1 + secIdx + pageIdx}`
          : `${totalSlides + 1 + secIdx}`;
        slide.addText(`${pageNum}`, {
          x: '85%', y: '92%', w: '10%', h: '5%',
          fontSize: 10, color: colors.primary, align: 'right'
        });

        // 底部金色线
        slide.addShape(ppt.ShapeType.rect, {
          x: '5%', y: '95%', w: '90%', h: '0.04cm',
          fill: { color: colors.accent }
        });

        // 底部标语
        slide.addText('不忘初心  牢记使命', {
          x: '35%', y: '92%', w: '30%', h: '5%',
          fontSize: 8, fontFace: FONT,
          color: 'E8D5B7', align: 'center'
        });
      });
    });

    // ---- 4. 结尾页 ----
    slide = ppt.addSlide();
    slide.background = { fill: colors.primary };

    // 金色装饰线
    slide.addShape(ppt.ShapeType.rect, {
      x: '20%', y: '33%', w: '60%', h: '0.1cm',
      fill: { color: colors.accent }
    });

    slide.addText('谢谢', {
      x: '10%', y: '36%', w: '80%', h: '20%',
      fontSize: 44, fontFace: FONT,
      color: colors.accent, align: 'center', bold: true
    });

    slide.addShape(ppt.ShapeType.rect, {
      x: '20%', y: '60%', w: '60%', h: '0.1cm',
      fill: { color: colors.accent }
    });

    slide.addText(doc.sender || '', {
      x: '10%', y: '65%', w: '80%', h: '10%',
      fontSize: 16, fontFace: FONT,
      color: colors.textLight, align: 'center'
    });

    // 底部标语
    slide.addText('不忘初心  牢记使命', {
      x: '10%', y: '85%', w: '80%', h: '8%',
      fontSize: 12, fontFace: FONT,
      color: 'E8D5B7', align: 'center'
    });
  },

  /**
   * 从文档内容提取要点（将长文本拆分为幻灯片要点列表）
   * @param {string} text - 原始文本
   * @param {number} maxPerSlide - 每页最多显示的要点数
   * @returns {string[]} 要点文本数组
   */
  extractBulletPoints(text, maxPerSlide = 5) {
    if (!text || typeof text !== 'string') return [];

    const trimmed = text.trim();
    if (trimmed.length === 0) return [];

    // 如果原文已经包含"一是、二是"等中文序号，优先按序号拆分
    const numberedPattern = /[一二三四五六七八九十]+[、．.]/;
    if (numberedPattern.test(trimmed)) {
      const numbered = trimmed
        .split(/(?=[一二三四五六七八九十]+[、．.])/)
        .map(s => s.trim())
        .filter(s => s.length > 2);
      if (numbered.length > 0) {
        return numbered.slice(0, maxPerSlide);
      }
    }

    // 如果原文包含阿拉伯数字序号 "1. 2. 3." 等格式
    const digitPattern = /^\s*\d+[、．.)\]]\s*/m;
    if (digitPattern.test(trimmed)) {
      const digitItems = trimmed
        .split(/(?=\s*\d+[、．.)\]]\s*)/)
        .map(s => s.trim())
        .filter(s => s.length > 2);
      if (digitItems.length > 1) {
        return digitItems.slice(0, maxPerSlide);
      }
    }

    // 如果原文包含 "(一) (二)" 等括号序号
    const bracketPattern = /[（(][一二三四五六七八九十\d]+[）)]/;
    if (bracketPattern.test(trimmed)) {
      const bracketItems = trimmed
        .split(/(?=[（(][一二三四五六七八九十\d]+[）)])/)
        .map(s => s.trim())
        .filter(s => s.length > 2);
      if (bracketItems.length > 1) {
        return bracketItems.slice(0, maxPerSlide);
      }
    }

    // 默认按句号、分号、感叹号、问号拆分
    const sentences = trimmed
      .replace(/\n+/g, '\n')
      .split(/[。；!！?？\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 5); // 过滤太短的片段（至少 5 个字符以保证有意义的要点）

    if (sentences.length === 0) {
      // 如果拆分后为空，直接返回原文（截取前 maxPerSlide 条，按换行拆分）
      return trimmed
        .split(/\n/)
        .map(s => s.trim())
        .filter(s => s.length > 2)
        .slice(0, maxPerSlide);
    }

    return sentences.slice(0, maxPerSlide);
  },

  /**
   * 将文档章节映射为幻灯片
   * @param {Array} sections - 章节数组
   * @returns {Array} 幻灯片映射数据
   */
  mapSectionsToSlides(sections) {
    if (!sections || !Array.isArray(sections)) return [];

    return sections.map((sec, index) => {
      const bullets = this.extractBulletPoints(sec.content || '');
      return {
        slideIndex: index + 1,
        heading: sec.heading || '',
        content: sec.content || '',
        bulletPoints: bullets,
        level: sec.level || 1
      };
    });
  },

  /**
   * 内部方法：将要点数组按每页容量拆分为多页
   * @param {string[]} bullets - 要点数组
   * @param {number} perPage - 每页最大要点数
   * @returns {string[][]} 二维数组，每个元素代表一页的要点
   */
  _splitBulletsToPages(bullets, perPage) {
    if (!bullets || bullets.length === 0) return [[]];
    const pages = [];
    for (let i = 0; i < bullets.length; i += perPage) {
      pages.push(bullets.slice(i, i + perPage));
    }
    return pages;
  }
};

// ==========================================
// 将 ppt 导出功能集成到 exporter 模块
// ==========================================
if (typeof exporter !== 'undefined') {
  Object.assign(exporter, {
    /**
     * 导出项目为 PPT
     * @param {string} projectId
     * @param {string} style - 'business' | 'party'
     */
    exportProjectPptx(projectId, style) {
      return pptExporter.exportProject(projectId, style);
    },

    /**
     * 下载空白 PPT 模板
     * @param {string} docType - 文种类型
     * @param {string} style - 'business' | 'party'
     */
    async downloadBlankPptx(docType, style) {
      let template;
      try {
        const resp = await fetch(`../shared/doc-types/${docType}.json`);
        template = await resp.json();
      } catch (e) {
        console.error('加载模板失败', e);
        return;
      }

      const blankDoc = {
        title: `[${template.name || '文档'}标题]`,
        sender: '[发文单位]',
        recipient: template.structure && template.structure.hasRecipient ? '[主送单位]' : '',
        date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
        sections: template.structure && template.structure.sections
          ? template.structure.sections.map(sec => ({
              heading: sec.title || '',
              level: 1,
              content: `[${sec.title || '章节'}内容]`
            }))
          : []
      };

      await pptExporter.exportToPptx(blankDoc, style);
    }
  });
}
