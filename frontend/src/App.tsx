import { useEffect, useState } from "react";
import Login from "./pages/login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import { useAuthStore } from "./store/authStore";

const API = "http://localhost:4000";

function App() {
  const { token, setAuth, logout } = useAuthStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    if (!token) {
      setBooting(false);
      return;
    }

    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();

      setAuth(token!, data.user.name, data.user.email);
    } catch {
      console.log("invalid token");
      logout();
    } finally {
      setBooting(false);
    }
  }
  

  if (booting) {
    return (
      <div style={{ padding: 40 }}>
        Booting client...
      </div>
    );
  }

  if (!token) return <Login />;

  return <Dashboard />;
}

export default App;
