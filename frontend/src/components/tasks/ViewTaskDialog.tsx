import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Task } from "@/types/task";
import { User, Clock, Wifi, WifiOff } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
}

export default function ViewTaskDialog({ open, onOpenChange, task }: Props) {
  if (!task) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        .vtd-overlay [role="dialog"] {
          background: #0c0e1a !important;
          border: 1px solid rgba(99,102,241,0.2) !important;
          border-radius: 24px !important;
          box-shadow:
            0 0 0 1px rgba(99,102,241,0.1),
            0 0 60px rgba(99,102,241,0.12),
            0 40px 80px rgba(0,0,0,0.6) !important;
          overflow: hidden !important;
          font-family: 'Syne', sans-serif !important;
        }

        .vtd-glow-bar {
          height: 2px;
          background: linear-gradient(90deg, transparent, #6366f1, #ec4899, #06b6d4, transparent);
          margin: -1px -1px 0;
          position: relative;
        }

        .vtd-title {
          font-size: 20px; font-weight: 800; letter-spacing: -0.3px;
          background: linear-gradient(135deg, #e8eaf0, #a5b4fc);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .vtd-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 600;
        }
        .vtd-badge.synced {
          background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25);
          color: #6ee7b7;
        }
        .vtd-badge.pending {
          background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25);
          color: #fde047;
          animation: vtdPendingPulse 2s ease-in-out infinite;
        }
        @keyframes vtdPendingPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }

        .vtd-field {
          padding: 14px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
        }

        .vtd-field-label {
          display: flex; align-items: center; gap: 7px;
          font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: #4b5563; margin-bottom: 8px;
        }

        .vtd-field-label svg { opacity: 0.7; }

        .vtd-field-value {
          font-size: 14px; font-weight: 600; color: #d1d5db;
          line-height: 1.5;
        }

        .vtd-field-value.mono {
          font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #9ca3af;
        }

        .vtd-task-text {
          font-size: 16px; font-weight: 700; color: #e8eaf0; line-height: 1.5;
        }

        .vtd-img-wrap {
          border-radius: 16px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          position: relative;
        }

        .vtd-img-wrap::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4));
          z-index: 1; pointer-events: none;
        }

        .vtd-img {
          width: 100%; max-height: 260px;
          object-fit: cover; display: block;
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg vtd-overlay">
          <div className="vtd-glow-bar" />

          <DialogHeader style={{ paddingTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <DialogTitle className="vtd-title">Task Details</DialogTitle>
              <span className={`vtd-badge ${task.syncStatus === "synced" ? "synced" : "pending"}`}>
                {task.syncStatus === "synced"
                  ? <><Wifi size={11} /> Synced</>
                  : <><WifiOff size={11} /> Pending</>}
              </span>
            </div>
          </DialogHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>

            {/* Task text */}
            <div className="vtd-field">
              <div className="vtd-field-label">Task</div>
              <div className="vtd-task-text">{task.text}</div>
            </div>

            {/* User */}
            <div className="vtd-field">
              <div className="vtd-field-label">
                <User size={12} /> Owner
              </div>
              <div className="vtd-field-value mono">{task.userEmail}</div>
            </div>

            {/* Created */}
            <div className="vtd-field">
              <div className="vtd-field-label">
                <Clock size={12} /> Created
              </div>
              <div className="vtd-field-value mono">
                {new Date(task.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Image */}
            {task.image && (
              <div className="vtd-img-wrap">
                <img src={task.image} className="vtd-img" alt="task attachment" />
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}