import express from "express";
import { body } from "express-validator";
import {
  createPost,
  getPost,
  updatePost,
  deletePost,
  getFeed,
  toggleLike,
  addComment,
  getComments,
  deleteComment,
} from "../controllers/post";
import { auth } from "../middleware/auth";
import {
  validateObjectId,
  requirePostOwner,
  uploadImageToCloudinary,
} from "../middleware/post";

const router = express.Router();

/*
    POST /api/posts
    Create a new post
*/
router.post(
  "/",
  auth,
  uploadImageToCloudinary,
  [
    body("content")
      .optional()
      .isString()
      .withMessage("content must be a string")
      .isLength({ max: 500 })
      .withMessage("content must be at most 500 characters"),
  ],
  createPost
);

/*
    GET /api/posts/feed
    Personalized feed (authenticated)
*/
router.get("/feed", auth, getFeed);

/*
    GET /api/posts/:id
    Public single post view
*/
router.get("/:id", validateObjectId("id"), getPost);

/*
    PUT /api/posts/:id
    Update post (owner-only)
*/
router.put(
  "/:id",
  auth,
  validateObjectId("id"),
  requirePostOwner,
  uploadImageToCloudinary, // optional image replacement
  updatePost
);

/*
    DELETE /api/posts/:id
    Delete post 
*/
router.delete(
  "/:id",
  auth,
  validateObjectId("id"),
  requirePostOwner,
  deletePost
);

/*
    POST /api/posts/:id/like
    Toggle like/unlike 
*/
router.post("/:id/like", auth, validateObjectId("id"), toggleLike);

router.post("/:id/comments", auth, validateObjectId("id"), addComment);
router.get("/:id/comments", validateObjectId("id"), getComments);
router.delete(
  "/:postId/comments/:commentId",
  auth,
  validateObjectId("postId"),
  validateObjectId("commentId"),
  deleteComment
);

export default router;
