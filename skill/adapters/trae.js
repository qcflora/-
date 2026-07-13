const { assembleDocument } = require('../lib/formatter');
const { checkCompliance } = require('../lib/compliance-checker');
const { exportToMarkdown, exportToJson, exportToDocx } = require('../lib/exporter');
const { saveJsonPackage } = require('../lib/json-bridge');
const { getAllTemplates } = require('../lib/template-engine');

/**
 * TRAE Skill 主入口
 * 在 TRAE 对话中引导用户完成 7 步工作流程
 */
class TraeAdapter {
  constructor() {
    this.templates = getAllTemplates();
  }

  /**
   * 列出所有可用文种
   * @returns {Array} 文种列表（含 id, name, category, description）
   */
  listDocTypes() {
    return this.templates.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description
    }));
  }

  /**
   * 执行整合任务
   * @param {string} docType - 文种 ID
   * @param {Array} materials - 素材列表
   * @param {Object} options - 元信息
   * @returns {Promise<Object>} 文档对象
   */
  async assemble(docType, materials, options) {
    // 1. 格式化整合
    const document = assembleDocument(docType, materials, options);

    // 2. 合规检查
    document.complianceChecks = checkCompliance(document, docType);

    // 3. 验证
    const { validateDocument } = require('../lib/json-bridge');
    const validation = validateDocument(document);
    if (!validation.valid) {
      throw new Error(`文档验证失败: ${JSON.stringify(validation.errors)}`);
    }

    return document;
  }

  /**
   * 导出文档
   * @param {Object} document - 文档对象
   * @param {string} format - 导出格式：markdown | json | docx
   * @param {string} [outputPath] - 输出路径（docx 需要）
   * @returns {Promise<string>} 导出内容或路径
   */
  async export(document, format, outputPath) {
    switch (format) {
      case 'markdown':
        return exportToMarkdown(document, document.docType);
      case 'json':
        return exportToJson(document);
      case 'docx':
        return exportToDocx(document, document.docType, outputPath);
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }
}

module.exports = { TraeAdapter };
