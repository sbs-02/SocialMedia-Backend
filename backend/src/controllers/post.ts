import { Request, Response } from "express";
import Post from "../models/Post";
import User from "../models/User";
import mongoose from "mongoose";
import { CreatePostDTO, UpdatePostDTO } from "../types/post";
import { v2 as cloudinary } from "cloudinary";
import Comment from "../models/Comment"; // new model

const ITEMS_PER_PAGE = 10;
const MAX_CONTENT_LENGTH = 500;

const getUserId = (req: Request) =>
  (req as any).user?._id as mongoose.Types.ObjectId | undefined;

/*
    Create a post
    middleware (uploadImageToCloudinary) may set req.body.image and req.imagePublicId
 */
export const createPost = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // prefer middleware-provided Cloudinary URL
    const imageUrl = req.body.image || "";
    const imagePublicId = (req as any).imagePublicId || "";

    const contentRaw = req.body.content ?? "";
    const content = String(contentRaw).trim();
    console.log(imageUrl, content);

    if (!content) return res.status(400).json({ message: "Content required" });
    if (content.length > MAX_CONTENT_LENGTH)
      return res
        .status(400)
        .json({ message: `Content too long (max ${MAX_CONTENT_LENGTH})` });

    const post = await Post.create({
      user: userId,
      content,
      image: imageUrl,
      imagePublicId,
    });

    await post.populate("user", "username avatar");
    return res.status(201).json(post);
  } catch (err) {
    console.error("createPost error:", err);
    return res.status(500).json({ message: "Server error from create post" });
  }
};

/*
    Get single post
*/

export const getPost = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid post id" });

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Fetch the username manually
    const user = await User.findById(post.user).select("username fullName");
    const username = user ? user.username : "Unknown";
    const fullName = user ? user.fullName : "";

    return res.json({
      _id: post._id,
      user: {
        _id: post.user,
        username,
        fullName,
      },
      content: post.content,
      image: post.image || "",
      imagePublicId: post.imagePublicId || "",
      likes: post.likes || [],
      commentCount: post.commentCount || 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      __v: post.__v,
    });
  } catch (err) {
    console.error("getPost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/*
    Update post
    Only owner route should call this 
*/
export const updatePost = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid post id" });

    const dto: UpdatePostDTO = {
      content: req.body.content,
      image: req.body.image, // middleware sets this if uploaded
    };

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // content update
    if (dto.content !== undefined) {
      const trimmed = String(dto.content).trim();
      if (!trimmed)
        return res.status(400).json({ message: "Content required" });
      if (trimmed.length > MAX_CONTENT_LENGTH)
        return res
          .status(400)
          .json({ message: `Content too long (max ${MAX_CONTENT_LENGTH})` });
      post.content = trimmed;
    }

    // image update (replace)
    const newImageUrl = dto.image;
    const newPublicId = (req as any).imagePublicId || "";

    if (newImageUrl !== undefined && newImageUrl !== post.image) {
      // delete old cloudinary image if we have its public id
      if (post.imagePublicId) {
        try {
          await cloudinary.uploader.destroy(post.imagePublicId);
        } catch (e) {
          console.error("Failed to delete old Cloudinary image:", e);
          // don't block update for Cloudinary failures
        }
      }
      post.image = newImageUrl || "";
      post.imagePublicId = newPublicId || "";
    }

    await post.save();
    await post.populate("user", "username avatar"); // populate user
    return res.json(post);
  } catch (err) {
    console.error("updatePost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/*
    Delete post
    Only owner route should call this (use requirePostOwner middleware)
    Deletes Cloudinary asset first (best-effort), then deletes DB doc
*/
export const deletePost = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid post id" });

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(post.imagePublicId);
      } catch (e) {
        console.error("Failed to delete Cloudinary image:", e);
        // continue even if deletion fails
      }
    }

    await post.deleteOne();
    return res.json({ message: "Post deleted" });
  } catch (err) {
    console.error("deletePost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/*
    getFeed
    returns paginated posts by user + users they follow
*/
export const getFeed = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || ITEMS_PER_PAGE);

    const user = await User.findById(userId).select("following");
    const users = [userId, ...(user?.following || [])];

    const posts = await Post.find({ user: { $in: users } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username fullName");

    return res.json({ page, limit, posts });
  } catch (err) {
    console.error("getFeed error:", err);
    return res.status(500).json({ message: "Error geting feeds" });
  }
};

/*
    toggleLike
*/
export const toggleLike = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const postId = req.params.id;
    if (!mongoose.isValidObjectId(postId))
      return res.status(400).json({ message: "Invalid post id" });

    // check if already liked
    const post = await Post.findById(postId).select("likes");
    if (!post) return res.status(404).json({ message: "Post not found" });

    const hasLiked = post.likes.some((l) => l.toString() === userId.toString());

    if (!hasLiked) {
      // add atomically
      await Post.findByIdAndUpdate(postId, { $addToSet: { likes: userId } });
    } else {
      // remove atomically
      await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } });
    }

    const updated = await Post.findById(postId).select("likes");
    return res.json({
      liked: !hasLiked,
      likesCount: updated?.likes.length ?? 0,
    });
  } catch (err) {
    console.error("toggleLike error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/posts/:id/comments
export const addComment = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const postId = req.params.id;
    if (!mongoose.isValidObjectId(postId))
      return res.status(400).json({ message: "Invalid post id" });

    const textRaw = req.body.text ?? "";
    const text = String(textRaw).trim();
    if (!text) return res.status(400).json({ message: "Comment required" });

    const comment = await Comment.create({
      post: postId,
      author: userId,
      text,
    });
    // increment commentCount (best-effort)
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

    const populated = await comment.populate("author", "username fullName");
    return res.status(201).json(populated);
  } catch (err) {
    console.error("addComment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/posts/:id/comments
export const getComments = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    if (!mongoose.isValidObjectId(postId))
      return res.status(400).json({ message: "Invalid post id" });

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .populate("author", "username fullName");
    res.json(comments);
  } catch (err) {
    console.error("getComments error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/posts/:postId/comments/:commentId
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { postId, commentId } = req.params;

    if (
      !mongoose.isValidObjectId(postId) ||
      !mongoose.isValidObjectId(commentId)
    ) {
      return res.status(400).json({ message: "Invalid post or comment id" });
    }

    // find comment
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // find post (to check owner)
    const post = await Post.findById(postId).select("user");
    if (!post) return res.status(404).json({ message: "Post not found" });

    const isCommentOwner = comment.author.toString() === userId.toString();
    const isPostOwner = post.user.toString() === userId.toString();

    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({
        message: "Not allowed — only comment owner or post owner can delete",
      });
    }

    await comment.deleteOne();

    // decrement commentCount
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } });

    return res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error("deleteComment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
