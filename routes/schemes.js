const express = require('express');
const router  = express.Router();
const db      = require('../lib/dynamoDB');
const localSchemes = require('../data/schemes.json'); // fallback

// ── Helper: fetch all schemes (DynamoDB → local JSON fallback) ─
async function getAllSchemes() {
  if (!db.isConfigured()) return localSchemes;
  try {
    const items = await db.scanTable(db.TABLES.SCHEMES);
    if (items.length === 0) return localSchemes; // table empty or not seeded yet
    // Normalise: DynamoDB items have schemeId as PK, keep id for compatibility
    return items.map(s => ({ ...s, id: s.id || s.schemeId }));
  } catch (err) {
    console.warn('DynamoDB scan failed, using local JSON:', err.message);
    return localSchemes;
  }
}

// ── Helper: get single scheme ─────────────────────────────────
async function getSchemeById(id) {
  if (db.isConfigured()) {
    try {
      const item = await db.getItem(db.TABLES.SCHEMES, { schemeId: id });
      if (item) return { ...item, id: item.id || item.schemeId };
    } catch (err) {
      console.warn('DynamoDB getItem failed, using local JSON:', err.message);
    }
  }
  return localSchemes.find(s => s.id === id) || null;
}

// Get all schemes
router.get('/', async (req, res) => {
  try {
    const schemes = await getAllSchemes();
    res.json(schemes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schemes' });
  }
});

// Get schemes by category
router.get('/category/:category', async (req, res) => {
  try {
    const category = req.params.category.toLowerCase();
    const all = await getAllSchemes();
    res.json(all.filter(s => s.category.toLowerCase() === category));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schemes' });
  }
});

// Get scheme by ID
router.get('/:id', async (req, res) => {
  try {
    const scheme = await getSchemeById(req.params.id);
    if (scheme) res.json(scheme);
    else res.status(404).json({ error: 'Scheme not found' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scheme' });
  }
});

// Search schemes
router.post('/search', async (req, res) => {
  try {
    const { query = '' } = req.body;
    const all = await getAllSchemes();
    const q = query.toLowerCase();
    res.json(all.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    ));
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
