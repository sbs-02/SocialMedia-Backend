import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: string;
  bio?: string;
  followers?: mongoose.Types.ObjectId[];
  following?: mongoose.Types.ObjectId[];
}
