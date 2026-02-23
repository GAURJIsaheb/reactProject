// Archive.tsx
// Full archive UI — multi-select, encrypt & archive, restore single/all
// Offline-first, AES-GCM encrypted, IndexDB + MongoDB

import { useEffect, useState} from "react";
import {
  Archive as ArchiveIcon,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
} from "lucide-react";
import type { Task } from "@/types/task";
import { useArchiveEngine } from "./archiveengine";

interface ArchiveProps {
  tasks: Task[];
  onTasksChanged: () => Promise<void>;
}

export default function Archive({ tasks, onTasksChanged }: ArchiveProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());

  const {
    archivedTasks,
    archivedCount,
    isArchiving,
    isRestoring,
    progress,
    archiveTasks,
    restoreTasks,
    restoreAllTasks,
    loadArchived,
  } = useArchiveEngine(onTasksChanged);

  useEffect(() => {
    if (open) loadArchived();
  }, [open, loadArchived]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Only completed tasks eligible
  const eligibleTasks = tasks.filter((t) => t.completed && !t.archived);
  const selectedTasks = eligibleTasks.filter((t) => selectedIds.has(t.id));

  const selectAll = () => setSelectedIds(new Set(eligibleTasks.map((t) => t.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleArchive = async () => {
    if (selectedTasks.length === 0) return;
    await archiveTasks(selectedTasks);
    setSelectedIds(new Set());
  };

  const handleRestoreSingle = async (id: string) => {
    setRestoringIds((prev) => new Set(prev).add(id));
    await restoreTasks([id]);
    setRestoringIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const busy = isArchiving || isRestoring;

  return (
    <div className="w-full mb-5">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-card border border-border text-foreground text-sm font-medium hover:bg-amber-500/10 hover:border-amber-400/40 hover:text-amber-300 transition-all duration-200"
      >
        <ArchiveIcon size={15} className="opacity-70" />
        <span>Archive</span>
        {archivedCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 border border-amber-400/30 text-amber-300">
            {archivedCount}
          </span>
        )}
        {open ? (
          <ChevronUp size={14} className="ml-auto opacity-50" />
        ) : (
          <ChevronDown size={14} className="ml-auto opacity-50" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="mt-3 rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-amber-400" />
              <span className="text-sm font-semibold text-foreground">Archive Vault</span>
              <span className="text-[10px] text-muted-foreground ml-1 font-mono">AES-GCM encrypted</span>
            </div>
            {archivedCount > 0 && (
              <button
                onClick={restoreAllTasks}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-emerald-300 font-medium bg-emerald-500/10 border border-emerald-400/30 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <RotateCcw size={12} />
                Restore All
              </button>
            )}
          </div>

          {/* Select tasks to archive */}
          {eligibleTasks.length > 0 && (
            <div className="px-5 py-4 border-b border-border/60">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Completed — select to archive
                </p>
                <div className="flex gap-3">
                  {selectedIds.size > 0 && (
                    <button
                      onClick={clearSelection}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={selectAll}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
                  >
                    Select all
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                {eligibleTasks.map((task) => {
                  const isSelected = selectedIds.has(task.id);
                  return (
                    <button
                      key={task.id}
                      onClick={() => toggleSelect(task.id)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left border transition-all duration-150 ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-400/40 text-amber-200"
                          : "bg-background/40 border-border/50 text-foreground hover:border-border"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "bg-amber-500 border-amber-500"
                            : "border-border bg-transparent"
                        }`}
                      >
                        {isSelected && (
                          <Check size={10} strokeWidth={3} className="text-white" />
                        )}
                      </div>
                      <span className="text-sm truncate flex-1">{task.text}</span>
                      {task.image && (
                        <div className="w-6 h-6 rounded-md overflow-hidden shrink-0">
                          <img
                            src={task.image}
                            alt=""
                            className="w-full h-full object-cover opacity-70"
                          />
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedIds.size > 0 && (
                <button
                  onClick={handleArchive}
                  disabled={busy}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-sm font-semibold hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isArchiving ? (
                    <>
                      <span className="animate-spin inline-block">⟳</span>
                      Encrypting… {progress}%
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      Archive {selectedIds.size} task{selectedIds.size > 1 ? "s" : ""}
                    </>
                  )}
                </button>
              )}

              {isArchiving && (
                <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {eligibleTasks.length === 0 && archivedCount === 0 && (
            <div className="px-5 py-8 text-center">
              <div className="text-3xl mb-2 opacity-30">🗄</div>
              <p className="text-sm text-muted-foreground">
                Complete some tasks first to archive them.
              </p>
            </div>
          )}

          {/* Archived vault list */}
          {archivedCount > 0 && (
            <div className="px-5 py-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">
                Vault — {archivedCount} encrypted
              </p>

              {isRestoring && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1.5 text-xs text-emerald-400">
                    <span className="animate-spin inline-block">⟳</span>
                    Decrypting… {progress}%
                  </div>
                  <div className="h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {archivedTasks.map((archived) => (
                  <div
                    key={archived.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-background/30 border border-border/40"
                  >
                    <Lock size={13} className="text-amber-400/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground font-mono truncate block">
                        {archived.id.slice(0, 8)}…
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">
                        {new Date(archived.archivedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRestoreSingle(archived.id)}
                      disabled={busy || restoringIds.has(archived.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-emerald-300 font-medium bg-emerald-500/10 border border-emerald-400/20 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                    >
                      {restoringIds.has(archived.id) ? (
                        <span className="animate-spin inline-block">⟳</span>
                      ) : (
                        <Unlock size={11} />
                      )}
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}