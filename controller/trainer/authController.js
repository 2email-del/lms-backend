import { signupValidator } from "../../validator/signupValidator.js"
import { userModel } from "../../models/user.js";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {sendOtpEmail,generateOtp,generateToken,sendResetPasswordEmail} from '../../libs/libs.js'

export const Signup = async (req,res) => {
   try{
    req.body.role = 'trainer';
    if(!req.file){
        return res.status(400).json({
            message:"select your profile picture"
        })
    }
    req.body.image = req.file.path;
    await signupValidator.validate(req.body)//sends to catch if error found
     try {
            await signupValidator.validate(req.body);
        } catch (err) {
            return res.status(400).json({
                message: err.message
            });
        }
    let otp = generateOtp()
    let hashedPassword = await bcrypt.hash(req.body.password,12);
    req.body.password = hashedPassword
    req.body.otp = otp;
    req.body.approvalStatus = 'pending'; //trainer must wait for admin approval before logging in
    let user = userModel(req.body)
     const existingUser = await userModel.findOne({
            email: req.body.email
        });

        if (existingUser) {
            return res.status(400).json({
                message: "Email is already registered"
            });
        }
    await user.save();
    let token = generateToken('2h',user._id)
    // await sendOtpEmail('rahim.siddiqui.dev@gmail.com',req.body.email,otp)
    return res.status(201).json({
        message:"user created successfully",
        token
    })
   }catch(err){
    // console.log(err)
return res.status(500).json({
    message:"internal server error",
    err:err.message
})
   }
}

export const VerifyOtp = async(req,res) =>{
try {
    let token = req.headers.authorization?.split(" ")[1];
    if(!token){
        return res.status(400).json({
            message:"token not found"
        })
    }
    let {otp} = req.body
    if(!otp){
           return res.status(400).json({
            message:"otp not found!"
        })
    }
    let {userId} = jwt.verify(token,process.env.JWT_SECRET)
    let user = await userModel.findOne({_id:userId});
    let {otp:savedOtp} = user
    if(otp != savedOtp){
        return res.status(400).json({
            message:"otp not matched, invalid otp"
        })
    }
    // console.log(otp,savedOtp)
    user.verified = true;
    user.save();

    return res.status(200).json({
        message:"success! user verified!"
    })
}catch(err){
    // console.log(err)
}
}

export const Login = async(req,res) => {
    try{
        let {email,password} = req.body;

        if(!email || !password){
            return res.status(400).json({
            message:"bad request"
        })
        }

        // find email
        let user = await userModel.findOne({email})
        if(!user){
            return res.status(400).json({
            message:"invalid credentials, user not found"
        })
        }

        if(!user.verified){
            let otp = generateOtp()
            user.otp = otp;
            await user.save();
            // await sendOtpEmail('rahim.siddiqui.dev@gmail.com',email,otp);
            let token = generateToken('2h',user._id)
            return res.status(200).json({
             message:"email sent to user email to verify account!"
            })
        }

        if(user.role === "trainer" && user.approvalStatus !== "approved"){
            return res.status(403).json({
                message: `Your account is currently ${user.approvalStatus}. You will be able to log in after the admin approves it.`
            })
        }

        // password compare 
        let compare = await bcrypt.compare(password,user.password)
        if(!compare){
          return res.status(400).json({
            message:"invalid credentials!"
        })
        }

        let token = generateToken('30d',user._id)

        return res.status(200).json({
            message:"login success!",
            data:{...user._doc,token}
        })

    }
    catch(err){
        // console.log(err)
        return res.status(500).json({
            message:"internal server error"
        })
    }

}

export const forgotPassword = async(req,res) => {
    try{
 let {email} = req.body;
 if(!email){
     return res.status(400).json({
        message:"bad request, email not found"
    })
 }
 let user = await userModel.findOne({email})
 if(!user){
    return res.status(404).json({
        message:"user not found"
    })
 }
 let token = generateToken('1h',user._id)
 await sendResetPasswordEmail('rahim.siddiqui.dev@gmail.com',email,token);
   return res.status(200).json({
    message:"reset password email has been sent!"
})
    }catch(err){
        // console.log(err)
   return res.status(500).json({
    message:"internal server error!"
})
    }
}

export const resetPassword = async(req,res) => {
   try{
   let token = req.headers.authorization?.split(" ")[1];
    if(!token){
        return res.status(400).json({
            message:"token not found"
        })
    }
    let {userId} = jwt.verify(token,process.env.JWT_SECRET)
    let {password} = req.body
    if(!password){
           return res.status(400).json({
            message:"new password not found!"
        })
    }
    let hashPassword = await bcrypt.hash(password,12);
    password = hashPassword
    await userModel.findByIdAndUpdate(userId,{password});
    return res.status(200).json({
        message:"password reset success!"
    })
   }catch(err){
        // console.log(err)
   return res.status(500).json({
    message:"internal server error!"
})
    }
}