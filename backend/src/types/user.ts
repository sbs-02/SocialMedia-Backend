import mongoose from "mongoose";
export interface IUser extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: string;
  followers?: mongoose.Types.ObjectId[] | IUserPublic[]; // raw or populated
  following?: mongoose.Types.ObjectId[] | IUserPublic[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PopulatedUser {
  _id: string;
  username: string;
  fullName?: string;
  avatar?: string;
}

export interface PostWithUser {
  _id: string;
  user: PopulatedUser;
  content: string;
  image?: string;
  likes: string[];
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IUserPublic = {
  id: string; // convenience string id
  _id?: string; // optional _id field if you want it
  fullName: string;
  username: string;
  email?: string;
  role?: string;
  followers?: string[]; // array of user ids (strings)
  following?: string[]; // array of user ids (strings)
  createdAt?: string;
  updatedAt?: string;
};

export type CreateUserDTO = {
  fullName: string;
  username: string;
  email: string;
  password: string;
};

export type UpdateUserDTO = Partial<{
  fullName: string;
  username: string;
  email: string;
  password: string;
}>;
