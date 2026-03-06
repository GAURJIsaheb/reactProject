import { Router } from "express";
import { asyncHandler } from "../tryCatch/async.js";
import {
  syncNotifications,
  deleteNotification,
  bulkDeleteNotifications,
  markAllRead,
} from "../controllers/notifications.controller.js";

const router = Router();

router.get("/sync", asyncHandler(syncNotifications));
router.patch("/read-all", asyncHandler(markAllRead));
router.delete("/bulk-delete", asyncHandler(bulkDeleteNotifications));
router.delete("/:id", asyncHandler(deleteNotification));

export default router;
