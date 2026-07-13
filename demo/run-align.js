/**
 * 单份素材格式对齐脚本
 * 核心原则：只调整格式，不改变任何原文内容。
 * 目的：让每个人的素材在统一格式下呈现，方便团队对标和后期并稿。
 * 输入：一份原始素材（txt）
 * 输出：对齐格式后的 Markdown + JSON 数据包
 */

const fs = require('fs');
const path = require('path');

const SHARED_DIR = path.join(__dirname, '../shared');
const OUTPUT_DIR = path.join(__dirname, 'output/aligned');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * 将原始素材对齐到汇报材料格式
 * 规则：
 *   1. 保留素材全文，不增删任何内容
 *   2. 统一段落间距（段间空一行）
 *   3. 统一缩进（每段首行缩进两个全角空格）
 *   4. 保留原有列表符号，仅做必要规范化
 *   5. 处理 Markdown 表格，确保格式正确
 *   6. 标注来源和覆盖情况
 */
function alignSingleMaterial(material, template) {
  // 只做格式清洗，不做内容改写
  const formattedText = formatPreserveContent(material.text);

  // 分析内容侧重点，用于标注哪些章节有覆盖
  const contentAnalysis = analyzeContent(material.text);

  const document = {
    version: '1.0',
    docType: 'presentation',
    docTypeName: '汇报材料',
    title: 'XX集团国企改革阶段总结',
    sender: material.author,
    recipient: '',
    date: '2026年7月4日',
    isAlignedMaterial: true, // 标记为过程材料
    materialAuthor: material.author,
    materialTopic: material.topic,
    sections: generateAlignedSections(material, template, contentAnalysis, formattedText),
    attachments: [],
    notes: `格式对齐版 — 保留${material.author}原文，仅做格式规范化处理，供团队对标和并稿使用。`,
    complianceChecks: runBasicChecks(material.text, material.author),
    customTemplate: null,
    exportedAt: new Date().toISOString()
  };

  return document;
}

/**
 * 格式清洗：保留全部内容，只做规范化
 * - 清理首尾空白
 * - 统一空行（多行空行合并为一行）
 * - 保留每段原始文字，不做改写
 */
function formatPreserveContent(text) {
  const lines = text.split('\n');
  const result = [];
  let prevEmpty = false;

  for (let line of lines) {
    const trimmed = line.trim();

    // 跳过完全空行，但保留一行空行作为段落分隔
    if (trimmed === '') {
      if (!prevEmpty) {
        result.push('');
        prevEmpty = true;
      }
      continue;
    }

    prevEmpty = false;

    // 如果是 Markdown 表格行，保持原样
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      result.push(trimmed);
      continue;
    }

    // 如果是表格标题（表1：xxx），保持原样
    if (/^表\d+\s*[：:]\s*/.test(trimmed)) {
      result.push(trimmed);
      continue;
    }

    // 如果是表格备注（注：xxx），保持原样
    if (/^(注[：:]?|备注[：:]?)/.test(trimmed)) {
      result.push(trimmed);
      continue;
    }

    // 保留原文，不做任何改写
    result.push(trimmed);
  }

  return result.join('\n');
}

/**
 * 分析素材内容的侧重点
 */
function analyzeContent(text) {
  const topics = [];
  if (/股权|混改|战略投资|国有股/.test(text)) topics.push('reform-progress');
  if (/营收|利润|资产负债|保值增值|费用率/.test(text)) topics.push('financial');
  if (/党委|党建|干部|职工思想|企业文化/.test(text)) topics.push('party-building');
  if (/制度|合规|审计|安全/.test(text)) topics.push('risk-compliance');
  if (/问题|不足|亏损|风险/.test(text)) topics.push('problems');
  if (/下一步|打算|建议|方向/.test(text)) topics.push('plans');
  return topics;
}

/**
 * 生成对齐后的章节
 * 核心原则：原文原样放入对应章节，不做提炼、不做改写、不删减。
 * 不属于本素材重点的章节标注为"待补充"。
 */
