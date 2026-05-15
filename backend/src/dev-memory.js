require('dotenv').config();

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./app');

const PORT = process.env.PORT || 3000;

let mongoServer;
let httpServer;

async function start() {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);

    httpServer = app.listen(PORT, () => {
      console.log(`MongoDB memory server connected: ${mongoUri}`);
      console.log(`Server running: http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Submissions API: http://localhost:${PORT}/bs/lms/v1/lessons/:lessonId/submissions`);
      console.log(`Exams API: http://localhost:${PORT}/bs/lms/v1/courses/:courseId/exams`);
    });
  } catch (err) {
    console.error('Failed to start memory backend:', err.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Stopping server...`);

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }

  await mongoose.connection.close();

  if (mongoServer) {
    await mongoServer.stop();
  }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
