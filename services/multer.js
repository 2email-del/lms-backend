import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

let storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "lms-profile-images",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
    },
});

export const multerFileHandler = multer({ storage });