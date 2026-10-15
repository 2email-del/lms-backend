import express from "express";
import { adminAuthRouter } from "./adminAuthRouter.js";
import { AuthMiddleware } from "../../middleware/authMiddleware.js";
import {
  getAdminDashboard,
  getAllUsers,
  getUserById,
  deleteUser,
  getAllCoursesAdmin,
  approveCourse,
  rejectCourse,
  deleteCourseAdmin,
  getAllTransactions,
  createTrainer,
  getRevenueAnalytics,
  getPendingTrainers,  
  approveTrainer,      
  rejectTrainer,       
} from "../../controller/admin/dashboardController.js";
export const adminRouter = express.Router();

// Auth
adminRouter.use("/auth", adminAuthRouter);

// Dashboard
adminRouter.get("/dashboard", AuthMiddleware, getAdminDashboard);
adminRouter.get("/revenue", AuthMiddleware, getRevenueAnalytics);

// Users
adminRouter.get("/users", AuthMiddleware, getAllUsers);
adminRouter.get("/users/:id", AuthMiddleware, getUserById);
adminRouter.delete("/users/:id", AuthMiddleware, deleteUser);

// Trainers
adminRouter.post("/trainers/create", AuthMiddleware, createTrainer);

// pending trainers 
adminRouter.get("/trainers/pending", AuthMiddleware, getPendingTrainers);

// trainer approve
adminRouter.put("/trainers/approve/:id", AuthMiddleware, approveTrainer);

// regected trainer
adminRouter.put("/trainers/reject/:id", AuthMiddleware, rejectTrainer);
// Courses
adminRouter.get("/courses", AuthMiddleware, getAllCoursesAdmin);
adminRouter.put("/courses/approve/:id", AuthMiddleware, approveCourse);
adminRouter.put("/courses/reject/:id", AuthMiddleware, rejectCourse);
adminRouter.delete("/courses/:id", AuthMiddleware, deleteCourseAdmin);

// Transactions
adminRouter.get("/transactions", AuthMiddleware, getAllTransactions);