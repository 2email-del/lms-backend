import { courseModel } from "../../models/course.js"
import { purchasedCourseModel } from "../../models/purchasedCourse.js"

export const getAllCourses = async (req,res) => {
try{
 if(!req.user || req.user.role !== 'student'){
    return res.json({
        message:"failed in authentication"
    })
}

// let courses = await courseModel.find({approved:true,isDeleted:false}).populate("trainerid").select("")

let courses = await courseModel.aggregate(
  [
  {
    '$match': {
      'approved': true, 
      'isDeleted': false
    }
  }, {
    '$lookup': {
      'from': 'users', 
      'localField': 'trainerId', 
      'foreignField': '_id', 
      'as': 'trainer'
    }
  }, {
    '$unwind': {
      'path': '$trainer'
    }
  }, {
    '$project': {
      'name': 1, 
      'description': 1, 
      'amount': 1,
      'videoUrl': 1,
      'trainer': {
        'fullname': 1, 
        'email': 1, 
        'role': 1, 
        'stripeOnBoardedStatus': 1
      }
    }
  }
]
)

// 1000$: approved true 
if(!courses){
    return res.json({
        message:"no courses to return"
    })
}
 return res.json({
        message:"all approved courses returned!",
        data:courses
    })

}catch(err){
 return res.json({
        message:"error in returning courses!"
    })
}
}

export const getCourseById = async (req,res) => {
try{
if(!req.user || req.user.role !== 'student'){
    return res.json({
        message:"student is not logged in, failed in auth"
    })
}
let {id:courseId} = req.params
let course = await courseModel.findOne({_id:courseId,isDeleted:false,approved:true})
.populate('trainerId','fullname username email')
.lean(); //lean() gives a plain object so name/description/amount actually spread out correctly
if(!course){
return res.json({
    message:"course not found"
})
}
let {trainerId,...courseData} = course;
let courseResponse = {
    ...courseData,
    trainer:trainerId
}
//for checking whether student has purchased course or not 
let purchasedCourse = await purchasedCourseModel.findOne({
    courseId,studentId:req.user._id,access:true
    ,paymentStatus:"paid"
})
if(purchasedCourse){
return res.json({
    message:"course returned",
    data:{
        ...courseResponse,
        purchased:true
    }
})
}
res.json({
    message:"course returned",
    data:{
        ...courseResponse,
        purchased:false
    }
})
}catch(err){
    return res.json({
        message:"error in getting the course",
        error:err.message
    })
}
}

export const getMyCourses = async (req,res) => {
try{
if(!req.user || req.user.role !== 'student'){
    return res.json({
        message:"student is not logged in, failed in auth"
    })
}
let myCourses = await purchasedCourseModel.find({
    studentId:req.user._id.toString(),
    paymentStatus:"paid",
    access:true,
})
if(!myCourses || myCourses.length === 0){
   return res.json({
        message:"This student has not purchased any course.."
    })
}

let courseIds = myCourses.map((course)=>course.courseId)
let courses = await courseModel.find({
    _id:{$in:courseIds}
})

return res.json({
    message:"courses returned...!!!",
    data:courses
})
}catch(err){
   return res.json({
        message:"failed to get courses",
        error:err.message
    })
}
}



export const getPurchasedCourse = async (req, res) => {
try {
  if (!req.user || req.user.role !== "student") {
    return res.status(401).json({
      message: "student is not logged in, failed in auth"
    });
  }

  const { id: courseId } = req.params;

  const purchased = await purchasedCourseModel.findOne({
    courseId,
    studentId: req.user._id,
    paymentStatus: "paid",
    access: true
  });

  if (!purchased) {
    return res.status(403).json({
      message: "you have not purchased this course"
    });
  }

  const course = await courseModel
    .findOne({ _id: courseId, isDeleted: false, approved: true })
    .populate("trainerId", "fullname username email")
    .lean();

  if (!course) {
    return res.status(404).json({
      message: "course not found"
    });
  }

  return res.status(200).json({
    message: "purchased course returned",
    data: {
      ...course,
      trainer: course.trainerId,
      purchased: true
    }
  });
} catch (err) {
  return res.status(500).json({
    message: "error in getting purchased course",
    error: err.message
  });
}
};
