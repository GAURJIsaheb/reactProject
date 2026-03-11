import { Paperclip, Plus, Hash, CalendarDays, Clock3 } from "lucide-react";
import { useRef, forwardRef, useMemo } from "react";

type Props = {
  input: string;
  setInput: (v: string) => void;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  labelsInput: string;
  setLabelsInput: (v: string) => void;
  reminderDate: string;
  setReminderDate: (v: string) => void;
  reminderTime: string;
  setReminderTime: (v: string) => void;
  handleAdd: () => void;
  sectionName?: string;
};

const InputSection = forwardRef<HTMLInputElement, Props>(
  ({
    input,
    setInput,
    imageFile,
    setImageFile,
    labelsInput,
    setLabelsInput,
    reminderDate,
    setReminderDate,
    reminderTime,
    setReminderTime,
    handleAdd,
    sectionName,
  }, ref) => {
    const fileRef = useRef<HTMLInputElement>(null);
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

    return (
      <div style={{ position: "relative", marginBottom: "2rem" }}>

        {sectionName && (
          <div style={{
            position: "absolute",
            top: "-12px",
            left: "16px",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 10px",
            borderRadius: "999px",
            background: "#12121f",
            border: "1px solid rgba(99,102,241,0.6)",
            boxShadow: "0 0 12px rgba(99,102,241,0.4)",
          }}>
            <Hash size={9} color="#a5b4fc" strokeWidth={3} />
            <span style={{
              fontSize: "10.5px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              background: "linear-gradient(to right, #a5b4fc, #c4b5fd)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1,
            }}>
              Adding Task in {sectionName}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-white/5 border border-border backdrop-blur-xl">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setImageFile(f);
            }}
          />

          <button
            onClick={() => fileRef.current?.click()}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-card border border-border text-foreground hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-400/40 transition"
          >
            <Paperclip size={16} />
          </button>

          {imageFile && (
            <div className="px-2.5 py-1 rounded-md text-[11px] font-mono truncate max-w-20 bg-indigo-500/20 border border-indigo-400/40 text-indigo-300">
              📎 {imageFile.name}
            </div>
          )}

          <input
            ref={ref}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What needs to get done?"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-gray-500"
          />

          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-linear-to-br from-indigo-500 to-violet-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:scale-105 hover:shadow-[0_0_30px_rgba(99,102,241,0.7)] active:scale-95 transition"
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        <div className="mt-2 px-1">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 sm:min-w-52">
              <Hash size={13} className="text-foreground" />
              <input
                value={labelsInput}
                onChange={(e) => setLabelsInput(e.target.value)}
                placeholder="Labels: work, urgent"
                className="w-full bg-background text-[12px] text-foreground outline-none placeholder:text-gray-500"
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2">
              <CalendarDays size={13} className="text-foreground outline-none border border-border" />
              <input
                type="date"
                value={reminderDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setReminderDate(e.target.value)}
                className="bg-background text-[12px] text-foreground outline-none"
              />
            </div>

            <div className="flex items-center text-foreground gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 min-w-44">
              <Clock3 size={13} className="text-foreground" />
              <select
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full bg-background text-[12px] text-foreground outline-none scheme-light dark:scheme:dark [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100"
              >
                <option value="">Reminder time</option>
                {reminderTimeOptions.map((option) => (
                  <option  key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

InputSection.displayName = "InputSection";

export default InputSection;
