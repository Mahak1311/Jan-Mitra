'use strict';
const express = require('express');
const router  = express.Router();
const https   = require('https');

const LANGUAGE_CODE_MAP = {
  'english': 'en',  'hindi': 'hi',    'gujarati': 'gu',
  'tamil':   'ta',  'telugu': 'te',   'bengali':  'bn',
  'marathi': 'mr',  'kannada': 'kn',  'malayalam': 'ml',
  'punjabi': 'pa',  'urdu': 'ur',     'odia': 'or'
};

// Google Translate unofficial API — joins texts with newlines, one request per chunk
function gtranslateChunk(texts, targetCode) {
  return new Promise((resolve) => {
    const clean = texts.map(t => (t || '').replace(/\n/g, ' ').trim());
    const joined = clean.join('\n');
    const path = '/translate_a/single?client=gtx&sl=en&tl=' +
      encodeURIComponent(targetCode) + '&dt=t&q=' + encodeURIComponent(joined);
    const req = https.request(
      { hostname: 'translate.googleapis.com', path, method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0' } },
      (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const translated = json[0].map(pair => pair[0]).join('');
            const parts = translated.split('\n');
            while (parts.length < clean.length) parts.push(clean[parts.length] || '');
            resolve(parts.slice(0, clean.length));
          } catch { resolve(clean); }
        });
      }
    );
    req.on('error', () => resolve(clean));
    req.end();
  });
}

async function translateBatch(texts, targetCode) {
  const CHUNK = 20;
  const results = [];
  for (let i = 0; i < texts.length; i += CHUNK) {
    const translated = await gtranslateChunk(texts.slice(i, i + CHUNK), targetCode);
    results.push(...translated);
  }
  return results;
}

// POST /api/translate
router.post('/', async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text is required' });
  if (!targetLang)           return res.status(400).json({ error: 'targetLang is required' });
  const targetCode = LANGUAGE_CODE_MAP[targetLang.toLowerCase()] || targetLang;
  if (targetCode === 'en') return res.json({ translatedText: text, sourceLang: 'en', targetLang: 'en', provider: 'none' });
  const [translated] = await translateBatch([text], targetCode);
  res.json({ translatedText: translated, sourceLang: 'en', targetLang: targetCode, provider: 'Google Translate' });
});

// POST /api/translate/batch
router.post('/batch', async (req, res) => {
  const { texts, targetLang } = req.body;
  if (!Array.isArray(texts) || texts.length === 0) return res.status(400).json({ error: 'texts array is required' });
  const targetCode = LANGUAGE_CODE_MAP[targetLang?.toLowerCase()] || targetLang || 'hi';
  if (targetCode === 'en') return res.json({ translatedTexts: texts, targetLang: 'en', provider: 'none' });
  const translatedTexts = await translateBatch(texts, targetCode);
  res.json({ translatedTexts, targetLang: targetCode, provider: 'Google Translate' });
});

module.exports = router;