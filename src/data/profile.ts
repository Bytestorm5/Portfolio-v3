export const profile = {
  name: "Kamil Arif",
  role: "Data Scientist / ML Engineer",
  location: "New Jersey, USA",
  /* Rotator phrases, carried over from the v2 hero. */
  taglines: [
    "an End-to-End CV pipeline?",
    "an Agentic LLM integration?",
    "custom ML architectures?",
    "network topology optimization?",
  ],
  summary:
    "Data Scientist at AT&T building optimization and anomaly-detection systems for " +
    "a national network. I work where applied ML meets hard operational constraints — " +
    "algorithms that have to survive contact with real infrastructure, real budgets, " +
    "and real engineering agreements.",
  links: {
    email: "kamil.m.arif@gmail.com",
    phone: "(732) 963-5445",
    github: "https://github.com/Bytestorm5",
    githubUser: "Bytestorm5",
    linkedin: "https://www.linkedin.com/in/kamil-arif",
    blog: "https://kamilarif.substack.com/",
    site: "https://kamilarif.com/",
  },
} as const;

export const education = {
  degree: "BS in Data Science",
  school: "New Jersey Institute of Technology",
  graduated: "December 2024",
  honors: "Albert Dorman Honors College",
  gpa: "3.8 / 4.0",
} as const;

/**
 * Headline numbers from the resume. These lead the page because they are the
 * fastest signal an employer can read.
 */
export const impact = [
  {
    value: "$60M",
    label: "Confirmed network cost savings",
    detail: "L2/L3 topology optimization at AT&T, to date",
  },
  {
    value: "12.4M",
    label: "People served by finalized plans",
    detail: "Regions with completed network plans",
  },
  {
    value: "$9M",
    label: "Estimated IP reallocation value",
    detail: "Freed over 300K IP addresses",
  },
  {
    value: "228",
    label: "Students graded",
    detail: "Across 3 semesters of senior-level data mining",
  },
] as const;

export const skills = [
  {
    group: "Languages",
    items: ["Python", "TypeScript", "C#", "Java", "HTML5/CSS"],
  },
  {
    group: "Data & Storage",
    items: ["SQL", "MongoDB/MQL", "Snowflake", "Databricks"],
  },
  {
    group: "Libraries",
    items: ["PyTorch", "Keras", "PySpark", "Snowpark", "React/Next", "Flask"],
  },
  {
    group: "Tools",
    items: ["AWS", "DigitalOcean", "Docker", "CVAT", "ClearML", "GitHub"],
  },
] as const;

export const awards = [
  "SIG Frontline Leader — NJIT ACM (2023–24)",
  "Eagle Scout — Troop 571, Monmouth Council",
  "Congressional Gold Medal recipient",
] as const;
