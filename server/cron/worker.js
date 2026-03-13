import { connectDB } from "../mongo/mongo.js";
import { registerCronJobs } from "./cleanupJobs.js";

async function startCronWorker() {
  await connectDB();
  registerCronJobs();
  console.log("Cron worker started");
}

startCronWorker().catch((err) => {
  console.error("Cron worker failed to start:", err);
  process.exit(1);
});
