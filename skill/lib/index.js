/**
 * 统一导出模块
 * 将核心库函数集中暴露，便于外部引用
 */

module.exports = {
  templateEngine: require('./template-engine'),
  formatter: require('./formatter'),
  complianceChecker: require('./compliance-checker'),
  exporter: require('./exporter'),
  jsonBridge: require('./json-bridge')
};
