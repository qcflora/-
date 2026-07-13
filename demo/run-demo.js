/**
 * 端到端演示脚本
 * 场景：将4份格式混乱的素材整合为一份标准汇报材料
 * 
 * 步骤：
 * 1. 读取汇报材料模板结构
 * 2. 加载4份素材
 * 3. 按模板结构归类素材到各章节
 * 4. 生成标准 JSON 数据包
 * 5. 输出 Markdown 成稿
 * 6. 输出 JSON 数据包（供 App 导入）
 * 7. 运行合规检查
 */

const fs = require('fs');
const path = require('path');

// ============================
// 配置
// ============================
const SHARED_DIR = path.join(__dirname, '../shared');
const DEMO_DIR = path.join(__dirname, 'materials');
const OUTPUT_DIR = path.join(__dirname, 'output');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ============================
// 步骤1：加载模板结构
// ============================
console.log('===== 步骤1：加载汇报材料模板 =====\n');

const templatePath = path.join(SHARED_DIR, 'doc-types', 'presentation.json');
const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

console.log('文种:', template.name);
console.log('标准结构:');
template.structure.sections.forEach((sec, i) => {
  console.log(`  ${i + 1}. ${sec.title}${sec.required ? ' (必填)' : ' (选填)'}`);
});
console.log('字体方案:', template.fontProfile);
console.log('版式方案:', template.layoutProfile);
console.log('');

// ============================
// 步骤2：加载4份素材
// ============================
console.log('===== 步骤2：加载素材 =====\n');

const materialFiles = [
  { file: '01-张三-改革进展.txt', author: '张三（综合办）', topic: '改革进展综合' },
  { file: '02-李四-财务效益.txt', author: '李四（财务部）', topic: '财务效益数据' },
  { file: '03-王五-党建工作.txt', author: '王五（党群工作部）', topic: '党建与企业文化' },
  { file: '04-赵六-风险合规.txt', author: '赵六（风控合规部）', topic: '风险合规建设' }
];

const materials = materialFiles.map(m => {
  const filePath = path.join(DEMO_DIR, m.file);
  const text = fs.readFileSync(filePath, 'utf-8');
  console.log(`[${m.author}] ${m.topic} (${text.length}字)`);
  return { ...m, text };
});

console.log('');

// ============================
// 步骤3：按模板结构归类素材
// ============================
console.log('===== 步骤3：素材归类到章节 =====\n');

// 手动映射（实际使用中应由 AI 判断归属）
const sectionMapping = {
  background: {
    title: '背景',
    source: [materials[0]],  // 张三的开头段落
    extractor: (mats) => {
      return '2024年初，XX集团正式启动新一轮国有企业改革。经过两年多的推进，公司在股权结构优化、法人治理完善、三项制度改革等方面取得了阶段性成果。现将改革工作进展情况汇报如下：';
    }
  },
  practices: {
    title: '主要做法',
    source: [materials[0], materials[2], materials[3]],  // 张三(改革措施) + 王五(党建) + 赵六(制度)
    extractor: (mats) => {
      return `（一）股权结构优化与混合所有制改革\n${mats[0].text.split('\n').find(l => l.includes('股权结构')) || ''}\n\n（二）法人治理结构完善\n${mats[0].text.split('\n').find(l => l.includes('法人治理')) || ''}\n\n（三）三项制度改革\n${mats[0].text.split('\n').find(l => l.includes('三项制度')) || ''}\n\n（四）党建引领改革\n公司党委充分发挥把方向管大局保落实作用，成立由党委书记任组长的改革领导小组，下设5个专项工作组，先后召开12次党委常委会专题研究改革事项。坚持"两个一以贯之"，修订了党委会议事规则和"三重一大"决策制度。\n\n（五）内控制度建设\n${mats[2].text.split('\n').slice(1, 3).join('\n')}`;
    }
  },
  achievements: {
    title: '工作成效',
    source: [materials[1]],  // 李四的财务数据
    extractor: (mats) => {
      return mats[0].text.split('\n').slice(2, 18).join('\n').replace(/^  /gm, '');
    }
  },
  problems: {
    title: '存在问题',
    source: [materials[0], materials[1]],  // 张三 + 李四的问题
    extractor: (mats) => {
      const p1 = mats[0].text.split('\n').find(l => l.includes('问题'));
      const p2 = mats[1].text.split('\n').filter(l => l.trim().startsWith('-')).slice(0, 2).map(l => l.trim());
      return `${p1}\n${p2.join('\n')}`;
    }
  },
  plans: {
    title: '下一步打算',
    source: [materials[0], materials[1], materials[3]],  // 各人的下一步建议
    extractor: (mats) => {
      const lines = [];
      lines.push('一是继续深化三项制度改革，重点推进市场化经营机制。');
      lines.push('二是加强亏损企业治理，建立优胜劣汰机制，强化现金流管理。');
      lines.push('三是重点关注混改后关联交易合规性、新股东权利保障机制等新出现的合规领域。');
      return lines.join('\n');
    }
  }
};

