import {asyncHandler} from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/User.model.js";
import uploadOnCloudinary  from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken';
import Bet from '../models/Bet.model.js';
import Notification from '../models/Notification.model.js';






const getCurrentUser = asyncHandler(async (req, res) => {
    const user = req.user
    res.status(200).json(
        new ApiResponse(200, user, "Current user details")
    )
})

const updateProfile = asyncHandler(async (req, res) => {
    const {fullname, email, mobile} = req.body
    const user = req.user
    user.fullname = fullname
    user.email = email
    user.mobile = mobile
    await user.save()
    res.status(200).json(
        new ApiResponse(200, user, "Profile updated successfully")
    )
})

const changePassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body
    const user = req.user
    const isPasswordCorrect = await user.comparePassword(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password") 
    }
    user.password = newPassword
    await user.save()
    res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})



const userController = {
    // Get user profile
    async getProfile(req, res) {
        try {
            const user = await User.findById(req.user._id)
                .select('-password -refreshToken');

            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Update user profile
    async updateProfile(req, res) {
        try {
            const allowedUpdates = ['fullname', 'email'];
            const updates = Object.keys(req.body)
                .filter(key => allowedUpdates.includes(key))
                .reduce((obj, key) => {
                    obj[key] = req.body[key];
                    return obj;
                }, {});

            const user = await User.findByIdAndUpdate(
                req.user._id,
                updates,
                { new: true }
            ).select('-password -refreshToken');

            res.json({
                success: true,
                message: "Profile updated successfully",
                data: user
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get user betting statistics
    async getUserStatistics(req, res) {
        try {
            const stats = await Bet.aggregate([
                { $match: { userId: req.user._id } },
                {
                    $group: {
                        _id: null,
                        totalBets: { $sum: 1 },
                        wonBets: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "won"] }, 1, 0]
                            }
                        },
                        totalAmount: { $sum: "$amount" },
                        totalWinnings: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$status", "won"] },
                                    "$winningAmount",
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            res.json({
                success: true,
                data: stats[0] || {
                    totalBets: 0,
                    wonBets: 0,
                    totalAmount: 0,
                    totalWinnings: 0
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get user notifications
    async getNotifications(req, res) {
        try {
            const notifications = await Notification.find({ userId: req.user._id })
                .sort({ createdAt: -1 })
                .limit(50);

            res.json({
                success: true,
                data: notifications
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Mark notifications as read
    async markNotificationsAsRead(req, res) {
        try {
            await Notification.updateMany(
                { userId: req.user._id, isRead: false },
                { isRead: true }
            );

            res.json({
                success: true,
                message: "Notifications marked as read"
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

export {userController, getCurrentUser, updateProfile, changePassword};