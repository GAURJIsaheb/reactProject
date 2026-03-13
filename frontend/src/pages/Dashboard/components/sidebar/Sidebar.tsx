import { useState, useEffect, useRef } from "react";
import {Anchor,Moon,Sun,LogOut,Menu,X,Calendar,LayoutDashboard,ChevronLeft,ChevronRight,} from "lucide-react";
import WorkspaceSelector from "./WorkspaceSelector";
import NotificationsBell from "./NotificationsBell";
import InviteModal from "./InviteModal";
import type { HeaderProps } from "./types";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/zustand/authStore";

/* ─── animation helper ─── */
const TRANSITION = "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)";

type SidebarExtraProps = {
  onCollapseChange?: (collapsed: boolean) => void;
};

export default function Sidebar({
  workspace,
  setWorkspace,
  workspaceOptions,
  onAddWorkspace,
  onDeleteWorkspace,
  isDeletingWorkspace,
  userName,
  theme,
  toggleTheme,
  logout,
  notifications,
  onMarkAllRead,
  onDismissNotification,
  onCollapseChange,
}: HeaderProps & SidebarExtraProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentOption = workspaceOptions.find((o) => o.value === workspace);
  const currentWsId =
    (currentOption as typeof currentOption & { id?: string })?.id ?? workspace;
  const currentWsLabel = currentOption?.label ?? workspace;

  /* close mobile sidebar on route change */
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  /* lock body scroll when mobile sidebar is open */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* close on resize to desktop */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* sync collapsed state to parent + CSS custom property */
  useEffect(() => {
    onCollapseChange?.(collapsed);
    // Set a data attribute on root so CSS can adjust main content margin
    document.documentElement.setAttribute("data-sidebar-collapsed", String(collapsed));
  }, [collapsed, onCollapseChange]);

  const isActive = (path: string) => location.pathname === path;
  const role = useAuthStore((state) => state.role);

  /* ────────────────────── Sidebar content ────────────────────── */
  const sidebarContent = (isMobile: boolean) => (
    <div className="sidebar-inner">
      <div className="sidebar-logo-block">
        <div className="sidebar-logo-icon">
          <Anchor size={18} />
        </div>
        {(!collapsed || isMobile) && (
          <span className="sidebar-logo-text">FlowTask</span>
        )}
      </div>

      {/* ─── Workspace selector ─── */}
      {(!collapsed || isMobile) && (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Workspace</div>
          <WorkspaceSelector
            workspace={workspace}
            setWorkspace={setWorkspace}
            workspaceOptions={workspaceOptions}
            onAddWorkspace={onAddWorkspace}
            onDeleteWorkspace={onDeleteWorkspace}
            isDeletingWorkspace={isDeletingWorkspace}
            onInvite={() => setShowInvite(true)}
            theme={theme}
          />
        </div>
      )}

      {/* ─── Navigation ─── */}
      <div className="sidebar-section">
        {(!collapsed || isMobile) && (
          <div className="sidebar-section-label">Navigation</div>
        )}
        <nav className="sidebar-nav">
          <button
            onClick={() => navigate("/dashboard")}
            className={`sidebar-nav-item ${isActive("/dashboard") ? "sidebar-nav-item--active" : ""}`}
            title="Dashboard"
          >
            <LayoutDashboard size={18} />
            {(!collapsed || isMobile) && <span>Dashboard</span>}
          </button>
          <button
            onClick={() => navigate("/calendar")}
            className={`sidebar-nav-item ${isActive("/calendar") ? "sidebar-nav-item--active" : ""}`}
            title="Calendar"
          >
            <Calendar size={18} />
            {(!collapsed || isMobile) && <span>Calendar</span>}
          </button>
        </nav>
      </div>

      {/* ─── Notifications ─── */}
      <div className="sidebar-section">
        {(!collapsed || isMobile) && (
          <div className="sidebar-section-label">Notifications</div>
        )}
        <div className={collapsed && !isMobile ? "sidebar-center-item" : ""}>
          <NotificationsBell
            notifications={notifications}
            onMarkAllRead={onMarkAllRead}
            onDismissNotification={onDismissNotification}
          />
        </div>
      </div>

      {/* ──── SPACER ──── */}
      <div className="sidebar-spacer" />

      {/* ─── Theme Toggle ─── */}
      <div className="sidebar-bottom-section">
        <div
          className={`sidebar-theme-toggle ${collapsed && !isMobile ? "sidebar-theme-toggle--collapsed" : ""}`}
          onClick={toggleTheme}
          title="Toggle theme"
        >
          <div className="sidebar-theme-track" data-theme={theme}>
            <div className="sidebar-theme-thumb">
              {theme === "dark" ? <Moon size={12} /> : <Sun size={12} />}
            </div>
          </div>
          {(!collapsed || isMobile) && (
            <span className="sidebar-theme-label">
              {theme === "dark" ? "Dark mode" : "Light mode"}
            </span>
          )}
        </div>

        {/* ─── User ─── */}
        {userName && (!collapsed || isMobile) && (
          <div className="sidebar-user-block">
            <div className="sidebar-user-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{userName}</div>
              <div className="sidebar-user-role">{role}</div>
            </div>
          </div>
        )}

        {userName && collapsed && !isMobile && (
          <div className="sidebar-user-block sidebar-center-item" title={userName}>
            <div className="sidebar-user-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* ─── Logout ─── */}
        <button
          onClick={logout}
          className="sidebar-logout-btn"
          title="Logout"
        >
          <LogOut size={16} />
          {(!collapsed || isMobile) && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Mobile Hamburger (hidden on desktop) ─── */}
      <button
        className="sidebar-hamburger"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* ─── Overlay for mobile ─── */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Desktop Sidebar ─── */}
      <aside
        className={`sidebar sidebar--desktop ${collapsed ? "sidebar--collapsed" : ""}`}
        style={{ transition: TRANSITION }}
      >
        {/* Collapse toggle */}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {sidebarContent(false)}
      </aside>

      {/* ─── Mobile Sidebar ─── */}
      <aside
        className={`sidebar sidebar--mobile ${mobileOpen ? "sidebar--mobile-open" : ""}`}
        style={{ transition: TRANSITION }}
      >
        <button
          className="sidebar-close-btn"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
        {sidebarContent(true)}
      </aside>

      {/* ─── Invite modal ─── */}
      {showInvite && (
        <InviteModal
          workspaceId={currentWsId}
          workspaceName={currentWsLabel}
          isOwner={Boolean(currentOption?.isOwner)}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  );
}
