import express from 'express';
import { AuthMiddleware } from '../../middleware/authMiddleware.js';
import { multerFileHandler } from '../../services/multer.js';
import { forgotPassword, Login, resetPassword, Signup, VerifyOtp, getStudentProfile } from '../../controller/student/authController.js';
export const studentAuthRouter = express.Router();

studentAuthRouter.post("/signup",multerFileHandler.single('image'),Signup)
studentAuthRouter.post("/verify-otp",VerifyOtp)
studentAuthRouter.post("/login",Login)
studentAuthRouter.post("/forgot-password",forgotPassword)
studentAuthRouter.post("/reset-password",resetPassword)
studentAuthRouter.get("/profile",AuthMiddleware,getStudentProfile)


