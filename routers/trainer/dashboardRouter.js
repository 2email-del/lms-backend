import express from "express";
import { AuthMiddleware } from "../../middleware/authMiddleware.js";
import {
  getTrainerDashboard,
  getTrainerSales,
  getTrainerStudents,
  getCourseSales
} from "../../controller/trainer/dashboardController.js";

export const dashboardRouter = express.Router();

dashboardRouter.get("/", AuthMiddleware, getTrainerDashboard);
dashboardRouter.get("/sales", AuthMiddleware, getTrainerSales);
dashboardRouter.get("/students", AuthMiddleware, getTrainerStudents);
dashboardRouter.get("/course/:courseId", AuthMiddleware, getCourseSales);