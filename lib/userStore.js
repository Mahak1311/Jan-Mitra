'use strict';
/**
 * lib/userStore.js
 * ──────────────────────────────────────────────────────────────
 * Unified user store. Uses Amazon DynamoDB when AWS credentials
 * are present; falls back to the local JSON file store otherwise.
 * Exposes the exact same interface as lib/fileUserStore.js so no
 * route code needs to change — only the require() path changes.
 */

const db       = require('./dynamoDB');
const FileUser = require('./fileUserStore');
const bcrypt   = require('bcryptjs');
const { randomUUID } = require('crypto');

// ── Attach instance methods to a plain DynamoDB item ─────────
function attachMethods(obj) {
  obj.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
  };

  obj.save = async function () {
    // Hash raw password on first save
    if (Object.prototype.hasOwnProperty.call(this, '_newPassword')) {
      if (this._newPassword) {
        this.password = await bcrypt.hash(this._newPassword, 10);
      }
      delete this._newPassword;
    }

    // DynamoDB path
    if (db.isConfigured()) {
      const item = {
        userId:           this._id,          // partition key
        _id:              this._id,
        name:             this.name,
        email:            this.email,
        password:         this.password,
        phone:            this.phone             || '',
        googleId:         this.googleId          || null,
        profile:          this.profile           || {},
        savedSchemes:     this.savedSchemes      || [],
        documentProgress: this.documentProgress  || [],
        createdAt:        this.createdAt
      };
      await db.putItem(db.TABLES.USERS, item);
      return;
    }

    // File fallback: delegate to original fileUserStore save
    await FileUser.prototype
      ? _fileSave(this) // shouldn't happen; fileUser already has save()
      : this._fileSave && this._fileSave();
  };

  return obj;
}

// ── Constructor: new User({ name, email, password, phone, googleId }) ───
function User(data) {
  // If DynamoDB not configured, just return a fileUserStore instance
  if (!db.isConfigured()) {
    return new FileUser(data);
  }
  this._id              = randomUUID();
  this.name             = data.name;
  this.email            = (data.email || '').toLowerCase().trim();
  this._newPassword     = data.password || null;
  this.password         = '';
  this.phone            = data.phone || '';
  this.googleId         = data.googleId || null;
  this.profile          = {};
  this.savedSchemes     = [];
  this.documentProgress = [];
  this.createdAt        = new Date().toISOString();
  attachMethods(this);
}

// ── Static finders ────────────────────────────────────────────
User.findOne = async function (query) {
  if (!db.isConfigured()) {
    return FileUser.findOne(query);
  }
  try {
    let items = [];
    if (query.email) {
      // Scan by email (for a production app, add a GSI on email)
      items = await db.scanTable(
        db.TABLES.USERS,
        'email = :e',
        { ':e': query.email.toLowerCase().trim() }
      );
    } else if (query._id) {
      const item = await db.getItem(db.TABLES.USERS, { userId: query._id });
      if (item) items = [item];
    } else if (query.googleId) {
      items = await db.scanTable(
        db.TABLES.USERS,
        'googleId = :g',
        { ':g': query.googleId }
      );
    }
    return items.length ? attachMethods({ ...items[0] }) : null;
  } catch (err) {
    console.warn('DynamoDB findOne failed, falling back to file:', err.message);
    return FileUser.findOne(query);
  }
};

User.findById = async function (id) {
  if (!db.isConfigured()) {
    return FileUser.findById(id);
  }
  try {
    const item = await db.getItem(db.TABLES.USERS, { userId: String(id) });
    if (item) return attachMethods({ ...item });
    // Fallback: maybe user was created before DynamoDB migration
    return FileUser.findById(id);
  } catch (err) {
    console.warn('DynamoDB findById failed, falling back to file:', err.message);
    return FileUser.findById(id);
  }
};

module.exports = User;
