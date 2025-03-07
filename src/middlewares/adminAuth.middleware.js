import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.model.js';

export const adminAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.adminToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: "Unauthorized access" 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded._id).select("-password -refreshToken");

        if (!admin || admin.status !== 'active') {
            return res.status(401).json({ 
                success: false,
                message: "Invalid or inactive admin account" 
            });
        }

        req.admin = admin;
        next();
    } catch (error) {
        res.status(401).json({ 
            success: false,
            message: "Invalid authentication token" 
        });
    }
};

export const isSuperAdmin = (req, res, next) => {
    if (req.admin.role !== 'super-admin') {
        return res.status(403).json({
            success: false,
            message: "Super admin access required"
        });
    }
    next();
}; 