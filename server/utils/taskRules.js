export const SUBTASKS_INCOMPLETE_ERROR = {
  error: "Complete all subtasks before completing this task",
  code: "SUBTASKS_INCOMPLETE",
};

export function hasIncompleteSubtasks(subtasks) {
  return Array.isArray(subtasks) && subtasks.some((subtask) => !subtask.completed);
}

export function canCompleteTask(subtasks) {
  return !hasIncompleteSubtasks(subtasks);
}
