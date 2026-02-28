import { signupUser } from "@/api/authApi";
import { saveUser } from "@/infrastructure/lib/idb";
import { useAuthStore } from "@/zustand/authStore";

export async function signupFlow(
  name: string,
  email: string,
  password: string
) {
  const data = await signupUser({ name, email, password });

  const { setAuth } = useAuthStore.getState();

  setAuth(data.token, data.user.name, data.user.email, data.user.userId);

  await saveUser({
    userId: data.user.userId,
    email: data.user.email,
    name: data.user.name,
    lastLoginAt: Date.now(),
  });

  return data.user;
}