const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../lib/userStore'); // DynamoDB-backed, falls back to fileUserStore
const auth = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');

// Lazy-init Google client so the server starts fine even without credentials
let _googleClient = null;
function getGoogleClient() {
    if (!_googleClient && process.env.GOOGLE_CLIENT_ID) {
        _googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }
    return _googleClient;
}

// Register
router.post('/register', [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { name, email, password, phone } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const user = new User({ name, email, password, phone });
        await user.save();
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// Login
router.post('/login', [
    body('email').isEmail(),
    body('password').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profile: user.profile
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone,
            profile: req.user.profile,
            savedSchemes: req.user.savedSchemes,
            createdAt: req.user.createdAt
        }
    });
});

// Update profile
router.put('/profile', auth, async (req, res) => {
    try {
        const updates = req.body;
        const allowedUpdates = ['name', 'phone', 'profile'];
        
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                req.user[key] = updates[key];
            }
        });
        
        await req.user.save();
        res.json({
            message: 'Profile updated',
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                phone: req.user.phone,
                profile: req.user.profile,
                savedSchemes: req.user.savedSchemes,
                createdAt: req.user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Update failed', details: error.message });
    }
});

// ── GET /api/auth/google/client-id — expose public client ID to frontend ──────
router.get('/google/client-id', (req, res) => {
    res.json({ clientId: process.env.GOOGLE_CLIENT_ID || null });
});

// ── POST /api/auth/google — verify Google ID token, return our JWT ─────────────
router.post('/google', async (req, res) => {
    const { credential } = req.body;
    if (!credential) {
        return res.status(400).json({ error: 'Missing Google credential' });
    }
    const googleClient = getGoogleClient();
    if (!googleClient) {
        return res.status(501).json({ error: 'Google OAuth is not configured on this server. Add GOOGLE_CLIENT_ID to .env' });
    }

    try {
        // Verify the ID token Google sent to the browser
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const { sub: googleId, email, name } = ticket.getPayload();

        // Find existing account by Google ID first, then by email (link accounts)
        let user = await User.findOne({ googleId });
        if (!user) {
            user = await User.findOne({ email });
        }

        if (!user) {
            // New user — create an account with no password (OAuth-only)
            user = new User({ name, email, password: null, googleId });
            await user.save();
        } else if (!user.googleId) {
            // Existing email-only user — link their Google account
            user.googleId = googleId;
            await user.save();
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            message: 'Google sign-in successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profile: user.profile || {}
            }
        });
    } catch (err) {
        console.error('Google auth error:', err.message);
        res.status(401).json({ error: 'Invalid Google credential. Please try again.' });
    }
});

module.exports = router;
