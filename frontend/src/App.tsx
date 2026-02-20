import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/login/Login";
import Signup from "./pages/Signup/Signup";
import Dashboard from "./pages/Dashboard/Dashboard";

import { useAuthStore } from "./zustand/authStore";
import {socket} from "./socket/socket"

const API = "http://localhost:4000";

function App() {
  const { token, setAuth, logout ,userEmail } = useAuthStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    bootstrap();
  }, []);
  
    useEffect(() => {
      if (!userEmail) return;

      socket.emit("register", userEmail);
      console.log("socket registered:", userEmail);

    }, [userEmail]);

  async function bootstrap() {
    if (!token) {
      setBooting(false);
      return;
    }

    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
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
      return <div className="p-10">Booting client...</div>;
    }


  return (
    <BrowserRouter>
      <Routes>

        {/* public */}
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/signup" element={!token ? <Signup /> : <Navigate to="/dashboard" />} />

        {/* private */}
        <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />

        {/* default */}
        <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;