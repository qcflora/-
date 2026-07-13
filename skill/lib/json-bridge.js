const Ajv = require('ajv');
const fs = require('fs');
const path = require('path');

// 初始化 AJV 并编译 JSON Schema
const ajv = new Ajv();
const schemaPath = path.join(__dirname, '../../shared/json-schema/document.json');
let validate;

try {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  validate = ajv.compile(schema);
} catch (err) {
  throw new Error(`加载 JSON Schema 失败 (${schemaPath}): ${err.message}`);
}

/**
 * 验证文档是否符合 JSON Schema
 * @param {Object} document - 文档对象
 * @returns {Object} { valid: boolean, errors: Array|null }
 */
function validateDocument(document) {
  const valid = validate(document);
  return { valid, errors: validate.errors };
}

/**
 * 保存 JSON 数据包到文件
 * @param {Object} document - 文档对象
 * @param {string} filePath - 目标文件路径
 * @returns {string} 保存后的文件路径
 */
function saveJsonPackage(document, filePath) {
  const json = JSON.stringify(document, null, 2);
  fs.writeFileSync(filePath, json, 'utf-8');
  return filePath;
}

/**
 * 从文件读取 JSON 数据包
 * @param {string} filePath - JSON 文件路径
 * @returns {Object} 文档对象
 */
function loadJsonPackage(filePath) {
  const json = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(json);
}

module.exports = { validateDocument, saveJsonPackage, loadJsonPackage };
