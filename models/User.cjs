const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // full name of the user
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minLength: [2, 'Name must be at least 2 characters long'],
        maxLength: [100, 'Name cannot exceed 100 characters']
    },

    // email address
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please fill a valid email address'
        ]
    },
    // hashed password
    password: {
        type: String,
        required: [true, 'Password is required'],
        minLength: [8, 'Password must be at least 8 characters long'],
        select: false
    },

    // blockchain specific fields
    // ethereum wallet address
    walletAddress: {
        type: String,
        required: [true, 'Wallet address is required'],
        unique: true,
        lowercase: true,
        match: [
            /^0x[a-fA-F0-9]{40}$/,
            'Please provide a valid Ethereum wallet address'
        ]

    },

    isEmailVerified: {
        type: Boolean,
        default: false
    },

    // user role
    role: {
        type: String,
        enum: ['voter', 'admin'],
        default: 'voter'
    },

    isActive: {
        type: Boolean,
        default: true
    },

    // voting history and stats
    // FIXED: Added candidateId field (not required for backward compatibility)
    participatedElections: [{
        electionId: {
            type: Number,
            required: true
        },
        candidateId: {
            type: Number,
            default: null  // Not required - allows updating old records
        },
        votedAt: {
            type: Date,
            default: Date.now
        },  
    }],

    totalVotesCast: {
        type: Number,
        default: 0,
        min: 0
    },

    // security and tracking

    // track when user last logged in
    lastLogin: {
        type: Date,
        default: null
    },

    // ip address of last login
    lastLoginIP: {
        type: String,
        default: null
    },

    // failed login attempts
    failedLoginAttempts: {
        type: Number,
        default: 0,
    },

    // account locked due to many failed attempts

    isLocked: {
        type: Boolean,
        default: false
    },

    // when the account was locked (auto unlock after certain time)
    lockUntil: {
        type: Date,
        default: null
    },

    // password reset

    resetPasswordToken: {
        type: String,
        default: null
    },

    // when the reset token expires

    resetPasswordExpire: {
        type: Date,
        default: null
    },

}, { timestamps: true });

// indexes for performance optimization
// FIXED: Removed duplicate indexes (unique: true already creates an index)
userSchema.index({ isActive: 1, role: 1 });

// virtual properties
userSchema.virtual('participationRate').get(function() {
    return this.totalVotesCast; // for now we don't have total elections count
});

// instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.default.compare(candidatePassword, this.password);
};

userSchema.methods.incLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { failedLoginAttempts: 1 },
            $unset: { lockUntil: 1, isLocked: 1 }
        });
    }
    // increment failed attempts
    const updates = { $inc: { failedLoginAttempts: 1 } };

    // lock the account if max attempts reached
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000; // 2 hours
    if (this.failedLoginAttempts + 1 >= maxAttempts && !this.isLocked) {
        updates.$set = {
            isLocked: true,
            lockUntil: Date.now() + lockTime
        };
    }

    return this.updateOne(updates);
};

// reset login attempts after successful login
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $set: { failedLoginAttempts: 0 },
        $unset: { lockUntil: 1, isLocked: 1 }
    });
};

// generate password reset token
userSchema.methods.getResetPasswordToken = function() {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

// middleware pre hooks

userSchema.pre('save', async function() {
    // only hash the password if it has been modified or is new
    if (!this.isModified('password')) {
        return;
    }

    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.default.genSalt(10);
    this.password = await bcrypt.default.hash(this.password, salt);
});

// update totalVotesCast when participatedElections changes
userSchema.pre('save', function() {
    if (this.isModified('participatedElections')) {
        this.totalVotesCast = this.participatedElections.length;
    }
});

// static methods

// find user by wallet address
userSchema.statics.findByWallet = function(walletAddress) {
    return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

// find user by email and include password for login
userSchema.statics.findByCredentials = function(email) {
    return this.findOne({ email: email.toLowerCase() }).select('+password');
};

// get all active voters
userSchema.statics.getActiveVoters = function() {
    return this.find({ isActive: true, role: 'voter', isLocked: false });
};

// get voting stats
userSchema.statics.getVotingStats = async function() {
    const totalUsers = await this.countDocuments();
    const activeUsers = await this.countDocuments({ isActive: true });
    const totalVotes = await this.aggregate([
        { $group: { _id: null, total: { $sum: "$totalVotesCast" } } }
    ]);

    return {
        totalUsers,
        activeUsers,
        totalVotes: totalVotes[0]?.total || 0
    };
};

module.exports = mongoose.model('User', userSchema);