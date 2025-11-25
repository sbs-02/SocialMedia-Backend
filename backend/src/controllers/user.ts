import { Request, Response } from "express";
import User from "../models/User";
import Post from "../models/Post";
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
export const getUserPosts = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    if (!mongoose.isValidObjectId(userId))
      return res.status(400).json({ error: "Invalid ID." });

    const posts = await Post.find({ user: userId }).sort({ createdAt: -1 });

    // Map posts to include user info
    const postsWithUser = await Promise.all(
      posts.map(async (post) => {
        const user = await User.findById(post.user).select("username fullName");
        return {
          _id: post._id,
          user: {
            _id: post.user,
            username: user?.username || "Unknown",
            fullName: user?.fullName || "",
          },
          content: post.content,
          image: post.image || "",
          imagePublicId: post.imagePublicId || "",
          likes: post.likes || [],
          commentCount: post.commentCount || 0,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          __v: post.__v,
        };
      })
    );

    res.json(postsWithUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
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
