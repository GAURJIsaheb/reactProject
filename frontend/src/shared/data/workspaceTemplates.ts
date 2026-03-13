export interface TemplateSubtask {
  text: string;
}

export interface TemplateTask {
  text:      string;
  labels?:   string[];
  subtasks?: TemplateSubtask[];
}

export interface TemplateSection {
  title: string;
  tasks: TemplateTask[];
}

export interface WorkspaceTemplate {
  id:          string;
  name:       string;
  emoji:      string;
  description: string;
  gradient:   string;        // CSS gradient for accent
  sections:   TemplateSection[];
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id:          "project-kickoff",
    name:        "Project Kickoff",
    emoji:       "🚀",
    description: "Organize your project with planning, execution & review phases",
    gradient:    "linear-gradient(135deg, #6366f1, #8b5cf6)",
    sections: [
      {
        title: "Planning",
        tasks: [
          {
            text: "Define project goals and scope",
            labels: ["priority"],
            subtasks: [
              { text: "List key objectives" },
              { text: "Set project timeline" },
              { text: "Identify stakeholders" },
            ],
          },
          {
            text: "Research & gather requirements",
            labels: ["research"],
          },
          {
            text: "Create project roadmap",
          },
        ],
      },
      {
        title: "In Progress",
        tasks: [
          {
            text: "Set up development environment",
            labels: ["setup"],
            subtasks: [
              { text: "Install required tools" },
              { text: "Configure project settings" },
            ],
          },
          {
            text: "Build initial prototype",
          },
        ],
      },
      {
        title: "Review",
        tasks: [
          {
            text: "Code review & testing",
            labels: ["review"],
          },
          {
            text: "Prepare launch checklist",
            subtasks: [
              { text: "Verify all features" },
              { text: "Write documentation" },
            ],
          },
        ],
      },
    ],
  },

  {
    id:          "weekly-planner",
    name:        "Weekly Planner",
    emoji:       "📅",
    description: "Plan your week with daily sections to stay on track",
    gradient:    "linear-gradient(135deg, #f59e0b, #ef4444)",
    sections: [
      {
        title: "Mon – Wed",
        tasks: [
          {
            text: "Review weekly priorities",
            labels: ["important"],
          },
          {
            text: "Team standup notes",
            subtasks: [
              { text: "Blockers" },
              { text: "Progress update" },
            ],
          },
          {
            text: "Deep work session",
          },
        ],
      },
      {
        title: "Thu – Fri",
        tasks: [
          {
            text: "Follow up on pending items",
            labels: ["follow-up"],
          },
          {
            text: "Wrap up deliverables",
            subtasks: [
              { text: "Final review" },
              { text: "Send status report" },
            ],
          },
        ],
      },
      {
        title: "Weekend",
        tasks: [
          {
            text: "Reflect on the week",
          },
          {
            text: "Plan ahead for next week",
            labels: ["planning"],
          },
        ],
      },
    ],
  },

  {
    id:          "study-tracker",
    name:        "Study Tracker",
    emoji:       "📚",
    description: "Track your study progress across subjects & topics",
    gradient:    "linear-gradient(135deg, #10b981, #06b6d4)",
    sections: [
      {
        title: "To Study",
        tasks: [
          {
            text: "Read Chapter 1 – Fundamentals",
            labels: ["reading"],
            subtasks: [
              { text: "Take key notes" },
              { text: "Summarize concepts" },
            ],
          },
          {
            text: "Watch lecture videos",
            labels: ["video"],
          },
          {
            text: "Practice problem set #1",
          },
        ],
      },
      {
        title: "In Progress",
        tasks: [
          {
            text: "Work on assignment draft",
            labels: ["assignment"],
            subtasks: [
              { text: "Research sources" },
              { text: "Write first draft" },
            ],
          },
          {
            text: "Revise past quizzes",
          },
        ],
      },
      {
        title: "Completed",
        tasks: [
          {
            text: "Intro module – done ✅",
          },
        ],
      },
    ],
  },

  {
    id:          "home-life",
    name:        "Home & Life",
    emoji:       "🏠",
    description: "Manage errands, home projects & self-care routines",
    gradient:    "linear-gradient(135deg, #ec4899, #a855f7)",
    sections: [
      {
        title: "Errands",
        tasks: [
          {
            text: "Grocery shopping",
            labels: ["shopping"],
            subtasks: [
              { text: "Fruits & vegetables" },
              { text: "Pantry staples" },
              { text: "Snacks" },
            ],
          },
          {
            text: "Pick up dry cleaning",
          },
          {
            text: "Schedule dentist appointment",
          },
        ],
      },
      {
        title: "Home Projects",
        tasks: [
          {
            text: "Organize the closet",
            labels: ["home"],
            subtasks: [
              { text: "Donate old clothes" },
              { text: "Buy storage boxes" },
            ],
          },
          {
            text: "Fix leaky kitchen faucet",
          },
        ],
      },
      {
        title: "Self Care",
        tasks: [
          {
            text: "Morning workout routine",
            labels: ["health"],
          },
          {
            text: "Read 20 pages before bed",
            labels: ["habit"],
          },
        ],
      },
    ],
  },
];
