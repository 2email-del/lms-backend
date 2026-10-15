import mongoose from "mongoose"
import { courseModel } from "../../models/course.js"
import { userModel } from "../../models/user.js"

export const AddCourse = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "trainer") {
      return res.status(401).json({ message: "trainer is not logged in, failed in auth" })
    }

    const { _id: trainerId } = req.user
    const trainer = await userModel.findById(trainerId).select("stripeOnBoardedStatus")
    if (!trainer?.stripeOnBoardedStatus) {
      return res.status(403).json({ message: "trainer is not onboarded, perform onboarding to add course" })
    }

    const { name, description, amount, videoUrl } = req.body
    if (!name || !description || amount === undefined || amount === null || amount === "") {
      return res.status(400).json({ message: "name, amount and description is required" })
    }

    await courseModel.create({
      ...req.body,
      trainerId,
    })

    return res.status(201).json({ message: "course added successfully!" })
  } catch (err) {
    return res.status(500).json({ message: "error occurred in adding course", error: err.message })
  }
}

export const DeleteCourse = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "trainer") {
      return res.status(401).json({ message: "trainer is not logged in, failed in auth" })
    }

    const { courseId } = req.body
    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ message: "valid course id is required" })
    }

    // Permanently delete the trainer-owned course from MongoDB.
    const deletedCourse = await courseModel.findOneAndDelete({
      _id: courseId,
      trainerId: req.user._id,
    })

    if (!deletedCourse) {
      return res.status(404).json({ message: "course not found or you are not authorized to delete it" })
    }

    return res.status(200).json({
      message: "course deleted permanently!",
      data: { courseId, deleted: true },
    })
  } catch (err) {
    return res.status(500).json({ message: "failed to delete course", error: err.message })
  }
}

export const EditCourse = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "trainer") {
      return res.status(401).json({ message: "trainer is not logged in, failed in auth" })
    }

    const { id: courseId } = req.params
    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ message: "course id not provided or invalid course id" })
    }

    const { name, description, amount, videoUrl } = req.body
    const hasChanges = [name, description, amount, videoUrl].some((value) => value !== undefined)
    if (!hasChanges) {
      return res.status(400).json({ message: "nothing to update" })
    }

    // IMPORTANT: trainer ownership is checked in the DB query itself.
    const course = await courseModel.findOne({
      _id: courseId,
      trainerId: req.user._id,
      isDeleted: false,
    })

    if (!course) {
      return res.status(404).json({ message: "course not found or you are not authorized to edit it" })
    }

    if (name !== undefined) course.name = name
    if (description !== undefined) course.description = description
    if (amount !== undefined) course.amount = amount
    if (videoUrl !== undefined) course.videoUrl = videoUrl

    await course.save()

    return res.status(200).json({
      message: "course updated successfully!",
      data: course,
    })
  } catch (err) {
    return res.status(500).json({ message: "error occurred in editing course", error: err.message })
  }
}

export const getMyOfferedCourses = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "trainer") {
      return res.status(401).json({ message: "trainer is not logged in, failed in auth" })
    }

    const courses = await courseModel.find({ trainerId: req.user._id, isDeleted: false })
    return res.status(200).json({ message: "my courses fetched", data: courses })
  } catch (err) {
    return res.status(500).json({ message: "error occurred in getting courses", error: err.message })
  }
}

export const getCourseById = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "trainer") {
      return res.status(401).json({ message: "trainer is not logged in, failed in auth" })
    }

    const { id: courseId } = req.params
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ message: "invalid course id" })
    }

    const course = await courseModel.findOne({
      _id: courseId,
      trainerId: req.user._id,
      isDeleted: false,
    })

    if (!course) {
      return res.status(404).json({ message: "course not found" })
    }

    return res.status(200).json({ message: "course returned", data: course })
  } catch (err) {
    return res.status(500).json({ message: "error in getting the course", error: err.message })
  }
}
