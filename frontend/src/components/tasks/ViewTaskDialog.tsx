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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
        sm:max-w-lg 
        bg-[#0c0e1a] 
        border border-indigo-500/20 
        rounded-2xl 
        overflow-hidden 
        shadow-[0_0_0_1px_rgba(99,102,241,0.1),0_0_60px_rgba(99,102,241,0.12),0_40px_80px_rgba(0,0,0,0.6)]
        font-[Syne]
      "
      >
        {/* glow bar */}
        <div className="h-0.5 bg-linear-to-r from-transparent via-indigo-500  to-transparent -mx-px -mt-px" />

        <DialogHeader className="pt-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle
              className="
              text-[20px] font-extrabold tracking-[-0.3px]
              bg-linear-to-br from-[#e8eaf0] to-indigo-300
              bg-clip-text text-transparent
            "
            >
              Task Details
            </DialogTitle>

            {/* status badge */}
            {task.syncStatus === "synced" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                <Wifi size={11} /> Synced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-400/30 bg-amber-400/10 text-yellow-300 animate-pulse">
                <WifiOff size={11} /> Pending
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-1">
          {/* Task text */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-gray-500 mb-2">
              Task
            </div>
            <div className="text-[16px] font-bold text-[#e8eaf0] leading-relaxed">
              {task.text}
            </div>
          </div>

          {/* Owner */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[1.5px] uppercase text-gray-500 mb-2">
              <User size={12} className="opacity-70" /> Owner
            </div>
            <div className="text-[12px] font-medium text-gray-400 font-mono">
              {task.userEmail}
            </div>
          </div>

          {/* Created */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[1.5px] uppercase text-gray-500 mb-2">
              <Clock size={12} className="opacity-70" /> Created
            </div>
            <div className="text-[12px] font-medium text-gray-400 font-mono">
              {new Date(task.createdAt).toLocaleString()}
            </div>
          </div>

          {/* Image */}
          {task.image && (
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <img
                src={task.image}
                alt="task attachment"
                className="w-full max-h-65 object-cover block"
              />
              <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/40 pointer-events-none" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}