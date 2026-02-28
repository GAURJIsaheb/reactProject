import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import type { Task } from "@/shared/types/task";
import { ImagePlus, Save, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
  // imageFile is the raw File if user picked one, removeImage signals deletion
  onSave: (id: string, text: string, imageFile?: File | null, removeImage?: boolean) => void;
}

export default function EditTaskDialog({ open, onOpenChange, task, onSave }: Props) {
  const fileRef     = useRef<HTMLInputElement | null>(null);
  const [text, setText]           = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null); // local object URL
  const [removedExisting, setRemovedExisting] = useState(false);

  useEffect(() => {
    if (task) {
      setText(task.text);
      setImageFile(null);
      setPreview(task.imageUrl ?? task.image ?? null); // show existing signed URL
      setRemovedExisting(false);
    }
  }, [task]);

  // Cleanup object URLs to avoid memory leaks
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

  const handleRemove = () => {
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setImageFile(null);
    setPreview(null);
    setRemovedExisting(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0c0e1a] border border-pink-500/20 rounded-3xl shadow-[0_0_0_1px_rgba(236,72,153,0.08),0_0_60px_rgba(99,102,241,0.1),0_40px_80px_rgba(0,0,0,0.6)] overflow-hidden font-['Syne']">
        <div className="h-0.5 bg-linear-to-r from-transparent via-pink-500 to-transparent -mx-px -mt-px" />

        <DialogHeader className="pt-1">
          <DialogTitle className="text-[20px] font-extrabold bg-linear-to-br from-[#e8eaf0] to-pink-300 bg-clip-text text-transparent">
            Edit Task
          </DialogTitle>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Text Input */}
        <div>
          <span className="block text-[10px] font-bold tracking-[1.5px] uppercase text-gray-600 mb-2">
            Task Description
          </span>
          <input
            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-[14px] text-[#e8eaf0] text-[15px] font-semibold outline-none transition-all duration-200 focus:border-pink-500/50 focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)] placeholder:text-gray-700"
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
            <div className="w-25 h-25 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden relative shrink-0">
              {preview ? (
                <>
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  <button
                    className="absolute top-1 right-1 w-5 h-5 rounded-md bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition hover:scale-110"
                    onClick={handleRemove}
                  >
                    <X size={10} />
                  </button>
                </>
              ) : (
                <div className="text-gray-700 text-[11px] text-center">No image</div>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-2.5">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-dashed border-white/20 text-gray-400 text-[13px] font-semibold transition-all hover:bg-pink-500/10 hover:border-pink-500/40 hover:text-pink-300"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus size={15} />
                {preview ? "Change Image" : "Upload Image"}
              </button>
              {imageFile && (
                <div className="font-mono text-[11px] text-gray-600 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg truncate">
                  📎 {imageFile.name}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 mt-1">
          <button
            className="flex-1 py-3.5 px-3 bg-linear-to-br from-pink-500 to-violet-500 rounded-[14px] text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(236,72,153,0.35)] transition hover:scale-[1.02] hover:shadow-[0_0_36px_rgba(236,72,153,0.5)] active:scale-[0.99]"
            onClick={() => {
              const trimmed = text.trim();
              if (!trimmed) return;
              onSave(task.id, trimmed, imageFile, removedExisting);
              onOpenChange(false);
            }}
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}