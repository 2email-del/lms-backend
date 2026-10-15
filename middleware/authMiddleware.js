import jwt from 'jsonwebtoken';
import { userModel } from '../models/user.js';

export const AuthMiddleware = async (req,res,next) => {
try{
let token = req.headers.authorization?.split(" ")[1];

if(!token){
    return res.status(401).json({
        message:"token not found, please login again!"
    })
}

let {userId} = jwt.verify(token,process.env.JWT_SECRET)
if(!userId){
    return res.status(401).json({
        message:"token or id not found, please login again!"
    })
}

let user = await userModel.findById(userId).select('-password');
if(!user){
    return res.status(401).json({
        message:"invalid token, user not exist!"
    })
}
req.user = user;
next();

}catch(err){
    // jwt.verify throws on expired/invalid/malformed tokens - always treat as 401 so the
    // frontend can reliably detect the failure and redirect to login instead of getting a
    // silent 200 with no usable data.
    res.status(401).json({
        message:"authentication failed, please login again!",
        error:err.message
    })
}
}