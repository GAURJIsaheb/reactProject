//Pure functions
import { toast } from "sonner";

export function requireOnline(action: string): boolean {
  if (!navigator.onLine) {
    toast.warning(`You're offline — "${action}" requires an internet connection in shared workspaces.`);
    return false;
  }
  return true;
}