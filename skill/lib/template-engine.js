const fs = require('fs');
const path = require('path');

// 共享规则目录（与 skill 目录同级）
const SHARED_DIR = path.join(__dirname, '../../shared');

/**
 * 加载所有内置文种模板
 * 从 shared/doc-types/ 目录读取所有 .json 文件
 * @returns {Array} 模板对象数组
 */
function loadBuiltinTemplates() {
  const docTypesDir = path.join(SHARED_DIR, 'doc-types');
  if (!fs.existsSync(docTypesDir)) {
    throw new Error(`内置文种目录不存在: ${docTypesDir}`);
  }
  const files = fs.readdirSync(docTypesDir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const filePath = path.join(docTypesDir, f);
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      throw new Error(`解析文种模板失败 ${filePath}: ${err.message}`);
    }
  });
}

/**
 * 根据 ID 获取模板
 * @param {string} id - 文种 ID（如 'notice', 'report'）
 * @returns {Object|null} 模板对象或 null
 */
function getTemplate(id) {
  const templates = loadBuiltinTemplates();
  return templates.find(t => t.id === id) || null;
}

/**
 * 获取所有模板列表（含自定义）
 * @returns {Array} 内置模板 + 自定义模板
 */
function getAllTemplates() {
  const builtin = loadBuiltinTemplates();
  const custom = loadCustomTemplates();
  return [...builtin, ...custom];
}

/**
 * 加载自定义模板
 * 从 skill/templates/custom/ 目录读取用户自定义文种
 * @returns {Array} 自定义模板对象数组
 */
function loadCustomTemplates() {
  const customDir = path.join(__dirname, '../templates/custom');
  if (!fs.existsSync(customDir)) return [];
  const files = fs.readdirSync(customDir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    try {
      return JSON.parse(fs.readFileSync(path.join(customDir, f), 'utf-8'));
    } catch (err) {
      console.error(`自定义模板解析失败 ${f}: ${err.message}`);
      return null;
    }
  }).filter(Boolean);
}

/**
 * 创建自定义模板
 * 将定义保存到 skill/templates/custom/ 目录
 * @param {Object} definition - 文种定义对象，必须包含 id 字段
 * @returns {Object} 保存后的定义对象
 */
function createCustomTemplate(definition) {
  if (!definition || !definition.id) {
    throw new Error('自定义模板必须包含 id 字段');
  }
  const customDir = path.join(__dirname, '../templates/custom');
  if (!fs.existsSync(customDir)) {
    fs.mkdirSync(customDir, { recursive: true });
  }
  const filePath = path.join(customDir, `${definition.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(definition, null, 2), 'utf-8');
  return definition;
}

module.exports = {
  loadBuiltinTemplates,
  getTemplate,
  getAllTemplates,
  loadCustomTemplates,
  createCustomTemplate
};
