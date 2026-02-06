// ============================================
// BLOCKCHAIN VOTING APP - BACKEND SERVER
// ============================================

// ============================================
// IMPORT REQUIRED PACKAGES (CommonJS syntax)
// ============================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('./models/User.cjs');

// ============================================
// INITIALIZE EXPRESS APP
// ============================================
const app = express();

// ============================================
// MIDDLEWARE SETUP
// ============================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
}));

// ============================================
// SERVE STATIC FILES
// ============================================

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html at root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================
// CONNECT TO MONGODB
// ============================================
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

connectDB();

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
};

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (!req.user.isActive) {
                return res.status(403).json({
                    success: false,
                    message: 'Account is deactivated'
                });
            }

            if (req.user.isLocked) {
                return res.status(403).json({
                    success: false,
                    message: 'Account is locked due to multiple failed login attempts'
                });
            }

            next();
        } catch (error) {
            console.error('Token verification error:', error.message);
            return res.status(401).json({
                success: false,
                message: 'Not authorized, token failed'
            });
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized, no token'
        });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Admin only.'
        });
    }
};

// ============================================
// API ROUTES
// ============================================

app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, walletAddress } = req.body;

        if (!name || !email || !password || !walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingUserByEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        const existingUserByWallet = await User.findByWallet(walletAddress);
        if (existingUserByWallet) {
            return res.status(400).json({
                success: false,
                message: 'Wallet address already registered'
            });
        }

        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password,
            walletAddress: walletAddress.toLowerCase()
        });

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                walletAddress: user.walletAddress,
                role: user.role,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        const user = await User.findByCredentials(email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (user.isLocked) {
            if (user.lockUntil && user.lockUntil > Date.now()) {
                const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
                return res.status(403).json({
                    success: false,
                    message: `Account is locked. Try again in ${lockTimeRemaining} minutes.`
                });
            } else {
                await user.resetLoginAttempts();
            }
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated. Contact administrator.'
            });
        }

        const isPasswordCorrect = await user.comparePassword(password);

        if (!isPasswordCorrect) {
            await user.incLoginAttempts();
            
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        await user.resetLoginAttempts();

        user.lastLogin = Date.now();
        user.lastLoginIP = req.ip || req.connection.remoteAddress;
        await user.save();

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                walletAddress: user.walletAddress,
                role: user.role,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
});

app.get('/api/auth/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                walletAddress: user.walletAddress,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                totalVotesCast: user.totalVotesCast,
                participatedElections: user.participatedElections,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    }
});

app.put('/api/auth/profile', protect, async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = await User.findById(req.user._id);

        if (name) user.name = name;
        if (email) {
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser && existingUser._id.toString() !== user._id.toString()) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
            user.email = email.toLowerCase();
            user.isEmailVerified = false;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                walletAddress: user.walletAddress,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
});

app.put('/api/auth/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide current and new password'
            });
        }

        const user = await User.findById(req.user._id).select('+password');
        const isPasswordCorrect = await user.comparePassword(currentPassword);
        
        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters'
            });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error changing password',
            error: error.message
        });
    }
});

app.post('/api/votes/record', protect, async (req, res) => {
    try {
        const { electionId, candidateId } = req.body;

        if (electionId === undefined || candidateId === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Please provide electionId and candidateId'
            });
        }

        const user = await User.findById(req.user._id);
        const existingVoteIndex = user.participatedElections.findIndex(
            pe => pe.electionId === Number(electionId)
        );

        if (existingVoteIndex !== -1) {
            user.participatedElections[existingVoteIndex].candidateId = Number(candidateId);
            user.participatedElections[existingVoteIndex].votedAt = 
                user.participatedElections[existingVoteIndex].votedAt || Date.now();
            
            await user.save();
            
            return res.status(200).json({
                success: true,
                message: 'Vote record updated successfully',
                totalVotesCast: user.totalVotesCast
            });
        }

        user.participatedElections.push({
            electionId: Number(electionId),
            candidateId: Number(candidateId),
            votedAt: Date.now()
        });

        await user.save();
        
        res.status(200).json({
            success: true,
            message: 'Vote recorded successfully',
            totalVotesCast: user.totalVotesCast
        });
    } catch (error) {
        console.error('Record vote error:', error);
        res.status(500).json({
            success: false,
            message: 'Error recording vote',
            error: error.message
        });
    }
});

app.get('/api/votes/history', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        res.status(200).json({
            success: true,
            totalVotes: user.totalVotesCast,
            history: user.participatedElections
        });
    } catch (error) {
        console.error('Get voting history error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching voting history',
            error: error.message
        });
    }
});

app.put('/api/auth/connect-wallet', protect, async (req, res) => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Please provide wallet address'
            });
        }

        const existingUser = await User.findByWallet(walletAddress);
        if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Wallet address already registered to another account'
            });
        }

        const user = await User.findById(req.user._id);
        user.walletAddress = walletAddress.toLowerCase();
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Wallet connected successfully',
            walletAddress: user.walletAddress
        });
    } catch (error) {
        console.error('Connect wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Error connecting wallet',
            error: error.message
        });
    }
});

// ADMIN ROUTES
app.get('/api/admin/users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find().select('-password');

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
});

app.get('/api/admin/stats', protect, adminOnly, async (req, res) => {
    try {
        const stats = await User.getVotingStats();

        res.status(200).json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
});

app.put('/api/admin/users/:userId/deactivate', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isActive = false;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User deactivated successfully'
        });
    } catch (error) {
        console.error('Deactivate user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deactivating user',
            error: error.message
        });
    }
});

app.put('/api/admin/users/:userId/activate', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isActive = true;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User activated successfully'
        });
    } catch (error) {
        console.error('Activate user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error activating user',
            error: error.message
        });
    }
});

app.put('/api/admin/users/:userId/make-admin', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.role = 'admin';
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User promoted to admin successfully'
        });
    } catch (error) {
        console.error('Make admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Error promoting user',
            error: error.message
        });
    }
});

// ERROR HANDLING
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// START SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║  🚀 BLOCKCHAIN VOTING APP SERVER     ║
╚═══════════════════════════════════════╝
    
✅ Server running on port ${PORT}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ Database: Connected
    
API Endpoints Available:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Health Check:    GET  /api/health
    
🔐 Authentication:
   Register:        POST /api/auth/register
   Login:           POST /api/auth/login
   Get Profile:     GET  /api/auth/me
   Update Profile:  PUT  /api/auth/profile
   Change Password: PUT  /api/auth/change-password
   Connect Wallet:  PUT  /api/auth/connect-wallet
    
🗳️  Voting:
   Record Vote:     POST /api/votes/record
   Vote History:    GET  /api/votes/history
    
👑 Admin:
   Get All Users:   GET  /api/admin/users
   Get Stats:       GET  /api/admin/stats
   Deactivate User: PUT  /api/admin/users/:id/deactivate
   Activate User:   PUT  /api/admin/users/:id/activate
   Make Admin:      PUT  /api/admin/users/:id/make-admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;