const fs = require('fs').promises;
const path = require('path');

/**
 * 导出为 Markdown 成稿
 * @param {Object} document - 文档对象
 * @param {string} docType - 文种 ID
 * @returns {string} Markdown 字符串
 */
function exportToMarkdown(document, docType) {
  const lines = [];
  lines.push(`# ${document.title}`);
  lines.push('');

  if (document.recipient) {
    lines.push(`${document.recipient}：`);
    lines.push('');
  }

  document.sections.forEach(sec => {
    lines.push(`## ${sec.heading}`);
    lines.push('');
    lines.push(sec.content);
    lines.push('');
  });

  if (document.notes) {
    lines.push(`（${document.notes}）`);
    lines.push('');
  }

  lines.push(`${document.sender}`);
  lines.push(`${document.date}`);

  return lines.join('\n');
}

/**
 * 导出为 JSON 数据包
 * @param {Object} document - 文档对象
 * @returns {string} JSON 字符串
 */
function exportToJson(document) {
  return JSON.stringify(document, null, 2);
}

/**
 * 导出为 Word (.docx)
 * 当前为骨架实现：先保存 Markdown，提示用户后续用 docx.js 转换
 * @param {Object} document - 文档对象
 * @param {string} docType - 文种 ID
 * @param {string} outputPath - 输出路径
 * @returns {Promise<void>}
 */
async function exportToDocx(document, docType, outputPath) {
  // 骨架实现：先保存 Markdown，提示用户后续用 docx.js 转换
  const md = exportToMarkdown(document, docType);
  const mdPath = outputPath.replace('.docx', '.md');
  await fs.writeFile(mdPath, md, 'utf-8');
  console.log(`Markdown 成稿已保存至: ${mdPath}`);
  console.log('docx 导出功能需安装 docx 库后实现');
}

module.exports = { exportToMarkdown, exportToJson, exportToDocx };
