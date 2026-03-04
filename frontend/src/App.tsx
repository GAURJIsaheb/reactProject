import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login/Login";
import Signup from "./pages/Signup/Signup";
import Dashboard from "./pages/Dashboard/Dashboard";
import { useAuthStore } from "./zustand/authStore";
import AdminDashboard from "./Admin/adminDashboard";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";



const API = `http://${window.location.hostname}:4000`; 

function App() {
  const { token, setAuth, logout } = useAuthStore();
  const [booting, setBooting] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    if (!token) {
      setBooting(false);
      return;
    }
    try {
      // ── Step 1: Verify token + get user ─────────────────────────────────
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("auth/me failed");
      const data = await res.json();
      setAuth(token, data.user.name, data.user.email, data.user.userId);

      // ── Step 2: Check admin role from /auth/me response  ────────

      const roleRes = await fetch(`${API}/auth/role`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (roleRes.ok) {
        const roleData = await roleRes.json();
        setIsAdmin(roleData.role === "superadmin");
      }

    } catch {
      logout();
    } finally {
      setBooting(false);
    }
  }

  if (booting) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#080808",
        color: "#444", fontFamily: "monospace", fontSize: 13,
      }}>
        Booting...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"  element={!token ? <Login />  : <Navigate to={isAdmin ? "/admin" : "/dashboard"} />} />
        <Route path="/signup" element={!token ? <Signup /> : <Navigate to={isAdmin ? "/admin" : "/dashboard"} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />


        <Route path="/dashboard" element={
          !token   ? <Navigate to="/login" />     :
          isAdmin  ? <Navigate to="/admin" />     :
          <Dashboard />
        } />

        <Route path="/admin" element={
          !token   ? <Navigate to="/login" />     :
          !isAdmin ? <Navigate to="/dashboard" /> :
          <AdminDashboard />
        } />

        <Route path="*" element={
          <Navigate to={!token ? "/login" : isAdmin ? "/admin" : "/dashboard"} />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;