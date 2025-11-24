import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/User";
import dotenv from "dotenv";

dotenv.config();

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided." });
    }

    const token = header.split(" ")[1];

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET not set in environment");
      return res.status(500).json({ message: "Server misconfiguration." });
    }

    // verify token - result can be string or JwtPayload (object)
    const verified = jwt.verify(token as string, secret as string);

    // Ensure we have an object payload and it contains an `id`
    if (typeof verified !== "object" || verified === null) {
      return res.status(401).json({ message: "Invalid token payload." });
    }

    // safe extraction (payload may be JwtPayload | any)
    const payload = verified as JwtPayload & { id?: string | undefined };

    if (!payload.id) {
      return res.status(401).json({ message: "Token payload missing id." });
    }

    // find the user and attach to request (exclude password)
    const user = await User.findById(payload.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    // attach user
    (req as any).user = user;

    next();
  } catch (err: any) {
    // Distinguish token expiration optionally
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired." });
    }
    console.error("Auth middleware error:", err);
    return res.status(401).json({ message: "Unauthorized." });
  }
};
