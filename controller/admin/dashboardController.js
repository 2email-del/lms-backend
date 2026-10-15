import { userModel } from "../../models/user.js";
import { courseModel } from "../../models/course.js";
import { purchasedCourseModel } from "../../models/purchasedCourse.js";
import bcrypt from "bcrypt";
import { generateOtp } from "../../libs/libs.js";
//  ADMIN DASHBOARD
export const getAdminDashboard = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    // Counts
    const totalStudents = await userModel.countDocuments({ role: "student" });
    const totalTrainers = await userModel.countDocuments({ role: "trainer" });
    const totalCourses = await courseModel.countDocuments({ isDeleted: false });
    const pendingCourses = await courseModel.countDocuments({
      approved: false,
      isDeleted: false,
    });

    // Revenue
    const revenueStats = await purchasedCourseModel.aggregate([
      { $match: { paymentStatus: "paid", access: true } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          platformEarning: { $sum: { $multiply: ["$amount", 0.2] } },
          trainerPayout: { $sum: { $multiply: ["$amount", 0.8] } },
          totalSales: { $sum: 1 },
        },
      },
    ]);

    // Recent signups (last 5)
    const recentStudents = await userModel
      .find({ role: "student" })
      .sort({ _id: -1 })
      .limit(5)
      .select("fullname email image");

    const recentTrainers = await userModel
      .find({ role: "trainer" })
      .sort({ _id: -1 })
      .limit(5)
      .select("fullname email image");

    // Recent sales
    const recentSales = await purchasedCourseModel
      .find({ paymentStatus: "paid", access: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("studentId", "fullname email")
      .populate("courseId", "name amount")
      .populate("trainerId", "fullname email");

    return res.status(200).json({
      message: "admin dashboard fetched",
      data: {
        stats: {
          totalStudents,
          totalTrainers,
          totalCourses,
          pendingCourses,
          totalRevenue: revenueStats[0]?.totalRevenue || 0,
          platformEarning: revenueStats[0]?.platformEarning || 0,
          trainerPayout: revenueStats[0]?.trainerPayout || 0,
          totalSales: revenueStats[0]?.totalSales || 0,
        },
        recentStudents,
        recentTrainers,
        recentSales: recentSales.map((s) => ({
          studentName: s.studentId?.fullname,
          studentEmail: s.studentId?.email,
          trainerName: s.trainerId?.fullname,
          courseName: s.courseId?.name,
          amount: s.amount,
          date: s.createdAt,
        })),
      },
    });
  } catch (err) {
    // console.log(err);
    return res.status(500).json({ message: err.message });
  }
};

