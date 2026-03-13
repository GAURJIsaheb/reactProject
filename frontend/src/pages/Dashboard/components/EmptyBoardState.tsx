import { useState } from "react";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import {
  WORKSPACE_TEMPLATES,
  type WorkspaceTemplate,
} from "@/shared/data/workspaceTemplates";

interface Props {
  onCreateFirst: () => void;
  onApplyTemplate: (template: WorkspaceTemplate) => Promise<void>;
}

export default function EmptyBoardState({ onCreateFirst, onApplyTemplate }: Props) {
  const [applying, setApplying] = useState<string | null>(null);

  const handleApply = async (template: WorkspaceTemplate) => {
    if (applying) return;
    setApplying(template.id);
    try {
      await onApplyTemplate(template);
    } finally {
      setApplying(null);
    }
  };

  const isDisabled = applying !== null;

  return (
    <div className="empty-board-container">
      {/* Header */}
      <div className="empty-board-header">
        <div className="empty-board-icon">
          <Sparkles size={28} />
        </div>
        <p className="empty-board-title">Get started</p>
        <p className="empty-board-subtitle">
          Start with a blank workspace or pick a template
        </p>
      </div>

      {/* Template grid */}
      <div className="template-grid">
        {/* Blank workspace card */}
        <button
          className="template-card template-card-blank"
          onClick={onCreateFirst}
          disabled={isDisabled}
        >
          <div className="template-card-icon template-card-icon-blank">
            <Plus size={24} />
          </div>
          <div className="template-card-body">
            <p className="template-card-name">Blank Workspace</p>
            <p className="template-card-desc">Start fresh with an empty section</p>
          </div>
        </button>

        {/* Template cards */}
        {WORKSPACE_TEMPLATES.map((tpl) => {
          const totalTasks = tpl.sections.reduce((sum, s) => sum + s.tasks.length, 0);
          const isApplying = applying === tpl.id;

          return (
            <button
              key={tpl.id}
              className={`template-card${isApplying ? " template-card-applying" : ""}`}
              onClick={() => handleApply(tpl)}
              disabled={isDisabled}
            >
              <div
                className="template-card-accent"
                style={{ background: tpl.gradient }}
              />

              <div className="template-card-icon" style={{ background: tpl.gradient }}>
                {isApplying ? (
                  <Loader2 size={22} className="template-spinner" />
                ) : (
                  <span className="template-card-emoji">{tpl.emoji}</span>
                )}
              </div>

              <div className="template-card-body">
                <p className="template-card-name">{tpl.name}</p>
                <p className="template-card-desc">{tpl.description}</p>
                <div className="template-card-meta">
                  <span>{tpl.sections.length} sections</span>
                  <span className="template-meta-dot">·</span>
                  <span>{totalTasks} tasks</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}