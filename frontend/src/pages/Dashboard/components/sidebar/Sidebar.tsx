import { useState, useEffect, useRef } from "react";
import {Anchor,Moon,Sun,LogOut,Menu,X,Calendar,LayoutDashboard,ChevronLeft,ChevronRight,Camera,LoaderCircle,Trash2,RefreshCw,} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/zustand/authStore";
import { uploadProfileAvatar } from "@/services/auth.service";
import WorkspaceSelector from "./WorkspaceSelector";
import NotificationsBell from "./NotificationsBell";
import InviteModal from "./InviteModal";
import type { HeaderProps } from "./types";

const TRANSITION = "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)";

type SidebarExtraProps = {
  onCollapseChange?: (collapsed: boolean) => void;
};

type SidebarNavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const NAV_ITEMS: SidebarNavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/calendar", label: "Calendar", icon: Calendar },
];

function SectionLabel({ show, children }: { show: boolean; children: string }) {
  if (!show) return null;
  return <div className="sidebar-section-label">{children}</div>;
}

// ─── Avatar Preview Modal ─────────────────────────────────────────────────────
function AvatarPreviewModal({
  avatarUrl,
  initial,
  onClose,
  onRemove,
  onChangeClick,
}: {
  avatarUrl: string | null;
  initial: string;
  onClose: () => void;
  onRemove: () => void;
  onChangeClick: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-5 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl w-72"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Big avatar preview */}
        <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-violet-400/40 flex items-center justify-center bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 text-4xl font-semibold select-none shadow-lg">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            initial
          )}
        </div>

        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Profile Photo
        </p>

        {/* Actions */}
        <div className="flex gap-3 w-full">
          <button
            onClick={() => {
              onChangeClick();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={14} />
            Change
          </button>
          <button
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-red-200 dark:border-red-800 py-2 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <Trash2 size={14} />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Avatar Button ────────────────────────────────────────────────────────────
function AvatarButton({
  avatarUrl,
  initial,
  isUploading,
  size = "md",
  onUploadClick,
  onPreviewClick,
}: {
  avatarUrl: string | null;
  initial: string;
  isUploading: boolean;
  size?: "sm" | "md";
  onUploadClick: () => void;
  onPreviewClick: () => void;
}) {
  const dim = size === "sm" ? "w-8 h-8 text-xs" : "w-12 h-12 text-sm";

  return (
    <button
      type="button"
      title="Profile photo"
      disabled={isUploading}
      onClick={avatarUrl ? onPreviewClick : onUploadClick}
      className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-60"
    >
      {/* Gradient ring on hover */}
      <span
        className="pointer-events-none absolute -inset-0.75 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          background:
            "linear-gradient(white, white) padding-box, linear-gradient(135deg, #7c3aed, #0f9b6e) border-box",
          border: "2px solid transparent",
        }}
      />

      {/* Avatar shell */}
      <span
        className={`relative flex items-center justify-center rounded-full overflow-hidden font-medium bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 transition-transform duration-200 group-hover:scale-105 ${dim}`}
      >
        {isUploading ? (
          <LoaderCircle size={14} className="animate-spin text-violet-500" />
        ) : avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          initial
        )}
      </span>

      {/* Hover overlay */}
      {!isUploading && (
        <span className="pointer-events-none absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Camera size={12} className="text-white" />
        </span>
      )}
    </button>
  );
}

