import mongoose from "mongoose";
import type { IUser } from "../types/user";

const UserSchema = new mongoose.Schema<IUser>(
  {
    fullName: { type: String, required: true, unique: false },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, lowercase: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      default: "user",
    },
    bio: { type: String, default: "" },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User " }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User " }],
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", UserSchema);

export default User;
