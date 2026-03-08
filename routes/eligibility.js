const express = require('express');
const router = express.Router();

// Check eligibility for a scheme
router.post('/check', (req, res) => {
    const { schemeId, userProfile } = req.body;
    
    // Simple eligibility logic (expand based on actual scheme rules)
    const eligibility = {
        eligible: true,
        reasons: [],
        score: 85
    };
    
    // Example checks
    if (userProfile.income > 300000 && schemeId === 'pm-awas') {
        eligibility.eligible = false;
        eligibility.reasons.push('Income exceeds limit for PM Awas Yojana');
    }
    
    if (userProfile.age < 18) {
        eligibility.eligible = false;
        eligibility.reasons.push('Must be 18 years or older');
    }
    
    if (eligibility.eligible) {
        eligibility.reasons.push('Meets all eligibility criteria');
    }
    
    res.json(eligibility);
});

// Get eligibility criteria for a scheme
router.get('/:schemeId', (req, res) => {
    const criteria = {
        schemeId: req.params.schemeId,
        criteria: [
            { type: 'age', min: 18, max: 70 },
            { type: 'income', max: 300000 },
            { type: 'residence', required: 'Indian citizen' }
        ]
    };
    res.json(criteria);
});

module.exports = router;
