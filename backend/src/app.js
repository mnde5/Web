const express = require('express');
const cors = require('cors');

const submissionsRouter = require('./routes/submissions');
const paymentsRouter = require('./routes/payments');
const examsRouter = require('./routes/exams');

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

// ── Health check ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'lms-backend',
    health: '/health',
    apiBase: '/bs/lms/v1',
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'lms-backend', timestamp: new Date().toISOString() });
});

// ── API v1 routes ───────────────────────────────────────────
const API_PREFIX = '/bs/lms/v1';

app.use(API_PREFIX, submissionsRouter);
app.use(API_PREFIX, paymentsRouter);
app.use(API_PREFIX, examsRouter);

// ── 404 handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route олдсонгүй: ${req.method} ${req.path}` });
});

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Серверийн алдаа гарлаа' });
});

module.exports = app;
