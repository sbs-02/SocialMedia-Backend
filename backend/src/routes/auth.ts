import express from "express";
import { body } from "express-validator";
import { register, login } from "../controllers/auth";

const router = express.Router();

/*
POST /api/auth/register
body: { username, email, password }
*/
router.post(
  "/register",
  [
    body("username")
      .isLength({ min: 3 })
      .withMessage("username minimum 3 characters"),
    body("email").isEmail().withMessage("invalid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("password minimum 6 characters"),
  ],
  register
);

/*
POST /api/auth/login
body:{ email, password }
*/
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("invalid email"),
    body("password").exists().withMessage("password required"),
  ],
  login
);

export default router;
