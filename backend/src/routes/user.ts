import express from "express";
import dotenv from "dotenv";
import {
  deleteAllUsers,
  deleteUserById,
  getUserById,
  getUsers,
  updateUser,
} from "../controllers/user";
const router = express.Router();
dotenv.config();

//Get all users
router.route("/").get(getUsers).delete(deleteAllUsers);

//Get user by ID
router.get("/:id", getUserById);

//Update user by ID
router.put("/:id", updateUser);

//Delete a single user by ID
router.delete("/:id", deleteUserById);

//DEV ONLY: delete all users
//router.delete("/", deleteAllUsers);

export default router;
