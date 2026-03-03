import express from "express";
import { asyncHandler } from "../tryCatch/async.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { syncSections,
  getSections,
  createSection,
  updateSection,
  deleteSection,} from "../controllers/section.controller.js";

const router = express.Router();

router.get("/sync", requireAuth, asyncHandler(syncSections));
router.get("/", requireAuth, asyncHandler(getSections));//method:get
router.post("/", requireAuth, asyncHandler(createSection));//method:post
router.patch("/:id", requireAuth, asyncHandler(updateSection));
router.delete("/:id", requireAuth, asyncHandler(deleteSection));

export default router;

/*
Suppose frontend does:

fetch("/sections", { method: "GET" })

Express matches:

router.get("/")

If frontend does:

fetch("/sections", { method: "POST" })

Express matches:

router.post("/")

There is zero ambiguity.

*/