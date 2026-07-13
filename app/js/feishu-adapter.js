// ==========================================
// 公文整合助手 - 飞书接口预留
// ==========================================

const feishuAdapter = {
  config: {
    webhookUrl: localStorage.getItem('feishu_webhook') || '',
    appId: localStorage.getItem('feishu_app_id') || '',
    appSecret: localStorage.getItem('feishu_app_secret') || ''
  },

  saveConfig() {
    localStorage.setItem('feishu_webhook', this.config.webhookUrl);
    localStorage.setItem('feishu_app_id', this.config.appId);
    localStorage.setItem('feishu_app_secret', this.config.appSecret);
  },

  isConfigured() {
    return !!(this.config.webhookUrl || this.config.appId);
  },

  async pushDocument(doc) {
    if (!this.isConfigured()) throw new Error('飞书未配置');
    console.log('[预留] 推送到飞书文档', doc);
  },

  async sendNotification(msg) {
    if (!this.isConfigured()) throw new Error('飞书未配置');
    console.log('[预留] 发送飞书消息', msg);
  },

  async pullContent(docId) {
    if (!this.isConfigured()) throw new Error('飞书未配置');
    console.log('[预留] 从飞书拉取内容', docId);
  }
};
