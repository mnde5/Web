const express = require('express');
const cors = require('cors');

const submissionsRouter = require('./routes/submissions');
const paymentsRouter = require('./routes/payments');

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'lms-backend', timestamp: new Date().toISOString() });
});

// ── API v1 routes ───────────────────────────────────────────
const API_PREFIX = '/bs/lms/v1';

app.use(API_PREFIX, submissionsRouter);
app.use(API_PREFIX, paymentsRouter);

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
