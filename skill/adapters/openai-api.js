const fs = require('fs');
const path = require('path');

/**
 * OpenAI 兼容 API 适配器
 * 支持任意 OpenAI-compatible 后端（如 GPT-4、DeepSeek、本地 vLLM 等）
 */
class OpenAIAdapter {
  /**
   * @param {Object} config - 配置对象
   * @param {string} [config.apiKey] - API 密钥，默认读取 OPENAI_API_KEY 环境变量
   * @param {string} [config.baseURL] - API 基础地址，默认读取 OPENAI_BASE_URL 或 OpenAI 官方地址
   * @param {string} [config.model] - 模型名称，默认 'gpt-4'
   */
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.baseURL = config.baseURL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.model = config.model || 'gpt-4';
  }

  /**
   * 构建 system prompt
   * 融合核心规则与目标文种定义
   * @param {string} docType - 文种 ID
   * @returns {string} system prompt 文本
   */
  buildSystemPrompt(docType) {
    const sharedDir = path.join(__dirname, '../../shared');
    const docTypeFile = path.join(sharedDir, 'doc-types', `${docType}.json`);
    const policyFile = path.join(__dirname, '../prompts/core/policy.md');

    let docTypeDef = null;
    if (fs.existsSync(docTypeFile)) {
      docTypeDef = JSON.parse(fs.readFileSync(docTypeFile, 'utf-8'));
    }

    let coreRules = '';
    if (fs.existsSync(policyFile)) {
      coreRules = fs.readFileSync(policyFile, 'utf-8');
    }

    const parts = [];
    if (coreRules) parts.push(coreRules);
    if (docTypeDef) parts.push(`## 文种定义\n${JSON.stringify(docTypeDef, null, 2)}`);

    return parts.join('\n\n');
  }

  /**
   * 发送请求（骨架）
   * 实际实现需调用 fetch/axios 发送 HTTP 请求到 /chat/completions
   * @param {Array} messages - OpenAI messages 格式数组
   * @returns {Promise<Object>} API 响应骨架
   */
  async sendRequest(messages) {
    // 实际实现示例（需安装 node-fetch 或 axios）：
    // const response = await fetch(`${this.baseURL}/chat/completions`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${this.apiKey}`
    //   },
    //   body: JSON.stringify({ model: this.model, messages })
    // });
    // return response.json();
    console.log('OpenAI API 请求骨架');
    console.log('URL:', `${this.baseURL}/chat/completions`);
    console.log('Model:', this.model);
    return { choices: [{ message: { content: '{}' } }] };
  }
}

module.exports = { OpenAIAdapter };
