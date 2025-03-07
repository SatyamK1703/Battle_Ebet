import express from 'express';
import {  
    
    updateProfile,getCurrentUser,changePassword,userController
} from '../controllers/user.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { validate, userValidationRules } from '../middlewares/validate.middleware.js';
import upload  from "../middlewares/multer.middleware.js";
import { registerUser, loginUser, logoutUser , refreshAccessToken} from '../controllers/auth.controller.js';


const router = express.Router();

// Auth routes
router.post("/register", userValidationRules.register, validate, registerUser);
router.post("/login", userValidationRules.login, validate, loginUser);
router.post("/logout", auth, logoutUser);
router.post("/refresh-token", refreshAccessToken);

// Profile routes
router.put("/profile", auth, validate, updateProfile);

router.get("/me", getCurrentUser)
router.post("/change-password", changePassword)
//router.post("/forgot-password", forgotPassword)

router.post(
    "/register", 
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }
    ]),
    registerUser    
)

// Protect all routes with auth middleware
router.use(auth);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Statistics route
router.get('/statistics', userController.getUserStatistics);

// Notification routes
router.get('/notifications', userController.getNotifications);
router.put('/notifications/read', userController.markNotificationsAsRead);

export default router