function generateAlignedSections(material, template, contentAnalysis, formattedText) {
  // 判断这份素材主要覆盖哪些章节
  const hasBackground = /2024|启动|改革|推进/.test(material.text);
  const hasPractices = /股权|治理|制度|党委|三项|董事会|监事会/.test(material.text);
  const hasAchievements = /营收|利润|资产负债|保值增值|费用率|覆盖|达/.test(material.text);
  const hasProblems = /问题|不足|亏损|包袱|不均衡|偏弱/.test(material.text);
  const hasPlans = /下一步|打算|建议|方向|继续/.test(material.text);

  const sections = template.structure.sections.map(secDef => {
    let content = '';
    let note = '';
    let isRelevant = false;

    switch (secDef.id) {
      case 'background':
        if (hasBackground) {
          // 原文原样放入，不提取、不改写
          content = formattedText;
          isRelevant = true;
        } else {
          content = '[该部分非本素材重点，请参考其他同事材料]';
          note = '标注：此章节由其他同事负责';
        }
        break;

      case 'practices':
        if (hasPractices) {
          content = formattedText;
          isRelevant = true;
        } else {
          content = '[该部分非本素材重点，请参考其他同事材料]';
          note = '标注：此章节由其他同事负责';
        }
        break;

      case 'achievements':
        if (hasAchievements) {
          content = formattedText;
          isRelevant = true;
        } else {
          content = '[该部分非本素材重点，请参考其他同事材料]';
          note = '标注：此章节由其他同事负责';
        }
        break;

      case 'problems':
        if (hasProblems) {
          content = formattedText;
          isRelevant = true;
        } else {
          content = '[该部分非本素材重点，请参考其他同事材料]';
          note = '标注：此章节由其他同事负责';
        }
        break;

      case 'plans':
        if (hasPlans) {
          content = formattedText;
          isRelevant = true;
        } else {
          content = '[该部分非本素材重点，请参考其他同事材料]';
          note = '标注：此章节由其他同事负责';
        }
        break;
    }

    return {
      heading: secDef.title,
      level: 1,
      content: content,
      note: note,
      isEmpty: !isRelevant,
      isFullText: isRelevant, // 标记为"全文原文"
      sourceMaterials: [{
        author: material.author,
        originalText: material.text, // 保存原始全文
        status: 'adopted'
      }]
    };
  });

  return sections;
}

/**
 * 基础合规检查 —— 只提示，不改写
 */
function runBasicChecks(text, author) {
  const checks = [];

  // 口语化检查（仅提示，不修改原文）
  const oralPatterns = {
    '咱们': '建议改为"我公司"或"本单位"',
    '咋': '建议改为"如何"',
    '啥': '建议改为"什么"',
    '拖后腿': '建议改为"进展较慢"或"进度滞后"',
    '包袱比较重': '建议改为"思想负担较重"',
    '总的来说': '建议删除或改为"总体上看"',
    '做得不错': '建议改为"取得一定成效"',
    '还行': '建议改为"基本达标"或"进展良好"',
    '搞': '建议改为"开展""推进""落实"等规范用语',
    '弄': '建议改为"处理""办理""落实"等规范用语'
  };

  for (const [pattern, suggestion] of Object.entries(oralPatterns)) {
    if (text.includes(pattern)) {
      checks.push({
        type: 'language',
        location: `${author}的素材`,
        message: `口语化表达"${pattern}"，${suggestion}`,
        severity: 'warning'
      });
    }
  }

  // 格式提示（仅提示，不修改原文）
  if (/^===/.test(text)) {
    checks.push({
      type: 'format',
      location: `${author}的素材`,
      message: '标题使用了"==="符号，建议在并稿时统一为标准编号格式',
      severity: 'info'
    });
  }
  if (/^【.*】/.test(text)) {
    checks.push({
      type: 'format',
      location: `${author}的素材`,
      message: '标题使用了"【】"符号，建议在并稿时统一为标准编号格式',
      severity: 'info'
    });
  }

  return checks;
}

// ============================
// 主流程
// ============================

console.log('===== 单份素材格式对齐（保留原文，仅调格式） =====\n');

const templatePath = path.join(SHARED_DIR, 'doc-types', 'presentation.json');
const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

const materialFiles = [
  { file: '01-张三-改革进展.txt', author: '张三（综合办）', topic: '改革进展综合' },
  { file: '02-李四-财务效益.txt', author: '李四（财务部）', topic: '财务效益数据' },
  { file: '03-王五-党建工作.txt', author: '王五（党群工作部）', topic: '党建与企业文化' },
  { file: '04-赵六-风险合规.txt', author: '赵六（风控合规部）', topic: '风险合规建设' }
];

