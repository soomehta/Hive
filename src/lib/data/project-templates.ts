export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  defaultTasks: Array<{
    title: string;
    description: string;
    status: "todo" | "in_progress" | "done";
    priority: "low" | "medium" | "high" | "urgent";
    order: number;
  }>;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "blank",
    name: "Blank Project",
    description: "Start from scratch with an empty project.",
    icon: "📋",
    defaultTasks: [],
  },
  {
    id: "sprint",
    name: "Sprint (2-week)",
    description: "A standard two-week development sprint with common tasks.",
    icon: "🏃",
    defaultTasks: [
      { title: "Sprint Planning", description: "Define sprint goals and assign stories", status: "todo", priority: "high", order: 0 },
      { title: "Design Review", description: "Review designs for sprint deliverables", status: "todo", priority: "medium", order: 1 },
      { title: "Development", description: "Implement sprint stories", status: "todo", priority: "high", order: 2 },
      { title: "Code Review", description: "Review and approve pull requests", status: "todo", priority: "medium", order: 3 },
      { title: "QA Testing", description: "Test completed features", status: "todo", priority: "high", order: 4 },
      { title: "Sprint Retrospective", description: "Review what went well and what to improve", status: "todo", priority: "medium", order: 5 },
    ],
  },
  {
    id: "marketing",
    name: "Marketing Campaign",
    description: "Plan and execute a marketing campaign from ideation to launch.",
    icon: "📢",
    defaultTasks: [
      { title: "Define Campaign Goals", description: "Set KPIs and target audience", status: "todo", priority: "high", order: 0 },
      { title: "Create Content Brief", description: "Outline key messages and content needs", status: "todo", priority: "high", order: 1 },
      { title: "Design Assets", description: "Create visual assets for the campaign", status: "todo", priority: "medium", order: 2 },
      { title: "Write Copy", description: "Draft campaign copy for all channels", status: "todo", priority: "medium", order: 3 },
      { title: "Schedule Distribution", description: "Plan content distribution across channels", status: "todo", priority: "medium", order: 4 },
      { title: "Launch & Monitor", description: "Launch campaign and track metrics", status: "todo", priority: "high", order: 5 },
    ],
  },
  {
    id: "product-launch",
    name: "Product Launch",
    description: "Coordinate a product launch across engineering, marketing, and sales.",
    icon: "🚀",
    defaultTasks: [
      { title: "Feature Freeze", description: "Lock down features for launch", status: "todo", priority: "urgent", order: 0 },
      { title: "QA Sign-off", description: "Complete QA testing and get sign-off", status: "todo", priority: "urgent", order: 1 },
      { title: "Prepare Launch Comms", description: "Draft announcements, blog posts, and emails", status: "todo", priority: "high", order: 2 },
      { title: "Update Documentation", description: "Ensure docs reflect new features", status: "todo", priority: "high", order: 3 },
      { title: "Sales Enablement", description: "Brief sales team on new features", status: "todo", priority: "medium", order: 4 },
      { title: "Launch Day Checklist", description: "Execute launch day tasks", status: "todo", priority: "urgent", order: 5 },
      { title: "Post-Launch Review", description: "Review metrics and gather feedback", status: "todo", priority: "medium", order: 6 },
    ],
  },
  {
    id: "bug-triage",
    name: "Bug Triage",
    description: "Systematic bug triage and resolution workflow.",
    icon: "🐛",
    defaultTasks: [
      { title: "Collect Bug Reports", description: "Gather bug reports from support and monitoring", status: "todo", priority: "high", order: 0 },
      { title: "Categorize & Prioritize", description: "Classify bugs by severity and impact", status: "todo", priority: "high", order: 1 },
      { title: "Reproduce Issues", description: "Verify and reproduce reported bugs", status: "todo", priority: "medium", order: 2 },
      { title: "Fix Critical Bugs", description: "Address P0/P1 bugs first", status: "todo", priority: "urgent", order: 3 },
      { title: "Regression Testing", description: "Verify fixes don't break existing features", status: "todo", priority: "high", order: 4 },
    ],
  },
];

export function getTemplate(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === id);
}
