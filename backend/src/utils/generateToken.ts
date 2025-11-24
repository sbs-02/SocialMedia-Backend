import jwt from "jsonwebtoken";

export const generateToken = (payload: object) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  if (!secret) throw new Error("JWT_SECRET not set");
  return jwt.sign(
    payload,
    secret as jwt.Secret,
    { expiresIn } as jwt.SignOptions
  );
};
