import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async (uri?: string) => {
  // const uri = "mongodb://127.0.0.1:27017/social";
  try {
    const mongoUri = uri || process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI not defined");
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); //stop server if DB fails
  }
};
