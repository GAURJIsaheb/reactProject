import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Task } from "@/types/task";
import { fileToBase64 } from "@/utils/fileToBase64";
import { ImagePlus, Save, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
  onSave: (id: string, text: string, img?: string | null) => void;
}

export default function EditTaskDialog({ open, onOpenChange, task, onSave }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (task) {
      setText(task.text);
      setImage(task.image || null);
      setFileName("");
    }
  }, [task]);

  if (!task) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent
    className="
      sm:max-w-md
      bg-[#0c0e1a]
      border border-pink-500/20
      rounded-3xl
      shadow-[0_0_0_1px_rgba(236,72,153,0.08),0_0_60px_rgba(99,102,241,0.1),0_40px_80px_rgba(0,0,0,0.6)]
      overflow-hidden
      font-['Syne']
    "
  >
    {/* Glow line */}
    <div className="h-0.5 bg-linear-to-r from-transparent via-pink-500 to-transparent -mx-px -mt-px" />

    <DialogHeader className="pt-1">
      <DialogTitle
        className="
          text-[20px] font-extrabold
          bg-linear-to-br from-[#e8eaf0] to-pink-300
          bg-clip-text text-transparent
        "
      >
        Edit Task
      </DialogTitle>
    </DialogHeader>

    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFileName(f.name);
        const b64 = await fileToBase64(f);
        setImage(b64);
      }}
    />

    {/* Text Input */}
    <div>
      <span className="block text-[10px] font-bold tracking-[1.5px] uppercase text-gray-600 mb-2">
        Task Description
      </span>

      <input
        className="
          w-full px-4 py-3.5
          bg-white/5
          border border-white/10
          rounded-[14px]
          text-[#e8eaf0]
          text-[15px] font-semibold
          outline-none
          transition-all duration-200
          focus:border-pink-500/50
          focus:bg-white/10
          focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1),0_0_20px_rgba(236,72,153,0.08)]
          placeholder:text-gray-700
        "
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to get done?"
      />
    </div>

    {/* Image Section */}
    <div>
      <span className="block text-[10px] font-bold tracking-[1.5px] uppercase text-gray-600 mb-2">
        Attachment
      </span>

      <div className="flex gap-4 items-start">
        {/* Preview */}
        <div className="
          w-25 h-25
          rounded-2xl
          border border-white/10
          bg-white/5
          flex items-center justify-center
          overflow-hidden relative shrink-0
        ">
          {image ? (
            <>
              <img
                src={image}
                alt="preview"
                className="w-full h-full object-cover"
              />
              <button
                className="
                  absolute top-1 right-1
                  w-5 h-5 rounded-md
                  bg-red-500/80 hover:bg-red-500
                  text-white text-[10px]
                  flex items-center justify-center
                  transition
                  hover:scale-110
                "
                onClick={() => {
                  setImage(null);
                  setFileName("");
                }}
              >
                <X size={10} />
              </button>
            </>
          ) : (
            <div className="text-gray-700 text-[11px] text-center">
              No image
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col gap-2.5">
          <button
            type="button"
            className="
              flex items-center gap-2
              px-4 py-2.5
              rounded-xl
              bg-white/5
              border border-dashed border-white/20
              text-gray-400 text-[13px] font-semibold
              transition-all
              hover:bg-pink-500/10
              hover:border-pink-500/40
              hover:text-pink-300
            "
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus size={15} />
            {image ? "Change Image" : "Upload Image"}
          </button>

          {fileName && (
            <div className="
              font-mono text-[11px]
              text-gray-600
              px-2.5 py-1.5
              bg-white/5
              border border-white/10
              rounded-lg
              truncate
            ">
              📎 {fileName}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Actions */}
    <div className="flex gap-2.5 mt-1">

      <button
        className="
          flex-0.5
          py-3.5
          px-3
          bg-lienar-to-br from-pink-500 to-violet-500
          rounded-[14px]
          text-white font-extrabold text-[14px]
          tracking-[0.3px]
          flex items-center justify-center gap-2
          shadow-[0_0_24px_rgba(236,72,153,0.35)]
          transition
          hover:scale-[1.02]
          hover:shadow-[0_0_36px_rgba(236,72,153,0.5)]
          active:scale-[0.99]
        "
        onClick={() => {
          const trimmed = text.trim();
          if (!trimmed) return;
          onSave(task.id, trimmed, image);
          onOpenChange(false);
        }}
      >
        <Save size={14} />
        Save
      </button>
    </div>
  </DialogContent>
</Dialog>

    </>
  );
}