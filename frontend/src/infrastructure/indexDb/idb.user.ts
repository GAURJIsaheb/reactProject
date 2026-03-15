import { initDB, STORE_USER } from "./idb.init";

export const saveUser = async (u: {
  userId:      string;
  email:       string;
  name:        string;
  lastLoginAt: number;
}): Promise<void> => {
  await (await initDB()).put(STORE_USER, u);
};

export const getUser = async (email: string): Promise<{ email: string; name: string } | null> => {
  if (!email) return null;
  return (await initDB()).get(STORE_USER, email);
};