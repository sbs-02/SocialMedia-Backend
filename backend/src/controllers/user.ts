import { Request, Response } from "express";
import User from "../models/User";
import mongoose from "mongoose";

//Get all users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
};

//Get user by Id
export const getUserById = async (req: Request, res: Response) => {
  try {
    // Validate ObjectId BEFORE querying DB
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ error: "User not found." });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

//Update user by Id
export const updateUser = async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid ID." });
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updatedUser) return res.status(404).json({ error: "User not found." });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

//Delete users by id
export const deleteUserById = async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid IDs." });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) return res.status(404).json({ error: "User not found." });

    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

//Delete all users (Only in Production)
export const deleteAllUsers = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Forbidden in production." });
    }

    await User.deleteMany({});
    return res.json({ message: "All users deleted (dev only)" });
  } catch (err) {
    console.error("DELETE /api/users/all error:", err);
    return res.status(500).json({ error: "Failed to delete users." });
  }
};
