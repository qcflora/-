/**
 * 表格处理功能测试
 */

const fs = require('fs');
const path = require('path');

const { tableFormatter } = require('../skill/lib/table-formatter');

// 读取李四的素材（包含表格）
const text = fs.readFileSync(
  path.join(__dirname, 'materials', '02-李四-财务效益.txt'),
  'utf-8'
);

console.log('===== 表格识别与标准化测试 =====\n');

// Step 1: 提取表格
const tables = tableFormatter.extractTables(text);
console.log(`识别到 ${tables.length} 个表格`);
console.log('');

tables.forEach((t, i) => {
  console.log(`--- 表格 ${i + 1} ---`);
  console.log(`类型: ${t.type}`);
  console.log(`标题: ${t.caption || '(无)'}`);
  console.log(`备注: ${t.footer || '(无)'}`);
  console.log(`列数: ${t.columnCount}`);
  console.log(`数据行数: ${t.rows.length}`);
  console.log(`表头: ${t.header.join(' | ')}`);
  console.log('');
});

// Step 2: 标准化
console.log('===== 标准化处理 =====\n');
const standardized = tableFormatter.standardizeTables(tables);

standardized.forEach(t => {
  console.log(`--- 表${t.index}：${t.caption} ---`);
  console.log(`列类型: ${t.columnTypes.join(', ')}`);
  console.log('');
  
  // 打印 Markdown 格式
  const md = tableFormatter.toMarkdown(t);
  console.log(md);
  console.log('');
});

// Step 3: 替换文本中的表格
console.log('===== 文本替换 =====\n');
const result = tableFormatter.processTextWithTables(text);
console.log(result.text.substring(0, 1500));
console.log('...\n');

console.log('测试完成！');
