import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import EmojiPicker, { Theme, type EmojiClickData } from "emoji-picker-react";
import type { WorkspaceOption } from "@/hooks/useTasksEngine";

const DEFAULT_WORKSPACE_EMOJI = "🗂️";

type Props = {
  workspace: string;
  setWorkspace: (v: string) => void;
  workspaceOptions: WorkspaceOption[];
  onAddWorkspace: (name: string, emoji: string) => void;
  theme: string;
};

export default function WorkspaceSelector({
  workspace,
  setWorkspace,
  workspaceOptions,
  onAddWorkspace,
  theme,
}: Props) {
  const [showAddWorkspaceCard, setShowAddWorkspaceCard] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceEmoji, setNewWorkspaceEmoji] = useState(
    DEFAULT_WORKSPACE_EMOJI
  );

  const addWorkspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddWorkspaceCard) return;

    const handler = (e: MouseEvent) => {
      if (
        addWorkspaceRef.current &&
        !addWorkspaceRef.current.contains(e.target as Node)
      ) {
        setShowAddWorkspaceCard(false);
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAddWorkspaceCard]);

  const handleCreateWorkspace = () => {
    const name = newWorkspaceName.trim();
    if (!name) return;

    onAddWorkspace(name, newWorkspaceEmoji);

    setNewWorkspaceName("");
    setNewWorkspaceEmoji(DEFAULT_WORKSPACE_EMOJI);
    setShowEmojiPicker(false);
    setShowAddWorkspaceCard(false);
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setNewWorkspaceEmoji(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div ref={addWorkspaceRef} className="relative flex items-center gap-2">
      <select
        value={workspace}
        onChange={(e) => {
          setWorkspace(e.target.value);
          setShowAddWorkspaceCard(false);
        }}
        className="h-10 px-2 py-2 text-[13px] font-semibold rounded-xl
        bg-background border border-border text-foreground outline-none"
      >
        {workspaceOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.emoji} {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => {
          setShowAddWorkspaceCard((prev) => !prev);
          setShowEmojiPicker(false);
        }}
        className="h-10 inline-flex items-center gap-1.5 px-3 rounded-xl text-[12px]
        border border-indigo-400/40 bg-indigo-500/15 hover:bg-indigo-500/25"
      >
        <Plus size={14} />
        Add Workspace
      </button>

      {showAddWorkspaceCard && (
        <div
          className="relative z-30 flex items-center gap-2 rounded-2xl
          border border-white/15 bg-[#121625] px-2.5 py-2"
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="h-10 w-10 rounded-xl border border-border
              bg-background text-lg flex items-center justify-center"
            >
              {newWorkspaceEmoji}
            </button>

            {showEmojiPicker && (
              <div className="absolute top-[calc(100%+8px)] left-0 z-20">
                <EmojiPicker
                  width={340}
                  height={380}
                  onEmojiClick={handleEmojiSelect}
                  theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
                  lazyLoadEmojis
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>

          <input
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateWorkspace();
            }}
            placeholder="Add name of workspace"
            className="h-10 w-52 rounded-xl border border-border bg-background px-3"
          />

          <button
            type="button"
            onClick={handleCreateWorkspace}
            disabled={!newWorkspaceName.trim()}
            className="h-10 px-3 rounded-xl text-[12px] font-semibold
            bg-indigo-500 text-white disabled:opacity-50"
          >
            Add
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAddWorkspaceCard(false);
              setShowEmojiPicker(false);
            }}
            className="h-10 w-10 rounded-xl border border-border flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}