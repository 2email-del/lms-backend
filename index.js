import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { connectMongo } from './config/mongo-config.js'
import { mainRouter } from './routers/mainRouter.js'

const app = express()
let port = process.env.port || 5000

connectMongo()

// console.log("DEBUG BACKEND_URL =", JSON.stringify(process.env.BACKEND_URL))
// console.log("DEBUG FRONTEND_URL =", JSON.stringify(process.env.FRONTEND_URL))
// console.log("DEBUG STRIPE_KEY exists =", Boolean(process.env.STRIPE_SECRET_KEY))
app.use(cors());
app.use(cors({
  origin: ['https://lms-system-project.netlify.app','https://lms-admin-side.netlify.app'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,  
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use("/api",mainRouter);
app.use(express.static('uploads/images'));

app.listen(port,()=>{
    console.log('backend is running in port '+port)
})