// 构建文档
const sections = template.structure.sections.map(secDef => {
  const mapping = sectionMapping[secDef.id];
  const mats = mapping ? mapping.source : [];
  const content = mapping ? mapping.extractor(mats) : `[${secDef.title}内容]`;
  
  console.log(`[${secDef.title}] ← 来自: ${mats.map(m => m.author).join(', ')}`);
  
  return {
    heading: secDef.title,
    level: 1,
    content: content,
    sourceMaterials: mats.map(m => ({
      author: m.author,
      originalText: m.text,
      status: 'adopted'
    }))
  };
});

console.log('');

// ============================
// 步骤4：生成 JSON 数据包
// ============================
console.log('===== 步骤4：生成 JSON 数据包 =====\n');

const document = {
  version: '1.0',
  docType: 'presentation',
  docTypeName: '汇报材料',
  title: 'XX集团国企改革阶段总结',
  sender: 'XX集团',
  recipient: '',
  date: '2026年7月4日',
  sections: sections,
  attachments: ['附件：改革主要指标对比表', '附件：子公司改革进度一览表'],
  notes: '',
  complianceChecks: [],
  customTemplate: null,
  exportedAt: new Date().toISOString()
};

// 保存 JSON 数据包
const jsonPath = path.join(OUTPUT_DIR, 'XX国企改革阶段总结.json');
fs.writeFileSync(jsonPath, JSON.stringify(document, null, 2), 'utf-8');
console.log('JSON 数据包已保存:', jsonPath);

// ============================
// 步骤5：生成 Markdown 成稿
// ============================
console.log('\n===== 步骤5：生成 Markdown 成稿 =====\n');

let markdown = `# ${document.title}\n\n`;
document.sections.forEach(sec => {
  markdown += `## ${sec.heading}\n\n${sec.content}\n\n`;
});
markdown += `**XX集团**\n${document.date}\n`;

const mdPath = path.join(OUTPUT_DIR, 'XX国企改革阶段总结.md');
fs.writeFileSync(mdPath, markdown, 'utf-8');
console.log('Markdown 成稿已保存:', mdPath);

// ============================
// 步骤6：运行合规检查
// ============================
console.log('\n===== 步骤6：合规检查 =====\n');

// 简化版合规检查（前端版本）
const fullText = document.sections.map(s => s.content).join('\n');
const checks = [];

// 检查1：用语规范（口语化）
const oralPatterns = /(咱们|咋|啥|拖后腿|包袱比较重|做的还是不错)/g;
let match;
while ((match = oralPatterns.exec(fullText)) !== null) {
  checks.push({
    type: 'language',
    location: '全文',
    message: `检测到口语化表达"${match[0]}"，建议改为规范书面语`,
    severity: 'warning'
  });
}

// 检查2：数据完整性（是否有未核实标记）
if (/\[待核实\]|\[待补充\]/.test(fullText)) {
  checks.push({
    type: 'policy',
    location: '全文',
    message: '存在待核实/待补充内容，确认数据来源后再定稿',
    severity: 'warning'
  });
}

// 检查3：格式规范
if (!fullText.includes('（一）') && !fullText.includes('一是')) {
  checks.push({
    type: 'format',
    location: '主要做法',
    message: '主要做法章节建议使用"（一）（二）"或"一是二是"的层级编号',
    severity: 'info'
  });
}

document.complianceChecks = checks;

// 更新 JSON
fs.writeFileSync(jsonPath, JSON.stringify(document, null, 2), 'utf-8');

if (checks.length === 0) {
  console.log('合规检查通过，无问题。');
} else {
  console.log(`合规检查发现 ${checks.length} 个提示：`);
  checks.forEach(c => {
    const icon = c.severity === 'warning' ? '⚠' : 'ℹ';
    console.log(`  ${icon} [${c.type}] ${c.message}`);
  });
}

// ============================
// 步骤7：汇总
// ============================
console.log('\n===== 汇总 =====');
console.log('');
console.log('产出文件：');
console.log(`  1. JSON 数据包: ${jsonPath}`);
console.log(`     → 可在 HTML App 中通过"导入 JSON"导入，进行在线预览/编辑`);
console.log(`  2. Markdown 成稿: ${mdPath}`);
console.log(`     → 可直接查看，也可进一步转换为 Word`);
console.log('');
console.log('素材来源追溯：');
document.sections.forEach(sec => {
  const authors = (sec.sourceMaterials || []).map(m => m.author).join(', ') || '无';
  console.log(`  ${sec.heading} ← ${authors}`);
});
console.log('');
console.log('合规提示数量:', checks.length);
console.log('');
console.log('下一步操作：');
console.log('  1. 打开 HTML App → 点击"导入 JSON" → 选择 XX国企改革阶段总结.json');
console.log('  2. 在编辑器中预览 A4 版式 → 检查格式 → 修改内容');
console.log('  3. 导出 Word → 发送给领导审阅');
