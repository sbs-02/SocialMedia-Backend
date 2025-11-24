import mongoose from "mongoose";
import { Types } from "mongoose";

export interface CreatePostDTO {
  content: string;
  image?: string;
}

export interface UpdatePostDTO {
  content?: string;
  image?: string;
}

export interface PostResponse {
  _id: Types.ObjectId | string;
  user: {
    _id: Types.ObjectId | string;
    username?: string;
  };
  content: string;
  image?: string;
  likesCount: number;
  likedByMe?: boolean;
  comments: [
    {
      comment: string;
      id: string;
      commentBy: mongoose.Types.ObjectId;
      createdAt: Date;
      updatedAt: Date;
    }
  ];
  createdAt: string;
  updatedAt: string;
}
export interface IPost extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  content: string;
  image?: string;
  imagePublicId: string;
  likes: mongoose.Types.ObjectId[];
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}
