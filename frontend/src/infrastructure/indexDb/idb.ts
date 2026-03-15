export { initDB } from "./idb.init";

export {
  addTask,
  getAllTasks,
  getAllTasksForUser,
  getTaskById,
  deleteTaskFromIDB,
  deleteTasksBySectionFromIDB,
  updateTaskSectionInIDB,
  pruneSyncedTasksMissingOnServer,
} from "./idb.tasks";

export {
  getAllArchivedTasks,
  saveArchivedToDB,
  deleteArchivedFromDB,
  clearAllArchivedFromDB,
} from "./idb.archive";

export {
  saveUser,
  getUser,
} from "./idb.user";

export {
  addToQueue,
  getQueue,
  removeFromQueue,
  updateQueue,
  upsertQueue,
  removeTaskUpdatesFromQueue,
  removeTasksFromQueue,
} from "./idb.queue";

export {
  getAllSections,
  upsertSection,
  deleteSectionFromIDB,
  pruneSyncedSectionsMissingOnServer,
} from "./idb.sections";

export {
  upsertNotification,
  getAllNotifications,
  getNotificationById,
  softDeleteNotificationInIDB,
  markAllNotificationsReadInIDB,
  mergeNotificationsFromServer,
} from "./idb.notifications";

export {
  clearAllUserData,
  clearWorkspaceDataFromIDB,
} from "./idb.global";