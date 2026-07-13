const { getTemplate } = require('./template-engine');

/**
 * 格式化整合素材为公文
 * @param {string} docType - 文种 ID
 * @param {Array} materials - 素材列表 [{author, text, priority}]
 * @param {Object} options - 元信息 {title, sender, recipient, date}
 * @returns {Object} Document JSON
 */
function assembleDocument(docType, materials, options = {}) {
  const template = getTemplate(docType);
  if (!template) throw new Error(`未知文种: ${docType}`);

  // 将素材映射到章节
  const sectionMap = mapMaterialsToSections(materials, template.structure.sections);

  // 构建文档
  const document = {
    version: '1.0',
    docType: template.id,
    docTypeName: template.name,
    title: options.title || `[${template.name}标题]`,
    sender: options.sender || '[发文单位]',
    recipient: options.recipient || (template.structure.hasRecipient ? '[主送单位]' : ''),
    date: options.date || formatDate(new Date()),
    sections: template.structure.sections.map(sec => {
      const mapped = sectionMap.find(m => m.sectionId === sec.id);
      return {
        heading: sec.title,
        level: 1,
        content: mapped ? formatSectionContent(mapped.materials, sec) : `[${sec.title}内容]`,
        sourceMaterials: mapped ? mapped.materials.map(m => ({
          author: m.author,
          originalText: m.text,
          status: 'adopted'
        })) : []
      };
    }),
    attachments: options.attachments || [],
    notes: options.notes || (template.structure.hasNotes ? '联系人：[姓名]，联系电话：[电话]' : ''),
    complianceChecks: [],
    customTemplate: null,
    exportedAt: new Date().toISOString()
  };

  return document;
}

/**
 * 将素材映射到对应章节（简化版：根据关键词匹配）
 * 实际生产环境应由 AI 判断归属，此处为骨架实现
 * @param {Array} materials - 素材列表
 * @param {Array} sectionDefs - 章节定义列表
 * @returns {Array} [{sectionId, materials}]
 */
function mapMaterialsToSections(materials, sectionDefs) {
  const map = [];
  sectionDefs.forEach(sec => {
    const matched = materials.filter(m =>
      m.text.includes(sec.title) || m.priority === 'high'
    );
    if (matched.length > 0) {
      map.push({ sectionId: sec.id, materials: matched });
    }
  });
  return map;
}

/**
 * 格式化章节内容 —— 格式对齐不改变原文内容
 * @param {Array} materials - 匹配到的素材列表
 * @param {Object} sectionDef - 章节定义
 * @returns {string} 格式化后的内容
 */
function formatSectionContent(materials, sectionDef) {
  if (materials.length === 0) return `[${sectionDef.title}内容]`;

  // 原则：只调整格式（段落/缩进/换行），绝不改写、润色、增删原文内容
  // 多份素材合并时，每段前标注来源，但保留每人的原文原貌
  if (materials.length === 1) {
    return materials[0].text;
  }

  // 多份素材：按作者分段，保留原文，只添加来源标注
  return materials.map((m) => {
    // 来源标注与原文之间用空行分隔
    return `【${m.author}】\n${m.text}`;
  }).join('\n\n');
}

/**
 * 格式化日期为中文公文格式
 * @param {Date} date - 日期对象
 * @returns {string} 如 "2024年7月4日"
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}年${m}月${d}日`;
}

module.exports = { assembleDocument, mapMaterialsToSections, formatSectionContent };
