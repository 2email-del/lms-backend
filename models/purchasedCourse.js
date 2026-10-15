import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "courses",
      required: true,
    },

    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },

    access: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const purchasedCourseModel = mongoose.model('purchased_courses',schema)