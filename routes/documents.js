const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const documentsData = require('../data/documents.json');

// Get user's document progress (protected) — must be before /:schemeId
router.get('/progress/:schemeId', auth, async (req, res) => {
    try {
        const progress = req.user.documentProgress.find(
            p => p.schemeId === req.params.schemeId
        );
        res.json(progress || { schemeId: req.params.schemeId, documents: [] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

// Update user's document progress (protected)
router.post('/progress', auth, async (req, res) => {
    try {
        const { schemeId, documentId, completed } = req.body;
        
        let schemeProgress = req.user.documentProgress.find(p => p.schemeId === schemeId);
        
        if (!schemeProgress) {
            schemeProgress = { schemeId, documents: [] };
            req.user.documentProgress.push(schemeProgress);
        }
        
        let docProgress = schemeProgress.documents.find(d => d.documentId === documentId);
        
        if (docProgress) {
            docProgress.completed = completed;
            docProgress.completedAt = completed ? new Date() : null;
        } else {
            schemeProgress.documents.push({
                documentId,
                completed,
                completedAt: completed ? new Date() : null
            });
        }
        
        await req.user.save();
        
        res.json({
            success: true,
            message: 'Progress updated',
            progress: schemeProgress
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// Get document checklist for a scheme — kept last so /progress/* routes match first
router.get('/:schemeId', (req, res) => {
    const checklist = documentsData[req.params.schemeId];
    if (checklist) {
        res.json(checklist);
    } else {
        res.status(404).json({ error: 'Document checklist not found' });
    }
});

module.exports = router;
