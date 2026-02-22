import { signupUser } from "@/api/authApi";
import { saveUser } from "@/lib/idb";
import { useAuthStore } from "@/zustand/authStore";


export async function signupFlow(
  name: string,
  email: string,
  password: string
) {
  const data = await signupUser({
    name,
    email,
    password,
  });

  // zustand store
  const { setAuth } = useAuthStore.getState();
  setAuth(data.token, data.user.name, data.user.email);

  // indexedDB user
  await saveUser({
    email: data.user.email,
    name: data.user.name,
  });

  return data.user;
}