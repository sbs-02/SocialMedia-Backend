import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import multer from "multer";
import Post from "../models/Post";
import { cloudinary } from "../config/cloudinary";

// validate ObjectId middleware
export const validateObjectId =
  (param = "id") =>
  (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[param];
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid id." });
    next();
  };

// require req.user and verify ownership of the post
export const requirePostOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized." });

    const postId = req.params.id;
    const post = await Post.findById(postId).select("user");
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.user.toString() !== user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Forbidden: not the post owner." });
    }
    next();
  } catch (err) {
    console.error("requirePostOwner error:", err);
    return res
      .status(500)
      .json({ message: "Server error from requiere owner." });
  }
};

/*
    Multer memory storage so files are available in `req.file.buffer` 
    We accept a single file with field name "image"
*/
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

const singleUpload = upload.single("image");

/*
    Middleware:
 */
export const uploadImageToCloudinary = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // run multer to populate req.file
  singleUpload(req, res, async (err: any) => {
    if (err) {
      console.error("Multer error:", err);
      return res
        .status(400)
        .json({ message: err.message || "File upload error" });
    }

    // if no file, continue
    const file = (req as any).file;
    if (!file) {
      return next();
    }

    try {
      // Upload buffer using upload_stream
      const streamUpload = (buffer: Buffer) =>
        new Promise<{ public_id: string; secure_url: string }>(
          (resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "social_posts" }, // optional: keep uploads organized
              (error, result) => {
                if (error) return reject(error);
                if (!result)
                  return reject(new Error("No result from Cloudinary"));
                resolve({
                  public_id: result.public_id,
                  secure_url: result.secure_url,
                });
              }
            );
            stream.end(buffer);
          }
        );

      const result = await streamUpload(file.buffer);

      // attach Cloudinary URL to req.body.image
      req.body.image = result.secure_url;
      // if you want to keep public_id too:
      (req as any).imagePublicId = result.public_id;

      return next();
    } catch (uploadErr) {
      console.error("Cloudinary upload error:", uploadErr);
      return res.status(500).json({ message: "Image upload failed" });
    }
  });
};
