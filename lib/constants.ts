export const ALLOWED_EMAIL_DOMAIN = "@vitstudent.ac.in";

export const MAX_TEAM_SIZE = 4;

// Submissions stay locked until you flip this to true (and redeploy).
export const SUBMISSIONS_OPEN = true;

export const TRACKS = [
  "LLM Fine-Tuning",
  "Agentic Systems",
  "Automation",
  "Dev Productivity",
  "AI Safety & Observability",
] as const;

export type Track = (typeof TRACKS)[number];

export const EVENT = {
  name: "FRONTIER",
  tagline: "Build the next AI",
  dates: "July 30 & 31",
  venue: "Netaji Auditorium",
  venueDetail: "AB-1 · VIT Chennai",
  prize: "₹15,000",
  day1: "Day 1 · July 30 · 8AM–5PM",
  day1Detail: "Research, Ideation & Build",
  day2: "Day 2 · July 31 · Morning",
  day2Detail: "Final Demos, Evaluation & Awards",
  instagram: "@awsvitc",
  website: "awscloudclubvit.in",
  facultyCoordinators: "Dr. K. Kumaran, Dr. G. Saranya",
  studentCoordinator: "Tarun Vaibhav V",
  studentCoordinatorPhone: "6369046779",
};
