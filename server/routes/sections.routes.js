import express from "express";
import { asyncHandler } from "../tryCatch/async.js";
import { syncSections,
  getSections,
  createSection,
  updateSection,
  deleteSection,} from "../controllers/section.controller.js";

const router = express.Router();

router.get("/sync",      asyncHandler(syncSections));
router.get("/",          asyncHandler(getSections));//method:get
router.post("/",         asyncHandler(createSection));//method:post
router.patch("/:id",     asyncHandler(updateSection));
router.delete("/:id",    asyncHandler(deleteSection));

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