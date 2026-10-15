import { purchasedCourseModel } from "../../models/purchasedCourse.js";
import { courseModel } from "../../models/course.js";
import { userModel } from "../../models/user.js";

//  TRAINER DASHBOARD
export const getTrainerDashboard = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "trainer") {
      return res.status(401).json({
        message: "trainer is not logged in, failed in auth"
      });
    }

    const trainerId = req.user._id;

    const trainerInfo = await userModel
      .findById(trainerId)
      .select("stripeOnBoardedStatus approvalStatus");

    // Total stats
    const stats = await purchasedCourseModel.aggregate([
      {
        $match: {
          trainerId: trainerId,
          paymentStatus: "paid",
          access: true
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: "$amount" },
          trainerEarning: { $sum: { $multiply: ["$amount", 0.8] } }
        }
      }
    ]);

    // Total courses
    const totalCourses = await courseModel.countDocuments({
      trainerId: trainerId,
      isDeleted: false
    });

    const recentSales = await purchasedCourseModel
      .find({
        trainerId: trainerId,
        paymentStatus: "paid",
        access: true
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("courseId", "name amount")
      .populate("studentId", "fullname email");

    const formattedRecentSales = recentSales.map((sale) => ({
      studentName: sale.studentId?.fullname || "Unknown",
      studentEmail: sale.studentId?.email || "Unknown",
      courseName: sale.courseId?.name || "Unknown",
      amount: sale.amount,
      trainerEarning: sale.amount * 0.8,
      date: sale.createdAt
    }));

    return res.status(200).json({
      message: "dashboard data fetched successfully",
      data: {
        totalCourses,
        totalSales: stats[0]?.totalSales || 0,
        totalRevenue: stats[0]?.totalRevenue || 0,
        trainerEarning: stats[0]?.trainerEarning || 0,
        platformFee: (stats[0]?.totalRevenue || 0) * 0.2,
        recentSales: formattedRecentSales,
        stripeOnBoardedStatus: trainerInfo?.stripeOnBoardedStatus || false,
        approvalStatus: trainerInfo?.approvalStatus || "approved"
      }
    });
  } catch (err) {
    // console.log(err);
    return res.status(500).json({
      message: "failed to fetch dashboard",
      error: err.message
    });
  }
};

// TRAINER SALES 
export const getTrainerSales = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "trainer") {
      return res.status(401).json({
        message: "trainer is not logged in, failed in auth"
      });
    }

    const trainerId = req.user._id;

    const sales = await purchasedCourseModel.aggregate([
      {
        $match: {
          trainerId: trainerId,
          paymentStatus: "paid",
          access: true
        }
      },
      {
        $group: {
          _id: "$courseId",
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: "$amount" }
        }
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course"
        }
      },
      { $unwind: "$course" },
      {
        $project: {
          courseId: "$_id",
          courseName: "$course.name",
          courseAmount: "$course.amount",
          totalSales: 1,
          totalRevenue: 1,
          trainerEarning: { $multiply: ["$totalRevenue", 0.8] },
          platformFee: { $multiply: ["$totalRevenue", 0.2] }
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    return res.status(200).json({
      message: "sales data fetched successfully",
      data: sales
    });
  } catch (err) {
    // console.log(err);
    return res.status(500).json({
      message: "failed to fetch sales",
      error: err.message
    });
  }
};

//  TRAINER STUDENTS 
export const getTrainerStudents = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "trainer") {
      return res.status(401).json({
        message: "trainer is not logged in, failed in auth"
      });
    }

    const trainerId = req.user._id;

    const students = await purchasedCourseModel
      .find({
        trainerId: trainerId,
        paymentStatus: "paid",
        access: true
      })
      .populate("studentId", "fullname email image")
      .populate("courseId", "name")
      .sort({ createdAt: -1 });

    const formatted = students.map((s) => ({
      studentName: s.studentId?.fullname || "Unknown",
      studentEmail: s.studentId?.email || "Unknown",
      studentImage: s.studentId?.image || null,
      courseName: s.courseId?.name || "Unknown",
      amount: s.amount,
      purchasedAt: s.createdAt
    }));

    return res.status(200).json({
      message: "students fetched successfully",
      total: formatted.length,
      data: formatted
    });
  } catch (err) {
    // console.log(err);
    return res.status(500).json({
      message: "failed to fetch students",
      error: err.message
    });
  }
};


// COURSE SALES 
export const getCourseSales = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "trainer") {
      return res.status(401).json({
        message: "trainer is not logged in, failed in auth"
      });
    }

    const { courseId } = req.params;
    const trainerId = req.user._id;

    // Verify course belongs to this trainer
    const course = await courseModel.findOne({
      _id: courseId,
      trainerId: trainerId,
      isDeleted: false
    });

    if (!course) {
      return res.status(404).json({
        message: "course not found or not yours"
      });
    }

    const sales = await purchasedCourseModel
      .find({
        courseId: courseId,
        trainerId: trainerId,
        paymentStatus: "paid",
        access: true
      })
      .populate("studentId", "fullname email image")
      .sort({ createdAt: -1 });

    const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);

    return res.status(200).json({
      message: "course sales fetched successfully",
      course: {
        id: course._id,
        name: course.name,
        amount: course.amount
      },
      summary: {
        totalSales: sales.length,
        totalRevenue: totalRevenue,
        trainerEarning: totalRevenue * 0.8,
        platformFee: totalRevenue * 0.2
      },
      students: sales.map((s) => ({
        studentName: s.studentId?.fullname || "Unknown",
        studentEmail: s.studentId?.email || "Unknown",
        studentImage: s.studentId?.image || null,
        amount: s.amount,
        purchasedAt: s.createdAt
      }))
    });
  } catch (err) {
    // console.log(err);
    return res.status(500).json({
      message: "failed to fetch course sales",
      error: err.message
    });
  }
};