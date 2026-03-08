'use strict';
/**
 * Drop-in replacement for the Mongoose User model using a local JSON file.
 * Implements the same interface used by routes/auth.js and middleware/auth.js:
 *   - new User({ name, email, password, phone })
 *   - await user.save()
 *   - await User.findOne({ email })
 *   - await User.findById(id)
 *   - user.comparePassword(candidate)
 */

const fs     = require('fs');
const path   = require('path');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const FILE = path.join(__dirname, '..', 'data', 'users.json');

/* ── file helpers ──────────────────────────────────────────── */
function load() {
    try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
    catch { return []; }
}

function persist(users) {
    fs.writeFileSync(FILE, JSON.stringify(users, null, 2));
}

/* ── strip non-serialisable methods before writing ─────────── */
function toPlain(obj) {
    return {
        _id:              obj._id,
        name:             obj.name,
        email:            obj.email,
        password:         obj.password,
        phone:            obj.phone            || '',
        googleId:         obj.googleId          || null,
        profile:          obj.profile          || {},
        savedSchemes:     obj.savedSchemes      || [],
        documentProgress: obj.documentProgress || [],
        createdAt:        obj.createdAt
    };
}

/* ── attach instance methods to a plain object ─────────────── */
function addMethods(obj) {
    obj.comparePassword = async function (candidate) {
        return bcrypt.compare(candidate, this.password);
    };

    obj.save = async function () {
        // Hash raw password on first save (set via constructor path)
        if (Object.prototype.hasOwnProperty.call(this, '_newPassword')) {
            if (this._newPassword) {
                this.password = await bcrypt.hash(this._newPassword, 10);
            }
            delete this._newPassword;
        }
        const snap  = toPlain(this);
        const users = load();
        const idx   = users.findIndex(u => u._id === this._id);
        if (idx >= 0) users[idx] = snap; else users.push(snap);
        persist(users);
    };

    return obj;
}

/* ── Constructor: new User({ name, email, password, phone, googleId }) ── */
function User(data) {
    this._id             = randomUUID();
    this.name            = data.name;
    this.email           = (data.email || '').toLowerCase().trim();
    this._newPassword    = data.password || null; // raw text; hashed on .save(); null for OAuth
    this.password        = '';                    // filled after .save()
    this.phone           = data.phone || '';
    this.googleId        = data.googleId || null;
    this.profile         = {};
    this.savedSchemes    = [];
    this.documentProgress = [];
    this.createdAt       = new Date().toISOString();
    addMethods(this);
}

/* ── Static finders ────────────────────────────────────────── */
User.findOne = async function (query) {
    const users = load();
    let raw = null;
    if (query.email) {
        raw = users.find(u => u.email === query.email.toLowerCase().trim());
    } else if (query._id) {
        raw = users.find(u => u._id === query._id);
    } else if (query.googleId) {
        raw = users.find(u => u.googleId === query.googleId);
    }
    return raw ? addMethods({ ...raw }) : null;
};

User.findById = async function (id) {
    const users = load();
    const raw   = users.find(u => u._id === String(id));
    return raw ? addMethods({ ...raw }) : null;
};

module.exports = User;
