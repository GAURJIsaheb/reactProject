import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type{ Task } from "@/types/task";
import { fileToBase64 } from "@/utils/fileToBase64";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
  onSave: (id: string, text: string, img?: string | null) => void;
}

export default function EditTaskDialog({
  open,
  onOpenChange,
  task,
  onSave
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("No file chosen");


  useEffect(() => {
  if (!task) return;

  setText(task.text);
  setImage(task.image ?? null);
}, [task?.id]);


  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md  gap-0 [&>button]:[&>button]:right-0">

        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <Input
          value={text}
          onChange={e => setText(e.target.value)}
        />

        <div className="flex items-start gap-4">

  {/* image preview */}
  <div className="w-24 h-24 border rounded-md flex items-center justify-center overflow-hidden bg-muted">
    {image ? (
      <img
        src={image}
        className="w-full h-full object-cover"
      />
    ) : (
      <span className="text-xs text-muted-foreground">
        No Image
      </span>
    )}
  </div>

  {/* button + filename column */}
  <div className="flex flex-col gap-2">

    {/* hidden input */}
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

    {/* custom button */}
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      className="px-4 py-2 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
    >
      Choose Image
    </button>

    {/* filename text */}
    <span className="text-xs text-muted-foreground max-w-40 truncate">
      {image ? fileName : "No file chosen"}
    </span>

  </div>
</div>

        <Button
          onClick={() => {
            onSave(task.id, text, image);
            onOpenChange(false);
          }}
        >
          Save
        </Button>

      </DialogContent>
    </Dialog>
  );
}
