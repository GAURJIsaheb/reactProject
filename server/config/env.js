import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Loads `server/.env` no matter where Node is started from.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

