const express = require('express');
const cors = require('cors');
const { init } = require('./db/init');

const authRoutes = require('./routes/auth');
const elderRoutes = require('./routes/elders');
const assessmentRoutes = require('./routes/assessments');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/elders', elderRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

app.use((req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: '请求体 JSON 格式错误' });
  }
  console.error(err);
  res.status(500).json({ message: '服务器内部错误' });
});

function start(port = PORT) {
  return init()
    .then(() => {
      return app.listen(port, () => {
        console.log(`失能评估辅助系统后端已启动: http://localhost:${port}/api`);
      });
    });
}

// 直接运行 `node app.js` 时启动；被测试/其他模块 require 时不自动监听
if (require.main === module) {
  start().catch((err) => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  });
}

module.exports = { app, start };
