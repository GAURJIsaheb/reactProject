import { Paperclip, Plus } from "lucide-react";
import { useRef, forwardRef } from "react";

type Props = {
  input: string;
  setInput: (v: string) => void;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  handleAdd: () => void;
};

const InputSection = forwardRef<HTMLInputElement, Props>(
  ({ input, setInput, imageFile, setImageFile, handleAdd }, ref) => {
    const fileRef = useRef<HTMLInputElement>(null);

    return (
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 mb-8 rounded-2xl
        bg-white/5 border border-border backdrop-blur-xl"
      >
        {/* Hidden file picker */}
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
          className="w-10 h-10 rounded-xl flex items-center justify-center
          bg-card border border-border text-foreground
          hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-400/40 transition"
        >
          <Paperclip size={16} />
        </button>

        {imageFile && (
          <div
            className="px-2.5 py-1 rounded-md text-[11px] font-mono truncate max-w-20
            bg-indigo-500/20 border border-indigo-400/40 text-indigo-300"
          >
            📎 {imageFile.name}
          </div>
        )}

        {/* ref forwarded here so Dashboard can call .focus() on it */}
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
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white
          bg-linear-to-br from-indigo-500 to-violet-500
          shadow-[0_0_20px_rgba(99,102,241,0.5)]
          hover:scale-105 hover:shadow-[0_0_30px_rgba(99,102,241,0.7)]
          active:scale-95 transition"
        >
          <Plus size={16} />
          Add
        </button>
      </div>
    );
  }
);

InputSection.displayName = "InputSection";

export default InputSection;