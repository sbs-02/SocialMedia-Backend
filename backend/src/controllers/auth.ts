import { Request, Response } from "express";
import { validationResult } from "express-validator";
import bcrypt from "bcrypt";
import User from "../models/User";
import { generateToken } from "../utils/generateToken";
import { toPublicUser } from "../utils/transformUser";

const SALT_ROUNDS = 11;

export const register = async (req: Request, res: Response) => {
  // express-validator errors
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { fullName, username, email, password } = req.body;
  try {
    // Check existing email
    const existingEmail = await User.findOne({ email });
    if (existingEmail)
      return res.status(400).json({ message: "Email already in use." });

    const existingUsername = await User.findOne({ username });
    if (existingUsername)
      return res.status(400).json({ message: "Username already taken." });

    // Hash password
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      fullName,
      username,
      email,
      password: hashed,
    });

    const token = generateToken({ id: user._id });

    // Return safe user object
    const safeUser = toPublicUser(user);

    return res.status(201).json({
      token,
      user: safeUser,
      message: "User Registered Successfully.",
    });
  } catch (err: any) {
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Full error:", err);
    return res.status(500).json({ message: "Error Registering the user." });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials." });

    // after token creation
    const token = generateToken({ id: user._id });
    const safeUser = toPublicUser(user);
    console.log("User Logged In.");
    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
};
