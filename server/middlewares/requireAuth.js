//a middleware/wrapper used for protected routes,,,it is using passport.js in it
import passport from "../auth/passport.js"; 

export function requireAuth(req, res, next) {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: "Invalid or missing token" });

    req.user = user; // { email, name }
    next();
  })(req, res, next);
}



/*
next = next middleware--> means let it move to next part/middleware/api calls */

