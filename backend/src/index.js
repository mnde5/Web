require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lmsdb';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`✅ MongoDB холбогдлоо: ${MONGO_URI}`);
    app.listen(PORT, () => {
      console.log(`🚀 Server ажиллаж байна: http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`📦 Submissions API: http://localhost:${PORT}/bs/lms/v1/lessons/:lessonId/submissions`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB холбогдоход алдаа гарлаа:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM хүлээн авлаа. Серверийг зогсооно...');
  await mongoose.connection.close();
  process.exit(0);
});
