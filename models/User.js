const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    phone: {
        type: String,
        trim: true
    },
    profile: {
        age: Number,
        income: Number,
        state: String,
        district: String,
        occupation: String,
        category: String // General, OBC, SC, ST
    },
    savedSchemes: [{
        schemeId: String,
        savedAt: { type: Date, default: Date.now }
    }],
    documentProgress: [{
        schemeId: String,
        documents: [{
            documentId: String,
            completed: Boolean,
            completedAt: Date
        }]
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
