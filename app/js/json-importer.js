// ==========================================
// 公文整合助手 - JSON 导入
// ==========================================

const jsonImporter = {
  // 处理文件导入
  async handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    app.updateStatus('正在导入...');

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 基本验证
      if (!data.version || !data.docType || !data.sections) {
        throw new Error('无效的 JSON 数据包格式');
      }

      // 创建项目
      const project = projectManager.createProject({
        title: data.title || '导入的文档',
        docType: data.docType,
        docTypeName: data.docTypeName || data.docType,
        document: data,
        originalDocument: JSON.parse(JSON.stringify(data)) // 深拷贝保留原始版本
      });

      app.updateStatus('导入成功');
      app.navigate('editor', { projectId: project.id });
    } catch (err) {
      console.error('导入失败', err);
      alert('导入失败: ' + err.message);
      app.updateStatus('导入失败');
    } finally {
      event.target.value = ''; // 重置 input
    }
  }
};
