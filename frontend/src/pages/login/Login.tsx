import { useEffect, useState } from "react";
import { loginUser } from "@/api/authApi";
import { useAuthStore } from "@/store/authStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { token, setAuth } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      window.location.href = "http://localhost:4000";
    }
  }, [token]);

 const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  if (!trimmedName) {
    alert("Name cannot be empty or spaces only");
    return;
  }

  if (!trimmedEmail) {
    alert("Email cannot be empty");
    return;
  }

  try {
    setLoading(true);

    const data = await loginUser({
      name: trimmedName,
      email: trimmedEmail
    });

    setAuth(data.token, data.user.name, data.user.email);
    window.location.reload();

  } catch (err: any) {
    alert(err.message);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <Card className="w-87.5 bg-[#111827] border border-white/10 shadow-2xl rounded-xl">
        
        <CardHeader>
          <CardTitle className="text-center text-white text-xl">
            Welcome back
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">

            <div className="space-y-2">
              <Label className="text-white">Full Name</Label>
              <Input
                className="text-white"
                placeholder="Enter name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setName(name.trim())}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Email</Label>
              <Input
               className="text-white"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button
              className="w-full"
              disabled={loading}
            >
              {loading ? "Logging..." : "Login"}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
