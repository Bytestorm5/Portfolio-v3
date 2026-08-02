export type Tint = "att" | "njit" | "cdx" | "personal";

export type Role = {
  org: string;
  title: string;
  team?: string;
  start: string;
  end: string;
  /** ISO dates drive the <time> elements; the display strings drive the label. */
  startISO: string;
  endISO?: string;
  tint: Tint;
  icon?: string;
  points: string[];
};

export const experience: Role[] = [
  {
    org: "AT&T",
    title: "Sr. Specialist, Member of Technical Staff",
    team: "Artemis Network Planning",
    start: "May 2025",
    end: "Present",
    startISO: "2025-05",
    tint: "att",
    icon: "/icons/att.svg",
    points: [
      "Build algorithms that search for cost-effective L2/L3 network topologies subject to hard engineering and latency constraints.",
      "Finalized plans now cover regions servicing 12.4M people, with $60M in confirmed cost savings to date.",
      "Work directly with network operations at several levels to pin down real requirements and anticipate failure modes before they reach the plan.",
    ],
  },
  {
    org: "AT&T",
    title: "Data Analyst",
    team: "IPSEA — Technical Development Program",
    start: "Jun 2024",
    end: "May 2025",
    startISO: "2024-06",
    endISO: "2025-05",
    tint: "att",
    icon: "/icons/att.svg",
    points: [
      "Developed an IP reallocation algorithm with $9M in theoretical savings, freeing over 300K addresses.",
      "Refactored the team's data pipelines for better parallelization and use of provisioned compute.",
      "Built anomaly detection over backbone DNS server metrics to catch cyberattacks and infrastructure failures, and laid the foundation for the frontend team's dashboard.",
    ],
  },
  {
    org: "NJIT",
    title: "Grader",
    team: "CS 370 — Intro to AI / Data Mining",
    start: "Jan 2023",
    end: "May 2024",
    startISO: "2023-01",
    endISO: "2024-05",
    tint: "njit",
    icon: "/icons/njit.png",
    points: [
      "Graded assignments for a senior-level data mining course — 228 students across 3 semesters.",
      "Worked with a team of graders and the professor to keep standards consistent.",
      "Took an active role in helping students learn from mistakes and build real intuition for AI/ML concepts.",
    ],
  },
  {
    org: "CDx Diagnostics",
    title: "Intern",
    team: "Cancer Cell Classification",
    start: "Sep 2022",
    end: "Jan 2023",
    startISO: "2022-09",
    endISO: "2023-01",
    tint: "cdx",
    icon: "/icons/cdx.png",
    points: [
      "Differentiated cancerous cells from debris in dyed microscope slides, owning collection, annotation, training, and testing.",
      "Reached 89% detection accuracy on a limited dataset by fine-tuning a ResNet-50.",
      "Set up documentation for every deliverable at the end of the internship.",
    ],
  },
];
