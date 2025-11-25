import express from "express";
import dotenv from "dotenv";
import {
  deleteAllUsers,
  deleteUserById,
  getUserById,
  getUserPosts,
  getUsers,
  searchUsers,
  toggleFollow,
  updateUser,
  updateAvatar,
} from "../controllers/user";
import { auth } from "../middleware/auth";

const router = express.Router();
dotenv.config();

// GET /api/users
router.route("/").get(getUsers).delete(deleteAllUsers);

// Search suggestions: GET /api/users/search?search=term
router.get("/search", searchUsers);

// User's posts: GET /api/users/:id/posts
router.get("/:id/posts", getUserPosts);

// Follow/unfollow: POST /api/users/:id/follow  (authenticated)
router.post("/:id/follow", auth, toggleFollow);

// PUT /api/users/:id/avatar
router.put("/:id/avatar", auth, updateAvatar);

// Now the dynamic user id routes (these are last)
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUserById);

export default router;