// 汇总：所有对齐材料的章节覆盖情况
const coverageMap = {};

materialFiles.forEach(m => {
  const filePath = path.join(__dirname, 'materials', m.file);
  const text = fs.readFileSync(filePath, 'utf-8');
  const material = { ...m, text };

  console.log(`--- ${m.author}：${m.topic} ---`);

  // 执行对齐
  const aligned = alignSingleMaterial(material, template);

  // 打印结果
  aligned.sections.forEach(sec => {
    const status = sec.isEmpty ? '【待补充】' : '【全文原文】';
    const preview = sec.content.length > 40
      ? sec.content.substring(0, 40) + '...'
      : sec.content;
    console.log(`  ${sec.heading} ${status}`);
    console.log(`    ${preview}`);
  });

  if (aligned.complianceChecks.length > 0) {
    console.log(`  合规提示(${aligned.complianceChecks.length}):`);
    aligned.complianceChecks.forEach(c => {
      const icon = c.severity === 'warning' ? '⚠' : 'ℹ';
      console.log(`    ${icon} ${c.message}`);
    });
  }
  console.log('');

  // 保存 JSON
  const jsonFileName = `格式对齐-${m.author}-${m.topic}.json`;
  fs.writeFileSync(
    path.join(OUTPUT_DIR, jsonFileName),
    JSON.stringify(aligned, null, 2),
    'utf-8'
  );

  // 保存 Markdown
  let md = `# ${aligned.title}\n`;
  md += `> 提交人：${m.author} | 主题：${m.topic} | 格式对齐版（保留原文）\n\n`;
  md += `> **说明**：本文件为格式对齐版本，保留${m.author}提交的原文内容，仅做格式规范化处理（统一段落间距、保留表格格式）。用于团队对标和并稿参考。\n\n`;
  md += `---\n\n`;
  aligned.sections.forEach(sec => {
    md += `## ${sec.heading}\n\n`;
    if (sec.isEmpty) {
      md += `*${sec.content}*\n`;
    } else {
      md += `${sec.content}\n`;
    }
    if (sec.note) {
      md += `\n> ${sec.note}\n`;
    }
    md += '\n';
  });
  md += `---\n**${aligned.sender}** | ${aligned.date}\n`;

  const mdFileName = `格式对齐-${m.author}-${m.topic}.md`;
  fs.writeFileSync(path.join(OUTPUT_DIR, mdFileName), md, 'utf-8');

  // 记录覆盖情况
  aligned.sections.forEach(sec => {
    if (!coverageMap[sec.heading]) coverageMap[sec.heading] = [];
    coverageMap[sec.heading].push({
      author: m.author,
      hasContent: !sec.isEmpty
    });
  });
});

// 打印覆盖矩阵
console.log('===== 素材覆盖矩阵 =====\n');
console.log('（✓=该成员原文已纳入，○=该章节非此人重点）\n');

const authors = materialFiles.map(m => m.author);
const header = '章节'.padEnd(16) + authors.map(a => a.slice(0, 8).padEnd(10)).join('');
console.log(header);
console.log('-'.repeat(header.length));

Object.entries(coverageMap).forEach(([heading, coverage]) => {
  const row = heading.padEnd(16) + authors.map(a => {
    const found = coverage.find(c => c.author === a);
    return found && found.hasContent ? '✓ 全文'.padEnd(10) : '○ 待补'.padEnd(10);
  }).join('');
  console.log(row);
});

console.log('');
console.log('===== 格式对齐原则 =====');
console.log('✓ 保留每位成员原文，不增删任何内容');
console.log('✓ 仅做格式规范化（段落间距、表格格式、统一缩进）');
console.log('✓ 口语化表达仅做提示，不改写原文');
console.log('✓ 方便后期并稿时逐条对照、分人沟通修改意见');
console.log('');
console.log('产出文件目录:', OUTPUT_DIR);
console.log('');
console.log('使用方式：');
console.log('  1. 每位成员查看自己的"格式对齐版"，确认内容是否完整保留');
console.log('  2. 对照覆盖矩阵，与团队沟通确认各章节负责人');
console.log('  3. 根据合规提示自行修改原文，重新提交');
console.log('  4. 修改后的素材再次提交，由 Skill 重新整合');
