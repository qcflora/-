// ==========================================
// 公文整合助手 - 智能格式对齐与合并引擎 v2
// 核心原则：保留原文措辞，按目标文种结构智能重组
// 升级：扩充关键词库、段落相似度检测、数据一致性校验
// ==========================================

const mergeEngine = {

  // ========== 1. 格式对齐（增强版：自动修复常见格式问题） ==========

  alignMaterial(material) {
    const text = material.text;
    let lines = text.split('\n');
    const result = [];
    let prevEmpty = false;

    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        if (!prevEmpty) { result.push(''); prevEmpty = true; }
        continue;
      }
      prevEmpty = false;

      // Markdown 表格行保留原样
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) { result.push(trimmed); continue; }

      // 表格标题（表1：xxx）保留
      if (/^表\d+\s*[：:]\s*/.test(trimmed)) { result.push(trimmed); continue; }

      // 备注/注释保留
      if (/^(注[：:]?|备注[：:]?)/.test(trimmed)) { result.push(trimmed); continue; }

      // 自动修复全角标点混用（公文规范）
      let fixed = trimmed
        .replace(/，/g, '，')   // 已经是全角
        .replace(/\./g, '。')   // 英文句号 → 中文句号（仅中文语境）
        .replace(/,(?=[\u4e00-\u9fa5])/g, '，'); // 中文前的英文逗号 → 全角

      // 自动修复多余空格（中文排版规范：标点前后不留空格）
      fixed = fixed.replace(/\s+([，。、；：！？""''（）])/g, '$1');
      fixed = fixed.replace(/([，。、；：！？""''（）])\s+/g, '$1');

      result.push(fixed);
    }
    return result.join('\n');
  },

  // ========== 2. 内容重组：按目标文种结构分类每段内容（v2增强） ==========

  restructureMaterial(material, docType) {
    const template = this.getTemplate(docType);
    if (!template) return null;

    const text = material.alignedText || material.text;
    // 将素材拆分为段落（按空行分割）
    const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);

    // 对每个段落分类（带上下文感知）
    const classified = paragraphs.map((para, idx) => {
      const scores = this.classifyParagraph(para, idx, paragraphs.length, template, paragraphs);
      const bestMatch = scores.reduce((best, curr) => curr.score > best.score ? curr : best, scores[0]);
      return {
        text: para,
        position: idx,
        assignedSection: bestMatch.sectionId,
        assignedTitle: bestMatch.sectionTitle,
        score: bestMatch.score,
        allScores: scores
      };
    });

    // 后处理：修正明显异常（如相邻同主题段落被分到不同章节）
    this.postProcessClassification(classified, template);

    // 按章节组织
    const bySection = {};
    template.structure.sections.forEach(sec => {
      bySection[sec.id] = {
        sectionId: sec.id,
        sectionTitle: sec.title,
        required: sec.required,
        paragraphs: []
      };
    });
    bySection['uncategorized'] = { sectionId: 'uncategorized', sectionTitle: '其他内容', required: false, paragraphs: [] };

    classified.forEach(item => {
      if (bySection[item.assignedSection]) {
        bySection[item.assignedSection].paragraphs.push(item);
      } else {
        bySection['uncategorized'].paragraphs.push(item);
      }
    });

    return {
      author: material.author,
      filename: material.filename,
      totalParagraphs: paragraphs.length,
      bySection: bySection,
      classified: classified
    };
  },

  // 段落分类算法：返回每个章节的匹配分数
  classifyParagraph(para, idx, total, template, allParagraphs) {
    const scores = template.structure.sections.map(sec => ({
      sectionId: sec.id,
      sectionTitle: sec.title,
      score: this.scoreParagraph(para, idx, total, sec.id, sec.title, allParagraphs)
    }));

    // 加上 "其他" 选项
    scores.push({ sectionId: 'uncategorized', sectionTitle: '其他内容', score: 0.1 });

    return scores;
  },

  // 后处理：修正分类异常
  postProcessClassification(classified, template) {
    // 规则1：如果一段被分到"其他"，但其前后相邻段都属于同一章节，则跟随
    for (let i = 1; i < classified.length - 1; i++) {
      if (classified[i].assignedSection === 'uncategorized') {
        const prev = classified[i - 1];
        const next = classified[i + 1];
        if (prev.assignedSection === next.assignedSection && prev.assignedSection !== 'uncategorized') {
          // 检查这段本身是否有强烈信号反对这个分类
          const scores = classified[i].allScores;
          const targetScore = scores.find(s => s.sectionId === prev.assignedSection);
          const uncategorizedScore = scores.find(s => s.sectionId === 'uncategorized');
          // 如果"其他"的分数没有显著高于目标章节，就跟随
          if (!uncategorizedScore || !targetScore || uncategorizedScore.score - targetScore.score < 0.2) {
            classified[i].assignedSection = prev.assignedSection;
            classified[i].assignedTitle = prev.assignedTitle;
          }
        }
      }
    }

    // 规则2：开头段如果不是明确信号，优先归为"背景/缘由"
    if (classified.length > 0) {
      const first = classified[0];
      const hasOpeningSection = template.structure.sections.some(s => s.id === 'background' || s.id === 'purpose' || s.id === 'overview' || s.id === 'opening');
      if (hasOpeningSection && first.assignedSection === 'uncategorized') {
        const openingSec = template.structure.sections.find(s =>
          s.id === 'background' || s.id === 'purpose' || s.id === 'overview' || s.id === 'opening'
        );
        if (openingSec) {
          first.assignedSection = openingSec.id;
          first.assignedTitle = openingSec.title;
        }
      }
    }

    // 规则3：结尾段如果不是明确信号，优先归为"计划/结语"
    if (classified.length > 1) {
      const last = classified[classified.length - 1];
      const hasClosingSection = template.structure.sections.some(s => s.id === 'plans' || s.id === 'closing' || s.id === 'requirements');
      if (hasClosingSection && last.assignedSection === 'uncategorized') {
        const closingSec = template.structure.sections.find(s =>
          s.id === 'plans' || s.id === 'closing' || s.id === 'requirements'
        );
        if (closingSec) {
          last.assignedSection = closingSec.id;
          last.assignedTitle = closingSec.title;
        }
      }
    }
  },

  // 计算段落与章节的匹配分数（v2增强：带上下文感知）
  scoreParagraph(para, idx, total, sectionId, sectionTitle, allParagraphs) {
    const lower = para.toLowerCase();
    let score = 0;

    // ===== 信件格式检测：敬语、落款、结尾套话 强制归为 "其他" =====
    const isLetterSalutation = /^(尊敬的领导[：:]|致[：:]|您好[！!]?|你们好[！!]?|大家好[！!]?)/.test(para);
    const isLetterClosing = /^(此致|敬礼|顺祝|祝[\u4e00-\u9fa5]+好|特此说明|此复|妥否[，,]|请批示|请审阅|谨启)/.test(para);
    const isLetterSignoff = /^(\S{2,20}(公司|集团|单位|部门|办公室|改革办|工作组))\s*[\n\r]?\s*\d{4}年\d{1,2}月\d{1,2}日/.test(para) ||
                            /\d{4}年\d{1,2}月\d{1,2}日\s*$/.test(para);
    if (isLetterSalutation || isLetterClosing || isLetterSignoff) {
      return sectionId === 'uncategorized' ? 0.6 : 0.01;
    }

    // ===== 关键词库 v2（大幅扩充） =====
    const keywordMap = {
      // 汇报材料 / 报告 / 总结 / 简报
      background: {
        strong: ['背景', '根据', '按照', '为贯彻落实', '根据...精神', '遵照', '依据', '在...领导下', '近年来', '2024年', '2025年', '本轮', '启动', '以来', '概况', '概述', '简介', '前言', '为深入', '为全面', '为切实', '为认真', '按照党中央', '按照上级', '按照省委', '按照市委', '按照县委', '根据上级', '根据安排', '根据部署', '按照要求'],
        medium: ['公司', '集团', '单位', '企业', '改革', '工作', '推进', '开展', '部署', '落实', '贯彻', '执行', '实施', '组织', '单位简介', '基本情况'],
        weak: []
      },
      practices: {
        strong: ['建立了', '完善了', '推进了', '开展了', '实施了', '加强了', '优化了', '健全了', '构建了', '形成了', '出台了', '制定了', '印发了', '组织了', '成立了', '实现了', '落实了', '强化了', '深化了', '推行了', '推广了', '建立了...机制', '完善了...制度', '创新了', '探索了', '试点了', '率先', '首创', '率先开展', '积极探索', '大胆创新'],
        medium: ['措施', '举措', '做法', '经验', '机制', '体系', '制度', '方案', '计划', '安排', '行动', '专项', '重点', '抓手', '突破口', '切入点', '着力点', '落脚点'],
        weak: ['股权', '治理', '董事会', '监事会', '党委', '三项制度', '混改', '重组', '并购', '上市', '融资', '投资']
      },
      achievements: {
        strong: ['达到', '实现', '增长', '提高', '降低', '减少', '增加', '完成', '覆盖率达到', '完成率', '满意率', '占比为', '均达', '均超', '突破', '超额', '位居', '排名', '累计', '共计', '同比增长', '环比下降', '上升', '提升', '扩大', '缩小', '优化', '改善', '荣获', '获评', '被表彰', '被命名为', '被评为'],
        medium: ['成效', '成果', '效益', '业绩', '指标', '数据', '统计', '同比', '环比', '较上年', '与上年相比', '相比去年同期', '排名', '位次', '前列'],
        weak: ['营收', '利润', '收入', '资产', '负债', '产值', '产量', '销量', '人次', '万元', '亿元', '千万', '百万', '元', '人', '户', '家', '个']
      },
      problems: {
        strong: ['问题', '不足', '困难', '挑战', '短板', '弱项', '瓶颈', '滞后', '滞后于', '偏弱', '不均衡', '不平衡', '不充足', '不充分', '不到位', '有待', '亟需', '亟待', '尚未', '还没有', '不够', '不严', '不实', '不深', '不细', '不全', '不紧', '不牢'],
        medium: ['但是', '然而', '不过', '尽管', '虽然', '仍存在', '还存在', '仍然', '依然', '同时也应看到', '但必须清醒认识到', '但也要看到'],
        weak: ['亏损', '下降', '减少', '下滑', '逾期', '风险', '隐患', '漏洞', '缺陷', '瑕疵']
      },
      plans: {
        strong: ['下一步', '下一步将', '今后', '今后将', '未来将', '下一步要', '拟', '计划', '规划', '方案', '部署', '安排', '要', '将', '需', '须', '应', '应当', '务必', '力争', '确保', '力争在', '确保在', '打算', '拟于', '拟在'],
        medium: ['继续', '持续', '深化', '加强', '完善', '推进', '优化', '提升', '强化', '落实', '进一步', '不断', '着力', '切实', '狠抓', '紧盯', '聚焦', '围绕', '紧扣', '着眼', '立足', '对标', '对表'],
        weak: ['重点', '聚焦', '围绕', '紧扣', '着眼', '立足', '主线', '抓手', '突破口', '着力点']
      },
      overview: {
        strong: ['总体', '整体', '全面', '综合', '概览', '概况', '基本情况', '总体情况', '总体形势', '总体态势'],
        medium: ['情况', '状态', '形势', '态势', '局面', '现状'],
        weak: []
      },
      purpose: {
        strong: ['事由', '原因', '鉴于', '由于', '因', '关于', '现将', '现将有关情况', '现就', '现就...问题'],
        medium: ['通知', '请示', '报告', '函', '申请', '呈报', '呈请'],
        weak: []
      },
      content: {
        strong: ['内容', '事项', '情况', '问题', '报告如下', '汇报如下', '说明如下', '情况如下'],
        medium: ['关于', '有关', '如下', '具体'],
        weak: []
      },
      requirements: {
        strong: ['要求', '请', '望', '请予', '恳请', '希望', '望予', '请批', '请审批', '请核准', '请审定', '请审核', '请批准', '请指示', '请批复', '请函复'],
        medium: ['执行', '落实', '遵照', '办理', '审批', '批复', '核准', '审阅', '批示', '指示'],
        weak: []
      },
      opening: {
        strong: ['同志们', '各位', '大家好', '今天', '这次', '会议', '大会', '隆重', '热烈', '欢迎', '祝贺'],
        medium: ['很高兴', '非常', '首先', '在此', '我代表', '请允许'],
        weak: []
      },
      closing: {
        strong: ['谢谢', '感谢', '以上', '完毕', '结束语', '结语', '最后', '总之', '综上所述', '让我们'],
        medium: ['希望', '祝愿', '祝', '请', '号召', '动员', '鼓励'],
        weak: []
      },
      basic: {
        strong: ['会议时间', '会议地点', '主持人', '出席', '列席', '记录', '参会', '到会', '应到', '实到', '请假'],
        medium: ['年月日', '时', '分', '上午', '下午', '会议室', '会场'],
        weak: []
      },
      tasks: {
        strong: ['任务', '目标', '指标', '要求', '责任', '分工', '职责', '职能', '牵头', '配合', '主责', '主体责任', '第一责任', '一岗双责'],
        medium: ['负责', '承担', '落实', '完成', '抓好', '做好', '管好', '盯好'],
        weak: []
      },
      measures: {
        strong: ['措施', '保障', '支持', '配合', '协调', '监督', '考核', '督查', '检查', '巡察', '审计', '问责', '追责'],
        medium: ['确保', '保证', '维护', '促进', '推动', '防范', '化解', '处置', '应对'],
        weak: []
      },
      schedule: {
        strong: ['进度', '时间', '节点', '阶段', '时期', '月份', '季度', '年度', '周期', '时限', '工期', '日程', '时间表', '路线图'],
        medium: ['前', '底', '初', '中', '末', '间', '之前', '之后', '以内', '以内完成', '按期', '按时', '如期'],
        weak: []
      }
    };

    const kw = keywordMap[sectionId];
    if (!kw) return 0.05;

    // 关键词匹配分数
    kw.strong.forEach(k => { if (lower.includes(k)) score += 0.35; });
    kw.medium.forEach(k => { if (lower.includes(k)) score += 0.2; });
    kw.weak.forEach(k => { if (lower.includes(k)) score += 0.1; });

    // 位置特征（仅适用于有顺序逻辑的章节）
    if (sectionId === 'background' && idx === 0) score += 0.2;
    if (sectionId === 'plans' && idx >= total - 2) score += 0.2;
    if (sectionId === 'closing' && idx >= total - 1) score += 0.25;
    if (sectionId === 'opening' && idx === 0) score += 0.25;
    if (sectionId === 'requirements' && idx >= total - 1) score += 0.15;

    // 内容特征
    // 含大量数字 → 更可能是成效
    if (sectionId === 'achievements') {
      const numCount = (para.match(/\d/g) || []).length;
      if (numCount >= 3) score += 0.2;
      if (numCount >= 6) score += 0.15;
      if (/[万亿千万]元|%/.test(para)) score += 0.12;
    }

    // 含"但是/然而/不过" → 更可能是问题
    if (sectionId === 'problems' && /但是|然而|不过|尽管/.test(para)) score += 0.25;

    // 以数字开头（如"1.""（一）"）→ 可能是做法或计划
    if ((sectionId === 'practices' || sectionId === 'tasks') && /^\s*[（(]?[一二三四五六七八九十\d]+[)）]?[、.．\s]/.test(para)) score += 0.15;
    if (sectionId === 'plans' && /^\s*[（(]?[一二三四五六七八九十\d]+[)）]?[、.．\s]/.test(para)) score += 0.12;

    // 上下文感知：如果前后段都属于某章节，增加该章节分数
    if (allParagraphs && allParagraphs.length > 1) {
      // 这个需要在 postProcess 中处理，这里只给基础分数
    }

    return score;
  },

  // ========== 3. 关键点检测（v2增强：扩充检测项） ==========

  detectKeyPoints(text, author) {
    const points = [];

    // 数据检测
    const dataPatterns = [
      { pattern: /(\d{1,3}(,\d{3})*\.?\d*)\s*[万亿千万]元?/g, type: 'data', label: '金额数据' },
      { pattern: /(\d{1,3}(,\d{3})*\.?\d*)\s*%/g, type: 'data', label: '百分比数据' },
      { pattern: /(\d{1,3}(,\d{3})*)\s*(人|人次|户|家|个|项|条|份|件|亩|公顷|平方千米|平方米|吨|千克|克|千米|米|公里|里)/g, type: 'data', label: '数量数据' },
      { pattern: /\d{4}[年/-]\d{1,2}[月/-]\d{1,2}[日]?/g, type: 'data', label: '日期数据' },
      { pattern: /第\s*\d+\s*(季度|批|轮|期|阶段|届|次|版)/g, type: 'data', label: '阶段标识' },
      { pattern: /\d{4}[年]?\s*第?\s*\d+\s*号/g, type: 'data', label: '文件编号' }
    ];

    dataPatterns.forEach(({ pattern, type, label }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        points.push({ type, category: label, text: match[0], position: match.index,
          severity: 'info', message: `检测到${label}："${match[0]}"，请核实准确性` });
      }
    });

    // 政策依据检测
    const policyPatterns = [
      { pattern: /国发〔\d{4}〕\d+号/g, label: '国务院文件' },
      { pattern: /国办发〔\d{4}〕\d+号/g, label: '国务院办公厅文件' },
      { pattern: /中发〔\d{4}〕\d+号/g, label: '中央文件' },
      { pattern: /中办发〔\d{4}〕\d+号/g, label: '中央办公厅文件' },
      { pattern: /国资发〔\d{4}〕\d+号/g, label: '国资委文件' },
      { pattern: /GB\/T\s*\d+[\.\d]*/g, label: '国家标准' },
      { pattern: /(党的二十大|二十届[一二三四五六]中全会|中央经济工作会议|中央农村工作会议|全国两会)/g, label: '重要会议' },
      { pattern: /(习近平总书记|党中央|国务院|省委|市委|县委)[\u4e00-\u9fa5]{2,10}(指示|批示|讲话|精神|要求|部署)/g, label: '领导指示' }
    ];

    policyPatterns.forEach(({ pattern, label }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        points.push({ type: 'policy', category: label, text: match[0], position: match.index,
          severity: 'info', message: `引用${label}：${match[0]}，请确认准确无误` });
      }
    });

    // 机构/会议检测
    const entityPatterns = [
      { pattern: /党委常委会|党委会|董事会|监事会|总经理办公会|专题会|周例会|月度会|季度会|年度会/g, label: '会议名称' },
      { pattern: /(中央|国务院|国资委|发改委|财政部|人社部|工信部|商务部|教育部|科技部|住建部|交通部|水利部|农业部|卫健委|统计局|税务总局|市场监管总局)[\u4e00-\u9fa5]{2,6}/g, label: '机构名称' }
    ];

    entityPatterns.forEach(({ pattern, label }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        points.push({ type: 'entity', category: label, text: match[0], position: match.index,
          severity: 'info', message: `涉及${label}："${match[0]}"，请确认表述规范` });
      }
    });

    // 口语化表达检测（大幅扩充）
    const oralPatterns = {
      '咱们': '建议改为"我公司"或"本单位"',
      '咋': '建议改为"如何"',
      '啥': '建议改为"什么"',
      '拖后腿': '建议改为"进展较慢"或"进度滞后"',
      '包袱比较重': '建议改为"思想负担较重"',
      '总的来说': '建议删除或改为"总体上看"',
      '做得不错': '建议改为"取得一定成效"',
      '还行': '建议改为"基本达标"或"进展良好"',
      '搞': '建议改为"开展""推进""落实"',
      '弄': '建议改为"处理""办理""落实"',
      '挺': '建议改为"较为""比较"',
      '挺多的': '建议改为"较多""数量较大"',
      '挺大的': '建议改为"较大""显著"',
      '挺快': '建议改为"较快""迅速"',
      '挺慢': '建议改为"较慢""滞后"',
      '挺难': '建议改为"较难""困难"',
      '挺容易': '建议改为"较易""容易"',
      '基本上': '建议改为"基本""总体上"',
      '大概': '建议改为"约""大约"',
      '差不多': '建议改为"接近""近似"',
      '一下子': '建议改为"迅速""立即"',
      '一口气': '建议改为"一次性"',
      '一股脑': '建议改为"全面""系统"',
      '一刀切': '建议改为"统一标准""统一要求"',
      '拍脑袋': '建议改为"科学决策""民主决策"',
      '走过场': '建议改为"流于形式"',
      '打擦边球': '建议改为"把握边界""规避风险"',
      '和稀泥': '建议改为"协调平衡"',
      '踢皮球': '建议改为"推诿扯皮"',
      '背黑锅': '建议改为"承担责任"',
      '开绿灯': '建议改为"提供便利""给予支持"',
      '走后门': '建议改为"特殊渠道"',
      '摆谱': '建议改为"讲究排场"',
      '摆架子': '建议改为"高高在上"',
      '拍马屁': '建议改为"阿谀奉承"',
      '吹牛皮': '建议改为"夸大其词"',
      '瞎折腾': '建议改为"反复折腾"'
    };

    for (const [pattern, suggestion] of Object.entries(oralPatterns)) {
      const regex = new RegExp(pattern, 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        points.push({ type: 'oral', category: '口语化表达', text: match[0], position: match.index,
          severity: 'warning', message: `口语化表达"${match[0]}"，${suggestion}` });
      }
    }

    // 待核实标记检测
    const verifyPatterns = [
      { pattern: /\[待核实\]|\(待核实\)|【待核实】/g, label: '待核实标记' },
      { pattern: /\[?待?确认\]?|\[?需?核实\]?/g, label: '待确认标记' },
      { pattern: /\[?待?补充\]?|\[?需?完善\]?/g, label: '待补充标记' }
    ];

    verifyPatterns.forEach(({ pattern, label }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        points.push({ type: 'verify', category: label, text: match[0], position: match.index,
          severity: 'warning', message: `发现${label}：${match[0]}，请在并稿前确认` });
      }
    });

    // 格式问题检测
    const formatPatterns = [
      { pattern: /\s+([，。、；：！？""''（）])/g, label: '标点前置空格' },
      { pattern: /([，。、；：！？""''（）])\s+/g, label: '标点后置空格' },
      { pattern: /[a-zA-Z]+@[a-zA-Z]+\.[a-zA-Z]+/g, label: '邮箱地址' },
      { pattern: /1[3-9]\d{9}/g, label: '手机号码' }
    ];

    formatPatterns.forEach(({ pattern, label }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        points.push({ type: 'format', category: label, text: match[0], position: match.index,
          severity: 'info', message: `格式提示：发现${label}，请确认是否需要保留` });
      }
    });

    points.sort((a, b) => a.position - b.position);

    return { total: points.length, byType: this.groupByType(points), points };
  },

  groupByType(points) {
    const groups = {};
    points.forEach(p => { if (!groups[p.type]) groups[p.type] = []; groups[p.type].push(p); });
    return groups;
  },

  // ========== 4. 素材间重复检测 ==========

  detectDuplicates(materials) {
    const duplicates = [];
    const paragraphs = [];

    // 收集所有段落
    materials.forEach((m, mi) => {
      const paras = (m.alignedText || m.text).split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 10);
      paras.forEach((p, pi) => {
        paragraphs.push({ text: p, materialIndex: mi, paragraphIndex: pi, author: m.author });
      });
    });

    // 两两比较相似度
    for (let i = 0; i < paragraphs.length; i++) {
      for (let j = i + 1; j < paragraphs.length; j++) {
        const a = paragraphs[i];
        const b = paragraphs[j];
        // 只比较不同素材之间的段落
        if (a.materialIndex === b.materialIndex) continue;

        const sim = this.calculateSimilarity(a.text, b.text);
        if (sim >= 0.7) {
          duplicates.push({
            type: sim >= 0.9 ? 'duplicate' : 'similar',
            similarity: Math.round(sim * 100),
            sourceA: { author: a.author, text: a.text.substring(0, 80) + (a.text.length > 80 ? '...' : '') },
            sourceB: { author: b.author, text: b.text.substring(0, 80) + (b.text.length > 80 ? '...' : '') }
          });
        }
      }
    }

    return duplicates;
  },

  // 计算两段文字的相似度（基于公共子序列）
  calculateSimilarity(a, b) {
    if (a === b) return 1.0;
    if (!a || !b) return 0;

    // 预处理：去除空格和标点
    const cleanA = a.replace(/\s+/g, '').replace(/[，。、；：！？""''（）]/g, '');
    const cleanB = b.replace(/\s+/g, '').replace(/[，。、；：！？""''（）]/g, '');

    if (cleanA === cleanB) return 1.0;

    // 使用最长公共子序列（LCS）
    const lcs = this.longestCommonSubsequence(cleanA, cleanB);
    return (2 * lcs) / (cleanA.length + cleanB.length);
  },

  longestCommonSubsequence(a, b) {
    const m = a.length, n = b.length;
    if (m === 0 || n === 0) return 0;

    // 使用滚动数组优化空间
    let prev = new Array(n + 1).fill(0);
    let curr = new Array(n + 1).fill(0);

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          curr[j] = prev[j - 1] + 1;
        } else {
          curr[j] = Math.max(prev[j], curr[j - 1]);
        }
      }
      [prev, curr] = [curr, prev];
    }

    return prev[n];
  },

  // ========== 5. 数据一致性检查 ==========

  detectDataInconsistencies(materials) {
    const inconsistencies = [];
    const dataMap = {}; // 按数据标签分组

    // 从所有素材中提取关键数据
    materials.forEach((m, mi) => {
      const text = m.alignedText || m.text;

      // 金额
      const amountPattern = /(\d{1,3}(,\d{3})*\.?\d*)\s*[万亿千万]元?/g;
      let match;
      while ((match = amountPattern.exec(text)) !== null) {
        const key = `amount_${match[0].replace(/\s+/g, '')}`;
        if (!dataMap[key]) dataMap[key] = [];
        dataMap[key].push({ value: match[0], author: m.author, context: text.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20) });
      }

      // 百分比
      const percentPattern = /(\d{1,3}(,\d{3})*\.?\d*)\s*%/g;
      while ((match = percentPattern.exec(text)) !== null) {
        const key = `percent_${match[0].replace(/\s+/g, '')}`;
        if (!dataMap[key]) dataMap[key] = [];
        dataMap[key].push({ value: match[0], author: m.author, context: text.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20) });
      }

      // 数量（人/户/个等）
      const countPattern = /(\d{1,3}(,\d{3})*)\s*(人|人次|户|家|个|项)/g;
      while ((match = countPattern.exec(text)) !== null) {
        const key = `count_${match[0].replace(/\s+/g, '')}`;
        if (!dataMap[key]) dataMap[key] = [];
        dataMap[key].push({ value: match[0], author: m.author, context: text.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20) });
      }
    });

    // 检查同一数据在不同素材中是否有不同值
    Object.entries(dataMap).forEach(([key, entries]) => {
      if (entries.length > 1) {
        const uniqueValues = [...new Set(entries.map(e => e.value))];
        if (uniqueValues.length > 1) {
          inconsistencies.push({
            type: 'conflict',
            label: key.split('_')[0],
            values: uniqueValues,
            sources: entries.map(e => ({ author: e.author, value: e.value, context: e.context }))
          });
        }
      }
    });

    return inconsistencies;
  },

  // ========== 6. 合并素材（按重组后的章节结构汇总） ==========

  mergeMaterials(materials, docType) {
    const template = this.getTemplate(docType);
    if (!template) return null;

    // 先对每个素材进行重组
    const restructured = materials.map(m => this.restructureMaterial(m, docType));

    // 检测素材间重复
    const duplicates = this.detectDuplicates(materials);

    // 检测数据一致性
    const inconsistencies = this.detectDataInconsistencies(materials);

    // 按章节汇总所有素材的对应段落
    const sections = template.structure.sections.map(secDef => {
      const secParagraphs = [];

      restructured.forEach(rs => {
        const secData = rs.bySection[secDef.id];
        if (secData && secData.paragraphs.length > 0) {
          secParagraphs.push({
            author: rs.author,
            paragraphs: secData.paragraphs.map(p => p.text)
          });
        }
      });

      if (secParagraphs.length === 0) {
        return {
          heading: secDef.title,
          level: 1,
          content: `[${secDef.title} — 待补充]`,
          isEmpty: true,
          sourceMaterials: []
        };
      }

      // 合并：每作者的段落用 【作者】标注
      const mergedContent = secParagraphs.map(sp => {
        return `【${sp.author}】\n${sp.paragraphs.join('\n\n')}`;
      }).join('\n\n');

      return {
        heading: secDef.title,
        level: 1,
        content: mergedContent,
        isEmpty: false,
        sourceMaterials: secParagraphs.map(sp => ({
          author: sp.author,
          originalText: sp.paragraphs.join('\n\n'),
          status: 'adopted'
        }))
      };
    });

    // 收集所有关键点
    const allKeyPoints = materials.flatMap(m => m.keyPoints?.points || []);

    return {
      version: '2.0',
      docType: docType,
      docTypeName: template.name,
      title: '[请填写标题]',
      sender: '[发文单位]',
      recipient: '',
      date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
      sections: sections,
      attachments: [],
      notes: '由公文整合助手自动合并生成，各章节标注了素材来源。',
      complianceChecks: allKeyPoints.map(p => ({
        type: p.type === 'oral' ? 'language' : 'data',
        location: p.category,
        message: p.message,
        severity: p.severity
      })),
      duplicates: duplicates,
      inconsistencies: inconsistencies,
      customTemplate: null,
      exportedAt: new Date().toISOString()
    };
  },

  // ========== 7. 覆盖矩阵（基于重组后的分布） ==========

  generateCoverageMatrix(materials, docType) {
    const template = this.getTemplate(docType);
    const restructured = materials.map(m => this.restructureMaterial(m, docType));

    return template.structure.sections.map(sec => ({
      section: sec.title,
      coverage: restructured.map(rs => {
        const secData = rs.bySection[sec.id];
        return {
          author: rs.author,
          hasContent: secData && secData.paragraphs.length > 0,
          paragraphCount: secData ? secData.paragraphs.length : 0
        };
      })
    }));
  },

  // ========== 8. 模板定义 ==========

  getTemplate(docType) {
    const templates = {
      presentation: {
        name: '汇报材料',
        structure: {
          sections: [
            { id: 'background', title: '背景', required: true },
            { id: 'practices', title: '主要做法', required: true },
            { id: 'achievements', title: '工作成效', required: true },
            { id: 'problems', title: '存在问题', required: false },
            { id: 'plans', title: '下一步打算', required: false }
          ]
        }
      },
      report: {
        name: '报告',
        structure: {
          sections: [
            { id: 'background', title: '报告缘由', required: true },
            { id: 'practices', title: '主要做法', required: true },
            { id: 'achievements', title: '工作成效', required: true },
            { id: 'problems', title: '存在问题', required: true },
            { id: 'plans', title: '下一步打算', required: true }
          ]
        }
      },
      request: {
        name: '请示',
        structure: {
          sections: [
            { id: 'purpose', title: '请示缘由', required: true },
            { id: 'content', title: '请示事项', required: true },
            { id: 'requirements', title: '审批要求', required: true }
          ]
        }
      },
      notice: {
        name: '通知',
        structure: {
          sections: [
            { id: 'purpose', title: '通知事由', required: true },
            { id: 'content', title: '通知内容', required: true },
            { id: 'requirements', title: '执行要求', required: true }
          ]
        }
      },
      letter: {
        name: '函',
        structure: {
          sections: [
            { id: 'purpose', title: '函询事由', required: true },
            { id: 'content', title: '函询内容', required: true },
            { id: 'requirements', title: '回复要求', required: false }
          ]
        }
      },
      minutes: {
        name: '纪要',
        structure: {
          sections: [
            { id: 'basic', title: '会议基本情况', required: true },
            { id: 'content', title: '会议议定事项', required: true },
            { id: 'requirements', title: '贯彻落实要求', required: true }
          ]
        }
      },
      briefing: {
        name: '简报',
        structure: {
          sections: [
            { id: 'overview', title: '情况概述', required: true },
            { id: 'practices', title: '主要做法', required: true },
            { id: 'achievements', title: '工作成效', required: true },
            { id: 'problems', title: '存在问题', required: false },
            { id: 'plans', title: '下一步打算', required: false }
          ]
        }
      },
      speech: {
        name: '讲话稿',
        structure: {
          sections: [
            { id: 'opening', title: '开场白', required: true },
            { id: 'content', title: '主要讲话内容', required: true },
            { id: 'closing', title: '结语', required: true }
          ]
        }
      },
      summary: {
        name: '工作总结',
        structure: {
          sections: [
            { id: 'overview', title: '总体情况', required: true },
            { id: 'practices', title: '主要做法', required: true },
            { id: 'achievements', title: '工作成效', required: true },
            { id: 'problems', title: '存在问题', required: true },
            { id: 'plans', title: '下一步打算', required: true }
          ]
        }
      },
      'work-plan': {
        name: '工作方案',
        structure: {
          sections: [
            { id: 'background', title: '工作背景与目标', required: true },
            { id: 'tasks', title: '主要任务', required: true },
            { id: 'measures', title: '保障措施', required: true },
            { id: 'schedule', title: '进度安排', required: false }
          ]
        }
      }
    };

    return templates[docType] || templates.presentation;
  }
};
