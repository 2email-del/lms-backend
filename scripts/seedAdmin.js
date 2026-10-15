import mongoose from "mongoose";
import bcrypt from "bcrypt";
import "dotenv/config";
import { userModel } from "../models/user.js";

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.connectionString);
    console.log("Mongo connected");

    const adminEmail = "admin@lms.com";
    const adminPassword = "admin123";

    // Check agar admin already exist karta hai
    const existing = await userModel.findOne({ role: "admin" });
    if (existing) {
      // console.log("Admin already exists:", existing.email);
      // console.log("Delete karke dobara run karo agar naya banana hai");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const admin = new userModel({
      fullname: "Super Admin",
      username: "admin",
      email: adminEmail,
      password: hashedPassword, //
      image: "admin-default.jpg",
      role: "admin",
      otp: 12345,
      verified: true,
      stripeOnBoardedStatus: false,
    });

    await admin.save();

    console.log("\n🎉 Admin created successfully!\n");
   
    process.exit(0);
  } catch (err) {
    // console.error("Error:", err.message);
    process.exit(1);
  }
};

createAdmin();