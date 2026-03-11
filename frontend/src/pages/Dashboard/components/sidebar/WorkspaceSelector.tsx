import { useState, useRef, useEffect } from "react";
import { LoaderCircle, Plus, Trash2, X, UserPlus } from "lucide-react";
import EmojiPicker, { Theme, type EmojiClickData } from "emoji-picker-react";
import type { WorkspaceOption } from "@/hooks/useTasksEngine";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

const DEFAULT_WORKSPACE_EMOJI = "🗂️";

type Props = {
  workspace: string;
  setWorkspace: (value: string) => void;
  workspaceOptions: WorkspaceOption[];
  onAddWorkspace: (name: string, emoji: string) => void;
  onDeleteWorkspace: () => Promise<boolean>;
  isDeletingWorkspace: boolean;
  onInvite?: () => void;
  theme: string;
};

export default function WorkspaceSelector({
  workspace,
  setWorkspace,
  workspaceOptions,
  onAddWorkspace,
  onDeleteWorkspace,
  isDeletingWorkspace,
  onInvite,
  theme,
}: Props) {
  const [showAddWorkspaceCard, setShowAddWorkspaceCard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceEmoji, setNewWorkspaceEmoji] = useState(DEFAULT_WORKSPACE_EMOJI);

  const addWorkspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddWorkspaceCard && !showDeleteConfirm) return;

    const handler = (event: MouseEvent) => {
      if (addWorkspaceRef.current && !addWorkspaceRef.current.contains(event.target as Node)) {
        setShowAddWorkspaceCard(false);
        setShowEmojiPicker(false);
        setShowDeleteConfirm(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAddWorkspaceCard, showDeleteConfirm]);

  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [workspace]);

  const handleCreateWorkspace = () => {
    const name = newWorkspaceName.trim();
    if (!name) return;

    onAddWorkspace(name, newWorkspaceEmoji);
    setNewWorkspaceName("");
    setNewWorkspaceEmoji(DEFAULT_WORKSPACE_EMOJI);
    setShowEmojiPicker(false);
    setShowAddWorkspaceCard(false);
  };

  const handleDeleteWorkspace = async () => {
    const deleted = await onDeleteWorkspace();
    if (deleted) setShowDeleteConfirm(false);
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setNewWorkspaceEmoji(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const currentOption = workspaceOptions.find((option) => option.value === workspace) ?? null;
  const isDefaultWorkspace = workspace === "personal" || workspace === "professional";
  const canDeleteWorkspace =
    !!currentOption &&
    !isDefaultWorkspace &&
    ((currentOption.memberCount ?? 1) <= 1 || currentOption.isOwner === true);

  return (
    <div ref={addWorkspaceRef} className="sidebar-ws-selector">
      <select
        value={workspace}
        onChange={(event) => {
          setWorkspace(event.target.value);
          setShowAddWorkspaceCard(false);
        }}
        className="sidebar-ws-select"
      >
        {workspaceOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.emoji} {option.label}
          </option>
        ))}
      </select>

      <div className="sidebar-ws-actions">
        <button
          type="button"
          onClick={() => {
            setShowAddWorkspaceCard((prev) => !prev);
            setShowEmojiPicker(false);
            setShowDeleteConfirm(false);
          }}
          className="sidebar-ws-action-btn sidebar-ws-action-btn--add"
        >
          <Plus size={14} />
          <span>Add Workspace</span>
        </button>

        {!isDefaultWorkspace && onInvite && (
          <button
            type="button"
            onClick={onInvite}
            className="sidebar-ws-action-btn sidebar-ws-action-btn--invite"
            title="Invite collaborator"
          >
            <UserPlus size={14} />
            <span>Invite</span>
          </button>
        )}

        {canDeleteWorkspace && (
          <button
            type="button"
            onClick={() => {
              setShowDeleteConfirm(true);
              setShowAddWorkspaceCard(false);
              setShowEmojiPicker(false);
            }}
            className="sidebar-ws-action-btn sidebar-ws-action-btn--delete"
            title="Delete workspace"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        )}
      </div>

      {/* ─── Add workspace form (stacked vertically) ─── */}
      {showAddWorkspaceCard && (
        <div className="sidebar-ws-form">
          <div className="sidebar-ws-form-row">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="sidebar-ws-emoji-btn"
            >
              {newWorkspaceEmoji}
            </button>

            <input
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleCreateWorkspace();
              }}
              placeholder="Workspace name"
              className="sidebar-ws-name-input"
              autoFocus
            />
          </div>

          <div className="sidebar-ws-form-actions">
            <button
              type="button"
              onClick={handleCreateWorkspace}
              disabled={!newWorkspaceName.trim()}
              className="sidebar-ws-create-btn"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddWorkspaceCard(false);
                setShowEmojiPicker(false);
              }}
              className="sidebar-ws-cancel-btn"
            >
              <X size={14} />
            </button>
          </div>

          {/* Emoji picker — fixed portal */}
          {showEmojiPicker && (
            <div className="sidebar-emoji-portal">
              <EmojiPicker
                width={320}
                height={360}
                onEmojiClick={handleEmojiSelect}
                theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}
        </div>
      )}

      {/* ─── Delete confirm ─── */}
      {showDeleteConfirm && currentOption && (
        <div className="sidebar-ws-delete-confirm">
          <Card className="border-red-400/30 bg-background/95 backdrop-blur shadow-xl">
            <CardHeader className="gap-1 pb-2">
              <CardTitle className="text-sm">Delete workspace</CardTitle>
              <CardDescription className="text-xs">
                All tasks in "{currentOption.label}" will be removed permanently.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground pb-2">
              This cannot be undone.
            </CardContent>
            <CardFooter className="justify-end gap-2 pb-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingWorkspace}
                className="h-8 px-3 rounded-lg border border-border text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteWorkspace()}
                disabled={isDeletingWorkspace}
                className="h-8 min-w-24 px-3 rounded-lg bg-red-500 text-white text-xs font-medium inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDeletingWorkspace ? (
                  <>
                    <LoaderCircle size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
