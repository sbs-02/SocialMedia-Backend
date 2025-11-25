import { v2 as cloudinary, ConfigOptions } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const nodeEnv = process.env.NODE_ENV || "development";

let cloudinaryEnabled = false;

if (!cloudName || !apiKey || !apiSecret) {
  const msg =
    "Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env";
  if (nodeEnv === "production") {
    throw new Error(`Cloudinary configuration error: ${msg}`);
  } else {
    console.warn("Cloudinary not configured:", msg);
    cloudinaryEnabled = false;
  }
} else {
  const cfg: ConfigOptions = {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  };
  cloudinary.config(cfg);
  cloudinaryEnabled = true;
  console.log("Cloudinary configured.");
}

export { cloudinary, cloudinaryEnabled };
export default cloudinary;
