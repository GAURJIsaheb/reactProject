import jwt from "jsonwebtoken";
import dotenv from "dotenv"
dotenv.config();

const SECRET = process.env.SECRET;


export function signToken(user){
  return jwt.sign(
    { email: user.email, name: user.name, userId: user.userId }, // ← userId add
    SECRET,
    { expiresIn:"1d" }
  );
}

export function verifyToken(token){
  return jwt.verify(token, SECRET);
}