function SidebarUserPanel({
  showExpanded,
  userName,
  role,
  avatarUrl,
  avatarInitial,
  isUploadingAvatar,
  onUploadClick,
  onPreviewClick,
}: {
  showExpanded: boolean;
  userName?: string | null;
  role?: string | null;
  avatarUrl: string | null;
  avatarInitial: string;
  isUploadingAvatar: boolean;
  onUploadClick: () => void;
  onPreviewClick: () => void;
}) {
  if (!userName) return null;

  if (showExpanded) {
    return (
      <div className="sidebar-user-block flex items-center gap-3 px-1 py-1">
        <AvatarButton
          avatarUrl={avatarUrl}
          initial={avatarInitial}
          isUploading={isUploadingAvatar}
          size="md"
          onUploadClick={onUploadClick}
          onPreviewClick={onPreviewClick}
        />
        <div className="sidebar-user-info min-w-0">
          <div className="sidebar-user-name truncate">{userName}</div>
          <div className="sidebar-user-role truncate">{role}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-1">
      <AvatarButton
        avatarUrl={avatarUrl}
        initial={avatarInitial}
        isUploading={isUploadingAvatar}
        size="sm"
        onUploadClick={onUploadClick}
        onPreviewClick={onPreviewClick}
      />
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const currentOption = workspaceOptions.find((o) => o.value === workspace);
  const currentWsId =
    (currentOption as typeof currentOption & { id?: string })?.id ?? workspace;
  const currentWsLabel = currentOption?.label ?? workspace;

  const role = useAuthStore((state) => state.role);
  const token = useAuthStore((state) => state.token);
  const avatarUrl = useAuthStore((state) => state.avatarUrl);
  const setAvatarUrl = useAuthStore((state) => state.setAvatarUrl);
  const avatarInitial = userName?.charAt(0).toUpperCase() ?? "?";

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => { if (mq.matches) setMobileOpen(false); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    onCollapseChange?.(collapsed);
    document.documentElement.setAttribute(
      "data-sidebar-collapsed",
      String(collapsed)
    );
  }, [collapsed, onCollapseChange]);

  const isActive = (path: string) => location.pathname === path;

  const handleAvatarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !token) return;

    setIsUploadingAvatar(true);
    try {
      const data = await uploadProfileAvatar(file, token);
      setAvatarUrl(data.user.avatarUrl ?? null);
      toast.success("Profile image updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Avatar upload failed"
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    toast.success("Profile image removed");
  };

  const sidebarContent = (isMobile: boolean) => {
    const showExpanded = !collapsed || isMobile;

    return (
      <div className="sidebar-inner flex flex-col h-full">
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void handleAvatarFileChange(e)}
        />

        <div className="sidebar-logo-block">
          <div className="sidebar-logo-icon">
            <Anchor size={18} />
          </div>
          {showExpanded && <span className="sidebar-logo-text">FlowTask</span>}
        </div>

        {showExpanded && (
          <div className="sidebar-section">
            <SectionLabel show={showExpanded}>Workspace</SectionLabel>
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

        <div className="sidebar-section">
          <SectionLabel show={showExpanded}>Navigation</SectionLabel>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`sidebar-nav-item ${isActive(item.path) ? "sidebar-nav-item--active" : ""}`}
                  title={item.label}
                >
                  <Icon size={18} />
                  {showExpanded && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-section">
          <SectionLabel show={showExpanded}>Notifications</SectionLabel>
          <div className={!showExpanded ? "sidebar-center-item" : ""}>
            <NotificationsBell
              notifications={notifications}
              onMarkAllRead={onMarkAllRead}
              onDismissNotification={onDismissNotification}
            />
          </div>
        </div>

        <div className="sidebar-spacer flex-1" />

        <div className="sidebar-bottom-section">
          <div
            className={`sidebar-theme-toggle ${!showExpanded ? "sidebar-theme-toggle--collapsed" : ""}`}
            onClick={toggleTheme}
            title="Toggle theme"
          >
            <div className="sidebar-theme-track" data-theme={theme}>
              <div className="sidebar-theme-thumb">
                {theme === "dark" ? <Moon size={12} /> : <Sun size={12} />}
              </div>
            </div>
            {showExpanded && (
              <span className="sidebar-theme-label">
                {theme === "dark" ? "Dark mode" : "Light mode"}
              </span>
            )}
          </div>

          <SidebarUserPanel
            showExpanded={showExpanded}
            userName={userName}
            role={role}
            avatarUrl={avatarUrl}
            avatarInitial={avatarInitial}
            isUploadingAvatar={isUploadingAvatar}
            onUploadClick={() => avatarInputRef.current?.click()}
            onPreviewClick={() => setShowAvatarPreview(true)}
          />

          <button
            onClick={logout}
            className="sidebar-logout-btn"
            title="Logout"
          >
            <LogOut size={16} />
            {showExpanded && <span>Logout</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Hamburger */}
      <button
        className="sidebar-hamburger"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={`sidebar sidebar--desktop ${collapsed ? "sidebar--collapsed" : ""}`}
        style={{ transition: TRANSITION }}
      >
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        {sidebarContent(false)}
      </aside>

      {/* Mobile sidebar */}
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

      {/* Avatar preview modal */}
      {showAvatarPreview && (
        <AvatarPreviewModal
          avatarUrl={avatarUrl}
          initial={avatarInitial}
          onClose={() => setShowAvatarPreview(false)}
          onRemove={handleRemoveAvatar}
          onChangeClick={() => avatarInputRef.current?.click()}
        />
      )}

      {/* Invite modal */}
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
