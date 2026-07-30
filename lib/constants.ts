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

export const ATTENDANCE_SESSIONS = [
  { key: "day1_morning", label: "Day 1 AM" },
  { key: "day1_afternoon", label: "Day 1 PM" },
  { key: "day2_morning", label: "Day 2 AM" },
  { key: "day2_afternoon", label: "Day 2 PM" },
] as const;

export type AttendanceSession = (typeof ATTENDANCE_SESSIONS)[number]["key"];

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

export type ScheduleItem = { time: string; title: string; detail?: string };

export const EVENT_SCHEDULE: { day: string; items: ScheduleItem[] }[] = [
  {
    day: EVENT.day1,
    items: [
      { time: "8:00 – 9:00 AM", title: "Registration" },
      { time: "10:00 AM", title: "Intro session" },
      { time: "11:30 AM – 1:00 PM", title: "Hacking begins" },
      { time: "1:00 – 2:00 PM", title: "Lunch" },
      { time: "2:00 – 5:00 PM", title: "Hacking continues" },
      {
        time: "After 5:00 PM",
        title: "Head home / hostel",
        detail: "Keep building — a Google Form link is shared for your GitHub repo and demo video.",
      },
      {
        time: "10:00 PM",
        title: "Submission deadline",
        detail: "Shortlisted teams are notified after review.",
      },
    ],
  },
  {
    day: EVENT.day2,
    items: [
      { time: "8:00 AM", title: "Reporting" },
      { time: "8:00 – 11:00 AM", title: "Hacking continues" },
      { time: "11:00 AM", title: "Final evaluation starts" },
      { time: "1:00 – 2:00 PM", title: "Lunch" },
      { time: "2:00 – 4:00 PM", title: "Evaluation" },
      { time: "4:00 PM", title: "Closing ceremony" },
    ],
  },
];
