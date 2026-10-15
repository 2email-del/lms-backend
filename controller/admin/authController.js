import { userModel } from "../../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
export const Login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "bad request" });
    }

     let user = await userModel.findOne({ email, role: "admin" });
    if (!user) {
      return res.status(400).json({
        message: "invalid credentials, admin not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "invalid credentials",
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.status(200).json({
      message: "admin login success!",
      data: { ...user._doc, password: undefined, token },
    });
  } catch (err) {
    // console.log(err);
    return res.status(500).json({ message: "internal server error" });
  }
};
