'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const app = express();

// Accept JSON bodies up to 10MB (base64 of a 2MB image is ~2.7MB of text)
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// OCR routes
app.use('/ocr', require('./routes/ocr'));

// Catch unmatched routes
app.use((req, res) => {
  res.status(404).json({ code: 404, message: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ocr-service] unhandled error:', err.message);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

// Prevent silent crashes from unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('[ocr-service] unhandledRejection:', reason);
});

const PORT = parseInt(process.env.PORT, 10) || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ocr-service running on http://0.0.0.0:${PORT}`);
});
