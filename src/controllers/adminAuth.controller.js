import Admin from '../models/Admin.model.js';

const adminAuthController = {
    async login(req, res) {
        try {
            const { username, password } = req.body;

            // Find admin
            const admin = await Admin.findOne({ username }).select("+password");
            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid credentials"
                });
            }

            // Check if admin is active
            if (admin.status !== 'active') {
                return res.status(401).json({
                    success: false,
                    message: "Account is inactive"
                });
            }

            // Verify password
            const isPasswordValid = await admin.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid credentials"
                });
            }

            // Generate tokens
            const accessToken = admin.generateAccessToken();
            const refreshToken = admin.generateRefreshToken();

            // Update refresh token and last login
            admin.refreshToken = refreshToken;
            admin.lastLogin = new Date();
            await admin.save();

            // Set cookies
            res.cookie("adminToken", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });

            res.json({
                success: true,
                message: "Login successful",
                data: {
                    _id: admin._id,
                    username: admin.username,
                    email: admin.email,
                    role: admin.role
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async logout(req, res) {
        try {
            await Admin.findByIdAndUpdate(req.admin._id, {
                refreshToken: null
            });

            res.clearCookie("adminToken");
            
            res.json({
                success: true,
                message: "Logged out successfully"
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getProfile(req, res) {
        try {
            const admin = await Admin.findById(req.admin._id);
            res.json({
                success: true,
                data: admin
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;

            const admin = await Admin.findById(req.admin._id).select("+password");
            
            const isPasswordValid = await admin.comparePassword(currentPassword);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: "Current password is incorrect"
                });
            }

            admin.password = newPassword;
            await admin.save();

            res.json({
                success: true,
                message: "Password changed successfully"
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

export default adminAuthController; 