//  ALL USERS 
export const getAllUsers = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    const { role, search } = req.query;
    let filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { fullname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const users = await userModel
      .find(filter)
      .select("-password -otp")
      .sort({ _id: -1 });

    return res.status(200).json({
      message: "users fetched",
      total: users.length,
      data: users,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET SINGLE USER
export const getUserById = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    const { id } = req.params;
    const user = await userModel.findById(id).select("-password -otp");

    if (!user) return res.status(404).json({ message: "user not found" });

    return res.status(200).json({ message: "user fetched", data: user });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE USER
export const deleteUser = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    const { id } = req.params;
    const user = await userModel.findById(id);

    if (!user) return res.status(404).json({ message: "user not found" });
    if (user.role === "admin")
      return res.status(400).json({ message: "cannot delete admin" });

    await userModel.findByIdAndDelete(id);

    return res.status(200).json({ message: "user deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET ALL COURSES 
export const getAllCoursesAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    const { status } = req.query; // "pending" | "approved" | "rejected"
    let filter = { isDeleted: false };
    if (status === "pending") filter.approved = false;
    if (status === "approved") filter.approved = true;

    const courses = await courseModel
      .find(filter)
      .populate("trainerId", "fullname email image stripeOnBoardedStatus")
      .sort({ _id: -1 });

    // Add sales count for each course
    const coursesWithSales = await Promise.all(
      courses.map(async (course) => {
        const sales = await purchasedCourseModel.countDocuments({
          courseId: course._id,
          paymentStatus: "paid",
        });
        return { ...course._doc, totalSales: sales };
      })
    );

    return res.status(200).json({
      message: "courses fetched",
      total: coursesWithSales.length,
      data: coursesWithSales,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//APPROVE COURSE
export const approveCourse = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    const { id } = req.params;
    const course = await courseModel.findByIdAndUpdate(
      id,
      { approved: true },
      { new: true }
    );

    if (!course) return res.status(404).json({ message: "course not found" });

    return res.status(200).json({
      message: "course approved successfully",
      data: course,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//REJECT COURSE
export const rejectCourse = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    const { id } = req.params;
    const course = await courseModel.findByIdAndUpdate(
      id,
      { approved: false, isDeleted: true },
      { new: true }
    );

    if (!course) return res.status(404).json({ message: "course not found" });

    return res.status(200).json({
      message: "course rejected",
      data: course,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE COURSE
export const deleteCourseAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    const { id } = req.params;
    const course = await courseModel.findByIdAndDelete(id);

    if (!course) return res.status(404).json({ message: "course not found" });

    return res.status(200).json({ message: "course deleted permanently" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET ALL TRANSACTIONS
export const getAllTransactions = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    const { status } = req.query;
    let filter = {};
    if (status) filter.paymentStatus = status;

    const transactions = await purchasedCourseModel
      .find(filter)
      .populate("studentId", "fullname email")
      .populate("trainerId", "fullname email")
      .populate("courseId", "name amount")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "transactions fetched",
      total: transactions.length,
      data: transactions,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//  TRAINER 

export const createTrainer = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    const { fullname, username, email, password } = req.body;

    if (!fullname || !username || !email || !password) {
      return res.status(400).json({ message: "all fields required" });
    }

    const existing = await userModel.findOne({
      $or: [{ email }, { username }],
    });
    if (existing) {
      return res.status(400).json({ message: "email or username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const trainer = new userModel({
      fullname,
      username,
      email,
      password: hashedPassword,
      role: "trainer",
      image: "default-trainer.jpg",
      otp: generateOtp(),
      verified: true,

      approvalStatus: "approved",
    });

    await trainer.save();

    return res.status(201).json({
      message: "trainer created successfully",
      data: {
        _id: trainer._id,
        fullname,
        username,
        email,
        role: "trainer",
        approvalStatus: trainer.approvalStatus,
      },
    });
  } catch (err) {
    // console.log(err);
    return res.status(500).json({ message: err.message });
  }
};

//  GET PLATFORM REVENUE
export const getRevenueAnalytics = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    const monthlyRevenue = await purchasedCourseModel.aggregate([
      { $match: { paymentStatus: "paid", access: true } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$amount" },
          platformEarning: { $sum: { $multiply: ["$amount", 0.2] } },
          sales: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]);

    return res.status(200).json({
      message: "revenue analytics fetched",
      data: monthlyRevenue,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getPendingTrainers = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    const trainers = await userModel
      .find({ role: "trainer", approvalStatus: "pending" })
      .select("-password -otp")
      .sort({ _id: -1 });

    return res.status(200).json({
      message: "pending trainers fetched",
      total: trainers.length,
      data: trainers,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const approveTrainer = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    const { id } = req.params;

    const trainer = await userModel
      .findByIdAndUpdate(id, { approvalStatus: "approved" }, { new: true })
      .select("-password -otp");

    if (!trainer) {
      return res.status(404).json({ message: "trainer not found" });
    }

    return res.status(200).json({
      message: "trainer approved successfully",
      data: trainer,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const rejectTrainer = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "admin only" });
    }

    const { id } = req.params;

    const trainer = await userModel
      .findByIdAndUpdate(id, { approvalStatus: "rejected" }, { new: true })
      .select("-password -otp");

    if (!trainer) {
      return res.status(404).json({ message: "trainer not found" });
    }

    return res.status(200).json({
      message: "trainer rejected",
      data: trainer,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};