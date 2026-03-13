export interface ReminderEvent {
  id:        string;
  taskId:    string;
  taskText:  string;
  dueAt:     number;
  workspace: string;
  completed: boolean;
}