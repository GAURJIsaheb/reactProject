import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import type { Task } from "@/shared/types/task";
import { Clock, ImagePlus, Save, User, Wifi, WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
  reminderDueAt: number | null;
  onSave: (
    id: string,
    text: string,
    labels: string[],
    imageFile?: File | null,
    removeImage?: boolean,
    reminderAt?: number | null
  ) => Promise<boolean>;
}

function normalizeLabelsInput(value: string): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const part of value.split(",")) {
    const label = part.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!label) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);

    if (labels.length === 3) break;
  }

  return labels;
}

function toDateInput(dueAt: number | null): string {
  if (!dueAt) return "";
  const date = new Date(dueAt);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toTimeInput(dueAt: number | null): string {
  if (!dueAt) return "";
  const date = new Date(dueAt);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function ViewTaskDialog({
  open,
  onOpenChange,
  task,
  reminderDueAt,
  onSave,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState("");
  const [labelsInput, setLabelsInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removedExisting, setRemovedExisting] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const reminderTimeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (const minute of [0, 30]) {
        const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        const twelveHour = hour % 12 || 12;
        const suffix = hour < 12 ? "AM" : "PM";
        const label = `${twelveHour}:${String(minute).padStart(2, "0")} ${suffix}`;
        options.push({ value, label });
      }
    }
    return options;
  }, []);

  useEffect(() => {
    if (!task) return;
    setText(task.text);
    setLabelsInput((task.labels ?? []).join(", "));
    setImageFile(null);
    setPreview(task.imageUrl ?? task.image ?? null);
    setRemovedExisting(false);
    setReminderDate(toDateInput(reminderDueAt));
    setReminderTime(toTimeInput(reminderDueAt));
  }, [task, reminderDueAt, open]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (!task) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
    setRemovedExisting(false);
  };

  const handleRemoveImage = () => {
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setImageFile(null);
    setPreview(null);
    setRemovedExisting(true);
  };

  const resolveReminderAt = (): number | null => {
    if (!reminderDate && !reminderTime) return null;
    if (!reminderDate || !reminderTime) return NaN;
    const dueAt = new Date(`${reminderDate}T${reminderTime}:00`).getTime();
    return Number.isFinite(dueAt) ? dueAt : NaN;
  };

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSaving) return;
    const labels = normalizeLabelsInput(labelsInput);
    if (labelsInput.trim() && labels.length === 0) {
      toast.error("Add valid labels separated by commas");
      return;
    }
    const reminderAt = resolveReminderAt();
    if (Number.isNaN(reminderAt)) {
      toast.error("Reminder date and time both required");
      return;
    }

    setIsSaving(true);
    const ok = await onSave(task.id, trimmed, labels, imageFile, removedExisting, reminderAt);
    setIsSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
        sm:max-w-lg
        bg-white text-slate-900
        dark:bg-[#0c0e1a] dark:text-slate-100
        border border-slate-200/80 dark:border-indigo-500/20
        rounded-2xl
        overflow-hidden
        shadow-[0_20px_60px_rgba(15,23,42,0.16)]
        dark:shadow-[0_0_0_1px_rgba(99,102,241,0.1),0_0_60px_rgba(99,102,241,0.12),0_40px_80px_rgba(0,0,0,0.6)]
        font-[Syne]
      "
      >
        <div className="h-0.5 bg-linear-to-r from-transparent via-indigo-500 to-transparent -mx-px -mt-px" />

        <DialogHeader className="pt-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle className="text-[30px] font-bold tracking-[-0.3px] bg-linear-to-br from-slate-900 to-indigo-600 bg-clip-text text-transparent dark:from-[#e8eaf0] dark:to-indigo-300">
              Task Details
            </DialogTitle>

            {task.syncStatus === "synced" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300">
                <Wifi size={11} /> Synced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-yellow-300 animate-pulse">
                <WifiOff size={11} /> Pending
              </span>
            )}
          </div>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col gap-3 mt-1">
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 dark:bg-white/5 dark:border-white/10">
            <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-slate-500 dark:text-gray-500 mb-2">
              Task
            </div>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full resize-none rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-[15px] font-semibold text-slate-900 outline-none focus:border-indigo-400/60 dark:bg-white/5 dark:border-white/10 dark:text-[#e8eaf0]"
            />
            <input
              value={labelsInput}
              onChange={(e) => setLabelsInput(e.target.value)}
              placeholder="Labels: bug, client, follow-up"
              className="mt-3 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-900 outline-none focus:border-indigo-400/60 dark:bg-white/5 dark:border-white/10 dark:text-[#e8eaf0]"
            />
            <p className="mt-2 text-[11px] text-slate-500 dark:text-gray-400">
              Up to 3 labels. Separate with commas.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 dark:bg-white/5 dark:border-white/10">
            <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-slate-500 dark:text-gray-500 mb-2">
              Reminder
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="rounded-lg bg-white border border-slate-200 px-2.5 py-2 text-[12px] text-slate-900 outline-none focus:border-indigo-400/60 dark:bg-white/5 dark:border-white/10 dark:text-[#e8eaf0]"
              />
              <select
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="rounded-lg bg-white border border-slate-200 px-2.5 py-2 text-[12px] text-slate-900 outline-none focus:border-indigo-400/60 dark:bg-white/5 dark:border-white/10 dark:text-[#e8eaf0] scheme-light dark:scheme-dark] [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100"
              >
                <option value="">Reminder time</option>
                {reminderTimeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 dark:bg-white/5 dark:border-white/10">
            <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-slate-500 dark:text-gray-500 mb-2">
              Attachment
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-44 h-44 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden relative shrink-0 dark:border-white/10 dark:bg-white/5">
                {preview ? (
                  <>
                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 w-5 h-5 rounded-md bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition"
                      onClick={handleRemoveImage}
                    >
                      <X size={10} />
                    </button>
                  </>
                ) : (
                  <div className="text-slate-500 dark:text-gray-500 text-[11px] text-center">No image</div>
                )}
              </div>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-dashed border-slate-300 text-slate-600 text-[13px] font-semibold transition-all hover:bg-indigo-500/10 hover:border-indigo-400/40 hover:text-indigo-500 dark:bg-white/5 dark:border-white/20 dark:text-gray-400 dark:hover:text-indigo-300"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus size={15} />
                {preview ? "Change Image" : "Upload Image"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 dark:bg-white/5 dark:border-white/10">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[1.5px] uppercase text-slate-500 dark:text-gray-500 mb-1">
                <User size={12} className="opacity-70" /> Owner
              </div>
              <div className="text-[12px] font-medium text-slate-600 dark:text-gray-400 font-mono truncate">
                {task.userEmail}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 dark:bg-white/5 dark:border-white/10">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[1.5px] uppercase text-slate-500 dark:text-gray-500 mb-1">
                <Clock size={12} className="opacity-70" /> Created
              </div>
              <div className="text-[12px] font-medium text-slate-600 dark:text-gray-400 font-mono">
                {new Date(task.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-pink-500 text-white text-[15px]  "
          >
            <Save size={14} />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
