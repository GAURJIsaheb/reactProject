import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type{ Task } from "@/types/task";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
}

export default function ViewTaskDialog({ open, onOpenChange, task }: Props) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-md max-h-[70vh] overflow-y-auto p-6">

    <DialogHeader>
      <DialogTitle>Task Info</DialogTitle>
    </DialogHeader>

    <div className="space-y-3 text-sm">

      <div><b>Text:</b> {task.text}</div>
      <div><b>User:</b> {task.userEmail}</div>
      <div>
        <b>Created:</b>{" "}
        {new Date(task.createdAt).toLocaleString()}
      </div>

      {task.image && (
        <img
          src={task.image}
          className="rounded max-h-60 object-contain mx-auto"
        />
      )}

    </div>

  </DialogContent>
</Dialog>

  );
}
