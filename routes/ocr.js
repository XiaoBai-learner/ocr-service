'use strict';

/**
 * routes/ocr.js — POST /ocr/parse
 *
 * Accepts JSON body { image: "<base64>", mime_type?: "image/jpeg" }
 * Returns { code: 0, data: { name, title, company, phone, work_phone, email, wechat, address } }
 */

const express = require('express');
const router = express.Router();
const parser = require('../parser');
const normalize = require('../normalize');

// Guard against concurrent OCR requests from the same process instance
let ocrParsing = false;

router.post('/parse', async (req, res) => {
  const { image, mime_type: mimeType = 'image/jpeg' } = req.body || {};

  // Validate required field
  if (!image || typeof image !== 'string' || image.trim() === '') {
    return res.json({ code: 400, message: '缺少 image 字段' });
  }

  // Guard: reject if a parse is already in progress on this instance
  if (ocrParsing) {
    return res.json({ code: 429, message: 'OCR 服务繁忙，请稍后重试' });
  }

  const start = Date.now();
  ocrParsing = true;
  let resultCode = 500;
  try {
    const raw = await parser.parse(image.trim(), mimeType);
    if (raw === null) {
      resultCode = 500;
      return res.json({ code: 500, message: '识别失败，请重试' });
    }
    const data = normalize.run(raw);
    resultCode = 0;
    return res.json({ code: 0, data });
  } catch (err) {
    console.error('[ocr/parse] unexpected error:', err.message);
    resultCode = 500;
    return res.json({ code: 500, message: 'OCR识别失败，请重试' });
  } finally {
    ocrParsing = false;
    console.log(`[ocr/parse] completed in ${Date.now() - start}ms, code=${resultCode}`);
  }
});

module.exports = router;
