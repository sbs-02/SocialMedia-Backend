import type { IUserPublic } from "../types/user";

export const toPublicUser = (userDoc: any): IUserPublic => {
  if (!userDoc) throw new Error("No user provided to toPublicUser");

  const id = userDoc._id ? String(userDoc._id) : userDoc.id ?? "";

  const followers = Array.isArray(userDoc.followers)
    ? userDoc.followers.map((f: any) =>
        typeof f === "string" ? f : String(f._id ?? f)
      )
    : [];

  const following = Array.isArray(userDoc.following)
    ? userDoc.following.map((f: any) =>
        typeof f === "string" ? f : String(f._id ?? f)
      )
    : [];

  return {
    id,
    _id: id,
    fullName: userDoc.fullName ?? "",
    username: userDoc.username ?? "",
    email: userDoc.email,
    role: userDoc.role,
    followers,
    following,
    createdAt: userDoc.createdAt
      ? new Date(userDoc.createdAt).toISOString()
      : "",
    updatedAt: userDoc.updatedAt
      ? new Date(userDoc.updatedAt).toISOString()
      : "",
  };
};
