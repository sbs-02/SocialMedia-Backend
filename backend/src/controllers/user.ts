import { Request, Response } from "express";
import User from "../models/User";
import Post from "../models/Post";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
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

/**
 * GET /api/users/:id
 * Return a safe user object (no password).
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    // Select only safe fields
    const user = await User.findById(id)
      .select(
        "username fullName avatar followers following createdAt updatedAt"
      )
      .lean();

    if (!user) return res.status(404).json({ error: "User not found." });

    // Normalize _id to string if you prefer
    return res.json(user);
  } catch (error) {
    console.error("getUserById error:", error);
    return res.status(500).json({ error: "Server error" });
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

/**
 * GET /api/users/search?search=term
 * Returns an array of minimal user suggestions for the navbar search.
 */
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.search || "").trim();
    if (!q) return res.json([]);

    // Use a starts-with, case-insensitive regex for quick suggestions.
    // You can modify to use text indexes later for better ranking.
    const regex = new RegExp(`^${q}`, "i");

    const users = await User.find({
      $or: [{ username: regex }, { fullName: regex }],
    })
      .select("fullName username") // only return fields needed for suggestions
      .limit(10)
      .lean();

    // normalize to predictable shape
    const suggestions = users.map((u: any) => ({
      _id: String(u._id),
      username: u.username,
      fullName: u.fullName,
    }));

    return res.json(suggestions);
  } catch (err) {
    console.error("User search error", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/users/:id/posts
/**
 * GET /api/users/:id/posts
 * Return an array of posts for the given user id (populated user with safe fields).
 */
export const getUserPosts = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("user", "username fullName avatar") // populate safe fields
      .lean();

    // return array (could be empty)
    return res.json(posts);
  } catch (err) {
    console.error("getUserPosts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/users/:id/follow (toggle follow/unfollow; auth required)
export const toggleFollow = async (req: Request, res: Response) => {
  try {
    const targetId = req.params.id;
    const me = (req as any).user;
    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(targetId))
      return res.status(400).json({ message: "Invalid target id" });
    if (me._id.toString() === targetId)
      return res.status(400).json({ message: "Cannot follow yourself" });

    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const isFollowing = me.following?.some(
      (id: any) => id.toString() === targetId
    );
    if (!isFollowing) {
      // follow
      await User.findByIdAndUpdate(me._id, {
        $addToSet: { following: targetUser._id },
      });
      await User.findByIdAndUpdate(targetId, {
        $addToSet: { followers: me._id },
      });
      return res.json({ followed: true });
    } else {
      // unfollow
      await User.findByIdAndUpdate(me._id, {
        $pull: { following: targetUser._id },
      });
      await User.findByIdAndUpdate(targetId, { $pull: { followers: me._id } });
      return res.json({ followed: false });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * PUT /api/users/:id/avatar
 * Update avatar for the user identified by :id.
 * Requires auth middleware that attaches (req as any).user.
 * Expects uploadImageToCloudinary middleware to set req.body.image and (req as any).imagePublicId
 */
export const updateAvatar = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser) return res.status(401).json({ message: "Unauthorized" });

    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // Only allow updating your own avatar
    if (authUser._id.toString() !== targetId.toString()) {
      return res
        .status(403)
        .json({ message: "Forbidden: cannot update avatar for other users" });
    }

    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // -------------------
    // Two supported flows:
    // 1) A prior middleware (e.g. uploadToCloudinary) already uploaded and set:
    //      req.body.image (string url) and (req as any).imagePublicId (string)
    // 2) Or multer placed the uploaded file at req.file -> upload it here
    // -------------------

    // Defensive access to req.body
    const body: any = (req as any).body || {};
    let newAvatarUrl = body.image || "";
    let newAvatarPublicId = (req as any).imagePublicId || "";

    // If no url provided but multer file exists, upload here
    const file = (req as any).file;
    if (!newAvatarUrl && file && file.path) {
      try {
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: "user_avatars",
          use_filename: true,
          unique_filename: false,
        });

        newAvatarUrl = uploadResult.secure_url;
        newAvatarPublicId = uploadResult.public_id;
      } catch (uploadErr) {
        console.error("Cloudinary upload failed in updateAvatar:", uploadErr);
        // attempt to remove temp file if present
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.warn("Failed to unlink temp file after upload failure:", e);
        }
        return res.status(500).json({ message: "Failed to upload avatar" });
      } finally {
        // remove multer temp file if it exists
        try {
          if (file && file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (e) {
          console.warn("Failed to unlink temp file:", e);
        }
      }
    }

    // If still empty, nothing uploaded — allow clearing avatar or return error
    // (choose your policy). Here we allow setting empty to clear avatar.
    // Remove old avatar from Cloudinary if present (best-effort)
    if (user.avatarPublicId) {
      try {
        await cloudinary.uploader.destroy(user.avatarPublicId);
      } catch (err) {
        console.error("Failed to delete old avatar from Cloudinary:", err);
        // continue
      }
    }

    user.avatar = newAvatarUrl || "";
    user.avatarPublicId = newAvatarPublicId || "";

    await user.save();

    // Return safe user snippet (no password)
    return res.json({
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      avatar: user.avatar,
      followers: user.followers || [],
      following: user.following || [],
    });
  } catch (err) {
    console.error("updateAvatar error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
