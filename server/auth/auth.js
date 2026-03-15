import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { loginRateLimiter } from "../middlewares/rateLimiter.js";
import { upload } from "../s3/upload.middleware.js";
import { asyncHandler } from "../tryCatch/async.js";
import {
  getCurrentUser,
  getCurrentUserRole,
  login,
  signup,
  uploadProfileAvatar,
} from "../controllers/auth.controller.js";

const router = express.Router();


//running on /auth already
router.post("/signup", asyncHandler(signup));

router.post("/login", loginRateLimiter, login);//rate limiter + login controlller for local strategy

router.get("/me",//Frontend sends the token in header--->Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  requireAuth,//for jwt strategy
  getCurrentUser);

router.get("/role",
  requireAuth,
  asyncHandler(getCurrentUserRole)
);

router.post(
  "/avatar",
  requireAuth,
  upload.single("avatar"),
  asyncHandler(uploadProfileAvatar)
);

export default router;



/*
without middleware/requireAuth.js :
 passport.authenticate("jwt", { session:false })

 router.get("/role",
  passport.authenticate("jwt", { session:false }),
  asyncHandler(getCurrentUserRole)
);
 */
