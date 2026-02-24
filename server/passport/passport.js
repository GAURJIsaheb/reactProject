// server/passport.js
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import bcrypt from "bcrypt";
import { db } from "../mongo/mongo.js";
import dotenv from "dotenv";
dotenv.config();

const SECRET = process.env.SECRET;


// ─── Local Strategy (login ke liye) ───────────────────────────────────────────
passport.use(
  "local",
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const user = await db.collection("users").findOne({ email });
        if (!user) return done(null, false, { message: "User not found" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return done(null, false, { message: "Wrong password" });

        return done(null, { email: user.email, name: user.name, userId: user._id.toString() });
      } catch (err) {
        return done(err);
      }
    }
  )
);

// JWT Strategy 
passport.use(
  "jwt",
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: SECRET,
    },
    async (payload, done) => {
      try {
        // ← userId bhi pass karo
        return done(null, { email: payload.email, name: payload.name, userId: payload.userId });
      } catch (err) {
        return done(err);
      }
    }
  )
);

export default passport;