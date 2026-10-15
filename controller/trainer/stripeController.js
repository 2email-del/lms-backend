import Stripe from 'stripe';
import { userModel } from "../../models/user.js"
import jwt from 'jsonwebtoken';
let stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createConnectAccount = async(req,res,next)=>{
try{
const email = req.body.email;
const account = await stripe.accounts.create({
    type:"express",email
})
req.body.stripeAccountId = account.id //save in req.body
// console.log("connect account created successfully!")
next();
}catch(err){
    return res.status(500).json({
    message:"Stripe account creation failed",
    error:err.message
})
}
}

export const trainerOnBoarding = async(req,res) => {
try{
let token = req.headers.authorization?.split(" ")[1];
let {userId:trainerId} = jwt.verify(token,process.env.JWT_SECRET);
if(!trainerId){
    return
}
let {stripeAccountId} = 
await userModel.findById(trainerId)
.select('stripeAccountId');
let {details_submitted} = await stripe.accounts.retrieve(stripeAccountId)
if(details_submitted){
    return res.json({
        message:"trainer is already onboarded"
    })
}

const {url:onBoardingUrl} = await stripe.accountLinks.create({
    account:stripeAccountId,
    refresh_url: `${process.env.FRONTEND_URL}/trainer/dashboard?onboarding=refresh`,
    return_url: `${process.env.BACKEND_URL}/api/trainer/stripe/onboarding-success/${trainerId}`,
    type: 'account_onboarding',
})

return res.json({
message:"trainer link ready for onboarding !!!",
onBoarding_url:onBoardingUrl,
})

}catch(err){
return res.status(500).json({
message:"Failed to generate Stripe onboarding link",
error:err.message
})
}
}

export const updateStripeStatus = async (req,res) => {
const frontendDashboard = `${process.env.FRONTEND_URL}/trainer/dashboard`;
try{
    let {id:trainerId} = req.params;
    if(!trainerId){
        return res.redirect(`${frontendDashboard}?onboarding=error`);
    }
    let trainer = await userModel.findOne({_id:trainerId});
    let {stripeAccountId} = trainer
    let {details_submitted} = await stripe.accounts.retrieve(stripeAccountId);
    if(!details_submitted){
        return res.redirect(`${frontendDashboard}?onboarding=incomplete`);
    }
    else if(trainer.stripeOnBoardedStatus){
        return res.redirect(`${frontendDashboard}?onboarding=already-done`);
    }
    trainer.stripeOnBoardedStatus = true;
    await trainer.save();
    return res.redirect(`${frontendDashboard}?onboarding=success`);

}
catch(err){
    return res.redirect(`${frontendDashboard}?onboarding=error`);
}
}



