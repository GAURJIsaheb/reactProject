import passport from "../passport/passport.js"; // ← change

export function requireAuth(req, res, next) {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: "Invalid or missing token" });

    req.user = user; // { email, name }
    next();
  })(req, res, next);
}
