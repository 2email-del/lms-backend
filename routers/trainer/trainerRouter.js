import express from 'express'
import { trainerAuthRouter } from './trainerAuthRouter.js'
import { trainerCourseRouter } from './trainerCourseRouter.js'
import { stripeRouter } from './stripeRouter.js'
import { dashboardRouter } from './dashboardRouter.js' 

export const trainerRouter = express.Router()

trainerRouter.use('/auth', trainerAuthRouter)
trainerRouter.use('/course', trainerCourseRouter)
trainerRouter.use('/stripe', stripeRouter)
trainerRouter.use('/dashboard', dashboardRouter)