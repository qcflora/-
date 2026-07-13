const { getTemplate } = require('./template-engine');

/**
 * 对文档进行合规检查
 * 覆盖格式、文种匹配、用语规范、零幻觉四大维度
 * @param {Object} document - 文档对象
 * @param {string} docType - 文种 ID
 * @returns {Array} 检查结果数组
 */
function checkCompliance(document, docType) {
  const checks = [];
  checks.push(...checkFormatCompliance(document));
  checks.push(...checkDocTypeMatch(document, docType));
  checks.push(...checkLanguageStyle(document));
  checks.push(...checkZeroHallucination(document));
  return checks;
}

/**
 * 格式合规检查
 * 检查标题层级顺序是否连续，不得跳级
 * @param {Object} document - 文档对象
 * @returns {Array} 检查结果
 */
function checkFormatCompliance(document) {
  const checks = [];
  // 检查标题层级顺序
  const levels = document.sections.map(s => s.level);
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      checks.push({
        type: 'format',
        location: `第${i + 1}节`,
        message: `标题层级跳变：从 level ${levels[i - 1]} 跳到 level ${levels[i]}`,
        severity: 'warning'
      });
    }
  }
  return checks;
}

/**
 * 文种匹配检查
 * 针对不同文种进行特征违规检测
 * @param {Object} document - 文档对象
 * @param {string} docType - 文种 ID
 * @returns {Array} 检查结果
 */
function checkDocTypeMatch(document, docType) {
  const checks = [];
  const template = getTemplate(docType);
  if (!template) return checks;

  // 检查文种特征违规
  if (docType === 'report') {
    const fullText = document.sections.map(s => s.content).join('');
    if (/妥否.*请批示|当否.*请批复/.test(fullText)) {
      checks.push({
        type: 'content',
        location: '全文',
        message: '报告中夹带请示事项（"妥否，请批示"），应改用请示文种',
        severity: 'error'
      });
    }
  }

  return checks;
}

/**
 * 用语规范检查
 * 检测口语化、网络用语等非正式表达
 * @param {Object} document - 文档对象
 * @returns {Array} 检查结果
 */
function checkLanguageStyle(document) {
  const checks = [];
  const oralPatterns = /(咱们|咋|啥|吧|呢|啊|啦|嘿|嗨)/g;
  document.sections.forEach((sec, i) => {
    if (oralPatterns.test(sec.content)) {
      checks.push({
        type: 'language',
        location: `第${i + 1}节`,
        message: '检测到口语化表达，建议改为规范书面语',
        severity: 'warning'
      });
    }
  });
  return checks;
}

/**
 * 零幻觉检查（骨架，实际需 AI 辅助）
 * 检测疑似编造的政策文件号、统计数据等
 * @param {Object} document - 文档对象
 * @returns {Array} 检查结果
 */
function checkZeroHallucination(document) {
  const checks = [];
  const fullText = document.sections.map(s => s.content).join('');
  // 检查疑似编造的高级别文件号
  const fileNumPattern = /国发〔\d{4}〕\d+号|国办发〔\d{4}〕\d+号/;
  if (fileNumPattern.test(fullText)) {
    checks.push({
      type: 'policy',
      location: '全文',
      message: '检测到疑似高级别政策文件引用，请核实文件号真实性',
      severity: 'warning'
    });
  }
  return checks;
}

module.exports = { checkCompliance };
