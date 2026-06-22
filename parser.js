'use strict';

/**
 * parser.js — LLM vision API call and JSON extraction.
 *
 * Calls an OpenAI-compatible chat/completions endpoint with a base64 image,
 * instructs the model to return a structured JSON of business card fields,
 * strips markdown code fences, and JSON-parses the result.
 *
 * Returns a raw parsed object on success, or null on any failure (LLM error, missing key, parse error).
 */

const axios = require('axios');

const SYSTEM_PROMPT = `你是一个名片 OCR 助手，擅长识别中文（简体和繁体）及英文名片。
请从用户提供的名片图片中提取以下字段，仅输出符合规范的 JSON，不要任何解释或 markdown 标记：

{
  "name": "姓名，不可识别时为空字符串",
  "title": "职位/职务，不可识别时为空字符串",
  "company": "公司全称，不可识别时为空字符串",
  "phone": "手机号码（11位纯数字，已去除空格和连字符），不可识别时为空字符串",
  "work_phone": "座机/工作电话（含区号，如 0755-88888888），不可识别时为空字符串",
  "email": "工作邮箱（小写），不可识别时为空字符串",
  "wechat": "微信号（纯文字ID），不可识别时为空字符串",
  "address": "办公地址，不可识别时为空字符串"
}

规则：
- 所有字段值必须为字符串，不可识别时设为 ""（空字符串），绝不使用 null 或省略字段。
- phone 字段只放 11 位手机号，含区号的座机号放 work_phone。
- 若同一名片有多个手机号，取第一个。
- 只输出 JSON，不加任何前缀、后缀或注释。`;

/**
 * @param {string} imageBase64 — base64-encoded image data (no data URI prefix)
 * @param {string} mimeType — e.g. "image/jpeg", "image/png"
 * @returns {Promise<object|null>} — raw parsed object, or null on failure
 */
async function parse(imageBase64, mimeType) {
  const baseUrl = (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
  const apiKey = process.env.LLM_API_KEY || '';
  const model = process.env.LLM_MODEL || 'deepseek-chat';

  if (!apiKey) {
    console.error('[parser] LLM_API_KEY not configured');
    return null;
  }

  let raw = '';
  try {
    const resp = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` }
              }
            ]
          }
        ],
        max_tokens: 400,
        temperature: 0
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    raw = (resp.data.choices[0].message.content || '').trim();
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('[parser] LLM endpoint unreachable (ECONNREFUSED):', err.message);
    } else if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      console.error('[parser] LLM request timed out:', err.message);
    } else if (err.response) {
      console.error('[parser] LLM HTTP error', err.response.status, ':', err.response.data);
    } else {
      console.error('[parser] LLM request failed:', err.message);
    }
    return null;
  }

  // Strip markdown code fences if the model wrapped the JSON
  const jsonStr = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.error('[parser] LLM returned non-object JSON:', jsonStr.slice(0, 100));
      return null;
    }
    return parsed;
  } catch (parseErr) {
    console.error('[parser] JSON parse failed:', parseErr.message, '— raw:', jsonStr.slice(0, 200));
    return null;
  }
}

module.exports = { parse };
