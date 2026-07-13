/**
 * 表格标准化处理模块
 * 功能：解析各种格式的表格文本，转换为标准公文表格
 */

const fs = require('fs');
const path = require('path');

const TABLE_STYLE = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../shared/table-style.json'), 'utf-8'
));

const tableFormatter = {
  /**
   * 从文本中识别和提取表格
   * 支持多种表格格式：
   *   - Markdown 表格
   *   - 空格/制表符对齐表格
   *   - 等宽字符表格
   *   - 文本中的行列数据
   */
  extractTables(text) {
    const tables = [];
    const lines = text.split('\n');
    let i = 0;

    while (i < lines.length) {
      // 尝试识别 Markdown 表格
      const mdTable = this._parseMarkdownTable(lines, i);
      if (mdTable) {
        tables.push(mdTable);
        i = mdTable.endLine + 1;
        continue;
      }

      // 尝试识别空格/制表符对齐表格
      const spacedTable = this._parseSpacedTable(lines, i);
      if (spacedTable) {
        tables.push(spacedTable);
        i = spacedTable.endLine + 1;
        continue;
      }

      i++;
    }

    return tables;
  },

  /**
   * 解析 Markdown 格式表格
   * 格式：| 列1 | 列2 | 列3 |
   */
  _parseMarkdownTable(lines, startIdx) {
    let i = startIdx;
    const rows = [];
    let caption = null;
    let footer = null;

    // 检查上方是否有表格标题（支持"表1：xxx"或"表1 xxx"格式）
    if (startIdx > 0) {
      const prevLine = lines[startIdx - 1].trim();
      if (prevLine.match(/^表\d+\s*[：:]\s*/)) {
        caption = prevLine;
      }
    }
    // 同时检查再上一行（有时标题和表格之间有空行）
    if (!caption && startIdx > 1) {
      const prevPrevLine = lines[startIdx - 2].trim();
      if (prevPrevLine.match(/^表\d+\s*[：:]\s*/)) {
        caption = prevPrevLine;
      }
    }

    // 解析表格行
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line.startsWith('|') || !line.endsWith('|')) break;
      
      // 跳过分隔行（| --- | --- |）
      if (line.match(/^\|[\s\-:]+\|/)) {
        i++;
        continue;
      }

      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      if (cells.length >= 2) {
        rows.push(cells);
      }
      i++;
    }

    if (rows.length < 1) return null;

    // 检查下方是否有备注
    if (i < lines.length) {
      const nextLine = lines[i].trim();
      if (nextLine.match(/^(注[：:]?|备注[：:]?|说明[：:]?)/)) {
        footer = nextLine;
      }
    }

    return {
      type: 'markdown',
      startLine: startIdx,
      endLine: i - 1,
      caption,
      header: rows[0],
      rows: rows.slice(1),
      footer,
      columnCount: rows[0].length
    };
  },

  /**
   * 解析空格/制表符对齐表格
   * 格式：列1    列2    列3
   *       数据1  数据2  数据3
   */
  _parseSpacedTable(lines, startIdx) {
    let i = startIdx;
    const rows = [];
    let caption = null;

    // 检查上方是否有表格标题
    if (startIdx > 0) {
      const prevLine = lines[startIdx - 1].trim();
      if (prevLine.match(/^表\d+\s*[：:]\s*/)) {
        caption = prevLine;
      }
    }

    // 收集连续的数据行（至少2行，有制表符或多个空格分隔）
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line || line.match(/^[=-]+$/)) break;
      
      // 识别分隔方式
      const cells = this._splitSpacedLine(line);
      if (cells.length < 2) break;
      
      rows.push(cells);
      i++;
    }

    if (rows.length < 2) return null;

    return {
      type: 'spaced',
      startLine: startIdx,
      endLine: i - 1,
      caption,
      header: rows[0],
      rows: rows.slice(1),
      columnCount: rows[0].length
    };
  },

  /**
   * 按空格/制表符分割一行
   */
  _splitSpacedLine(line) {
    // 优先按制表符分割
    if (line.includes('\t')) {
      return line.split('\t').map(c => c.trim()).filter(c => c.length > 0);
    }
    // 按多个空格分割
    return line.split(/\s{2,}/).map(c => c.trim()).filter(c => c.length > 0);
  },

  /**
   * 将提取的表格转换为标准格式
   * @param {Array} tables - extractTables 的结果
   * @param {number} startIndex - 表格编号起始值
   * @returns {Array} 标准化后的表格数据
   */
  standardizeTables(tables, startIndex = 1) {
    return tables.map((table, idx) => {
      const tableNum = startIndex + idx;
      
      // 判断每列的数据类型（文本/数字）
      const columnTypes = this._detectColumnTypes(table.header, table.rows);
      
      // 推断对齐方式
      const alignments = columnTypes.map(type => {
        if (type === 'number') return 'right';
        if (type === 'date') return 'center';
        return 'left';
      });

      return {
        id: `table-${tableNum}`,
        index: tableNum,
        caption: this._generateCaption(table.caption, tableNum),
        header: {
          cells: table.header.map((cell, i) => ({
            text: cell,
            alignment: 'center',
            type: 'header'
          }))
        },
        rows: table.rows.map(row => ({
          cells: row.map((cell, i) => ({
            text: cell,
            alignment: alignments[i] || 'center',
            type: columnTypes[i] || 'text'
          }))
        })),
        footer: table.footer || null,
        columnCount: table.columnCount,
        columnTypes,
        style: TABLE_STYLE
      };
    });
  },

  /**
   * 生成标准化的表格标题
   */
  _generateCaption(originalCaption, index) {
    if (originalCaption) {
      // 保留原标题，但统一格式
      return originalCaption.replace(/^表\d+\s*[：:]\s*/, '').trim();
    }
    return '';
  },

  /**
   * 检测每列的数据类型
   */
  _detectColumnTypes(header, rows) {
    if (!rows || rows.length === 0) return header.map(() => 'text');
    
    return header.map((_, colIdx) => {
      const values = rows.map(r => r[colIdx]).filter(v => v);
      if (values.length === 0) return 'text';
      
      // 检查是否为数字列（支持 "23.5%" "100%" "-8个百分点" "+6.5个百分点" "35.2亿元" "0.85亿元" 等）
      const numberCount = values.filter(v => {
        const val = v.trim();
        return /(^[\+\-]?[\d,]+\.?\d*\s*(%|个?百分?点|亿|万|千|元)?$)|(^[\+\-]?\d+\s*(%|个?百分?点)$)/.test(val);
      }).length;
      if (numberCount / values.length > 0.6) return 'number';
      
      // 检查是否为日期列
      const dateCount = values.filter(v => /^\d{4}[\-/年]/.test(v.trim())).length;
      if (dateCount / values.length > 0.6) return 'date';
      
      return 'text';
    });
  },

  /**
   * 将标准表格转换为 Markdown 格式（用于预览）
   */
  toMarkdown(table) {
    let md = '';
    
    // 标题
    if (table.caption) {
      md += `**表${table.index}：${table.caption}**\n\n`;
    }
    
    // 表头
    md += '| ' + table.header.cells.map(c => c.text).join(' | ') + ' |\n';
    md += '| ' + table.header.cells.map(() => '---').join(' | ') + ' |\n';
    
    // 数据行
    table.rows.forEach(row => {
      md += '| ' + row.cells.map(c => c.text).join(' | ') + ' |\n';
    });
    
    // 备注
    if (table.footer) {
      md += `\n*${table.footer}*\n`;
    }
    
    return md;
  },

  /**
   * 将文本中的表格替换为标准化后的 Markdown
   */
  processTextWithTables(text) {
    const tables = this.extractTables(text);
    if (tables.length === 0) return { text, tables: [] };
    
    const standardized = this.standardizeTables(tables);
    let processedText = text;
    
    // 从后向前替换（避免位置偏移）
    for (let i = tables.length - 1; i >= 0; i--) {
      const original = tables[i];
      const standard = standardized[i];
      const originalLines = text.split('\n').slice(original.startLine, original.endLine + 1).join('\n');
      const standardMd = this.toMarkdown(standard);
      
      processedText = processedText.replace(originalLines, standardMd);
    }
    
    return { text: processedText, tables: standardized };
  }
};

module.exports = { tableFormatter, TABLE_STYLE };
