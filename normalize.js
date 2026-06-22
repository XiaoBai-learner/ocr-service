'use strict';

/**
 * normalize.js — Field whitelist enforcement and data cleaning.
 *
 * Accepts a raw object from the LLM JSON response and returns a clean object
 * with exactly 8 string fields. All values are guaranteed to be non-null strings.
 */

const FIELD_WHITELIST = ['name', 'title', 'company', 'phone', 'work_phone', 'email', 'wechat', 'address'];

/**
 * @param {object} raw — parsed LLM JSON (may have extra/missing keys, wrong types)
 * @returns {{ name, title, company, phone, work_phone, email, wechat, address }}
 */
function run(raw) {
  const result = {};

  for (const field of FIELD_WHITELIST) {
    // Coerce to string; treat null/undefined/non-string as empty
    let val = raw != null && raw[field] != null ? String(raw[field]) : '';
    val = val.trim();

    if (field === 'phone') {
      // Remove spaces, dashes, parens — keep digits and leading +
      val = val.replace(/[\s\-\(\)]/g, '');
      // Only keep if it looks like a phone number (digits, optional leading +)
      if (!/^[+\d]{7,15}$/.test(val)) val = '';
    }

    if (field === 'work_phone') {
      // Seat phone — remove extra spaces but allow hyphens for area-code format
      val = val.replace(/\s+/g, '');
    }

    if (field === 'email') {
      val = val.toLowerCase().trim();
      // Basic validation: must contain @ and a dot after it
      if (!/@.+\..+/.test(val)) val = '';
    }

    result[field] = val;
  }

  return result;
}

module.exports = { run };
